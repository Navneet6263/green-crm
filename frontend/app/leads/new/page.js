"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import {
  canManageScopedAssignments, filterRecordsByTeam, formatScopedError,
  getTeamAssignmentState, isPlatformConsoleRole, loadProductsForScope,
  loadTeamScopeResources, resolveScopedCompanyId, scopedOwnersHelperText,
  scopedProductsEmptyMessage, scopedProductsHelperText, scopedUsersEmptyMessage,
  shouldShowTeamSelector, teamSelectLabel, teamSelectionRequiredMessage,
} from "../../../lib/teamScope";
import { AlertError, AlertSuccess } from "../../../components/ui/Alert";

const ALLOWED_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales", "marketing"];
const DRAFT_KEY = "greencrm:new-lead-draft";
const IST_MS = 330 * 60000;
const INDUSTRIES = [["technology", "Technology"], ["healthcare", "Healthcare"], ["finance", "Finance"], ["education", "Education"], ["manufacturing", "Manufacturing"], ["retail", "Retail"], ["real-estate", "Real Estate"], ["staffing", "Staffing"], ["services", "Professional Services"], ["other", "Other"]];
const SOURCES = [["website", "Website"], ["google", "Google"], ["facebook", "Facebook"], ["instagram", "Instagram"], ["linkedin", "LinkedIn"], ["referral", "Referral"], ["cold-call", "Cold Call"], ["email-campaign", "Email Campaign"], ["partner", "Partner"], ["trade-show", "Trade Show"], ["walk-in", "Walk-in"], ["other", "Other"]];
const PRIORITIES = [["low", "Low", "bg-slate-400"], ["medium", "Medium", "bg-sky-500"], ["high", "High", "bg-amber-500"]];
const PAYMENT_MODES = [["upi", "UPI"], ["bank-transfer", "Bank transfer"], ["cheque", "Cheque"], ["cash", "Cash"], ["card", "Card"]];
const VALUE_CHIPS = [25000, 50000, 100000, 500000];
const FIELD = "h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-50 disabled:bg-slate-50 disabled:text-slate-400";
const CHIP = (on) => `rounded-full px-2.5 py-1 text-[12px] font-semibold transition ${on ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;

const blank = (companyId = "") => ({
  company_id: companyId, team_id: "", product_id: "", contact_person: "", company_name: "", email: "", phone: "", industry: "", lead_source: "website", custom_lead_source: "",
  follow_date: "", follow_time: "11:00", estimated_value: "", number_of_units: "", no_of_employees: "", active_users: "", priority: "medium", requirements: "", assigned_to: "",
  address_street: "", address_city: "", address_state: "", address_zip: "", address_country: "India", advance_received: "", payment_mode: "", payment_date: "", next_payment_date: "", first_note: "",
});
const dayKey = (offset = 0) => new Date(Date.now() + IST_MS + offset * 86400000).toISOString().slice(0, 10);
const rupees = (value) => {
  const n = Number(value || 0);
  if (!n) return "";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2).replace(/\.?0+$/, "")} crore`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2).replace(/\.?0+$/, "")} lakh`;
  return `₹${n.toLocaleString("en-IN")}`;
};
const digits = (value) => String(value || "").replace(/\D/g, "");

/** Picks phone, email and a likely name out of pasted text, like an enquiry message. */
function readPasted(text) {
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] || "";
  const phone = text.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/)?.[0]?.replace(/[\s-]/g, "") || "";
  const labelled = (names) => text.match(new RegExp(`(?:${names})\\s*[:\\-]\\s*([^\\n,]+)`, "i"))?.[1]?.trim() || "";
  return {
    email,
    phone,
    contact_person: labelled("name|contact person|contact|sender"),
    company_name: labelled("company|company name|firm|organi[sz]ation|business"),
    address_city: labelled("city|location"),
    requirements: labelled("requirement|requirements|message|enquiry|inquiry|looking for"),
  };
}

function Field({ label, required, error, hint, id, span, children }) {
  return (
    <div id={id ? `field-${id}` : undefined} className={span || ""}>
      <label htmlFor={id} className="mb-1 block text-[12.5px] font-semibold text-slate-700">{label}{required ? <span className="text-rose-500"> *</span> : null}</label>
      {children}
      {error ? <p role="alert" className="mt-1 text-[12px] font-medium text-rose-600">{error}</p> : hint ? <p className="mt-1 text-[12px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Section({ title, sub, children, action }) {
  return (
    <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
          {sub ? <p className="text-[12.5px] text-slate-500">{sub}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function NewLeadPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [teams, setTeams] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [more, setMore] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [matches, setMatches] = useState([]);
  const [restored, setRestored] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const draftReady = useRef(false);

  const role = session?.user?.role || "";
  const canAssign = canManageScopedAssignments(role);
  const isPlatformConsole = isPlatformConsoleRole(role);
  const isSuperAdmin = role === "super-admin";
  const companyId = resolveScopedCompanyId(session, form.company_id);
  const teamAssignment = useMemo(() => getTeamAssignmentState(teams, form.team_id, "lead"), [form.team_id, teams]);
  const selectedTeam = teamAssignment.selectedTeam;
  const teamVisible = shouldShowTeamSelector(role, teams);
  const teamPending = teamVisible && !form.team_id;
  const scopedProducts = useMemo(() => (teamPending ? [] : filterRecordsByTeam(products, form.team_id)), [products, form.team_id, teamPending]);
  const selectedProduct = products.find((p) => p.product_id === form.product_id) || null;
  const owner = users.find((u) => u.user_id === form.assigned_to);
  const canOpenTeams = ["super-admin", "platform-admin", "platform-manager", "admin", "manager"].includes(role);

  const productPicks = useMemo(() => {
    const recent = history.map((item) => scopedProducts.find((p) => p.product_id === item.product_id)).filter(Boolean);
    const list = [...recent, ...scopedProducts.filter((p) => !recent.includes(p))];
    return list.slice(0, 6);
  }, [history, scopedProducts]);
  const ownerHint = !canAssign || resourceLoading ? "" : teamPending ? "Choose a team to see owners." : !users.length ? scopedUsersEmptyMessage(selectedTeam) : selectedTeam ? scopedOwnersHelperText(selectedTeam) : "";
  const productHint = resourceLoading ? "" : teamPending ? "Choose a team to see products." : !scopedProducts.length ? scopedProductsEmptyMessage(selectedTeam) : selectedTeam ? scopedProductsHelperText(selectedTeam) : "";

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    // Phone or email is enough, so filling either one clears the message on both.
    setErrors((e) => (["phone", "email"].includes(field) ? { ...e, phone: "", email: "" } : e[field] ? { ...e, [field]: "" } : e));
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      const s = loadSession();
      if (!s) { router.replace("/login"); return; }
      if (!ALLOWED_ROLES.includes(s.user?.role)) { router.replace("/dashboard"); return; }
      setSession(s);
      try {
        let initial;
        if (isPlatformConsoleRole(s.user?.role)) {
          const r = await apiRequest("/companies?page_size=50", { token: s.token });
          if (ignore) return;
          setCompanies(r.items || []);
          initial = blank(r.items?.[0]?.company_id || "");
        } else {
          setCompanies(s.company ? [{ company_id: s.company.company_id || s.user?.company_id, name: s.company.name }] : []);
          initial = blank(s.user?.company_id || s.company?.company_id || "");
        }
        let draft = null;
        try { draft = JSON.parse(window.localStorage.getItem(`${DRAFT_KEY}:${s.user?.user_id}`) || "null"); } catch (_error) { /* storage unavailable */ }
        if (draft && (draft.company_name || draft.contact_person || draft.phone)) { setForm({ ...initial, ...draft, company_id: initial.company_id }); setRestored(true); } else setForm(initial);
        draftReady.current = true;
      } catch (e) {
        if (!ignore) setError(e.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [router]);

  // Keep the half-filled form, so a refresh or a phone call does not lose it.
  useEffect(() => {
    if (!draftReady.current || !session?.user?.user_id) return undefined;
    const timer = setTimeout(() => {
      try { window.localStorage.setItem(`${DRAFT_KEY}:${session.user.user_id}`, JSON.stringify(form)); } catch (_error) { /* ignore */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [form, session?.user?.user_id]);
  const clearDraft = () => { try { window.localStorage.removeItem(`${DRAFT_KEY}:${session?.user?.user_id}`); } catch (_error) { /* ignore */ } };

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!session) return;
      if (isPlatformConsole && !form.company_id) { setTeams([]); setProducts([]); setUsers([]); setHistory([]); return; }
      setResourceLoading(true);
      setError("");
      try {
        const [scope, prods, hist] = await Promise.all([
          loadTeamScopeResources(session.token, { companyId, teamId: form.team_id, includeUsers: canAssign && !teamPending, userPageSize: 80 }),
          !teamPending ? loadProductsForScope(session.token, { companyId: isPlatformConsole ? companyId : undefined, teamId: form.team_id, pageSize: 50 }) : Promise.resolve([]),
          !isSuperAdmin ? apiRequest("/leads/user/product-history", { token: session.token }) : Promise.resolve([]),
        ]);
        if (ignore) return;
        const nextUsers = scope.users || [];
        const nextTeam = scope.teamId || "";
        const inScope = filterRecordsByTeam(prods || [], nextTeam);
        setTeams(scope.teams || []);
        setProducts(prods || []);
        setUsers(nextUsers);
        setHistory(!isSuperAdmin ? (Array.isArray(hist) ? hist : hist?.items || []) : []);
        setForm((f) => ({
          ...f,
          team_id: nextTeam,
          product_id: inScope.some((p) => p.product_id === f.product_id) ? f.product_id : inScope.length === 1 ? inScope[0].product_id : "",
          assigned_to: nextUsers.some((u) => u.user_id === f.assigned_to) ? f.assigned_to : "",
        }));
      } catch (e) {
        if (!ignore) setError(formatScopedError(e, "The form could not load its options."));
      } finally {
        if (!ignore) setResourceLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [canAssign, companyId, form.company_id, form.team_id, isPlatformConsole, isSuperAdmin, session, teamPending]);

  // Look for this person among the leads the user can see, as they type.
  useEffect(() => {
    const phone = digits(form.phone);
    const email = form.email.trim().toLowerCase();
    const company = form.company_name.trim();
    const term = phone.length >= 7 ? phone : /\S+@\S+\.\S+/.test(email) ? email : company.length >= 4 ? company : "";
    if (!session?.token || !term) { setMatches([]); return undefined; }
    let cancelled = false;
    const timer = setTimeout(() => {
      apiRequest(`/leads?search=${encodeURIComponent(term)}&page_size=4&include_workflow_summary=0`, { token: session.token, fresh: true })
        .then((res) => { if (!cancelled) setMatches(res.items || []); })
        .catch(() => { if (!cancelled) setMatches([]); });
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [form.phone, form.email, form.company_name, session?.token]);
  const samePhone = matches.find((lead) => digits(form.phone).length >= 7 && digits(lead.phone).endsWith(digits(form.phone).slice(-10)));

  function validate() {
    const e = {};
    if (isPlatformConsole && !form.company_id) e.company_id = "Choose a company.";
    if (teamVisible && !form.team_id) e.team_id = teamSelectionRequiredMessage("lead");
    if (!form.company_name.trim()) e.company_name = "Enter the company name.";
    if (!form.contact_person.trim()) e.contact_person = "Enter the contact person's name.";
    if (!form.phone.trim() && !form.email.trim()) e.phone = "Enter a phone number or an email.";
    if (form.phone.trim() && (digits(form.phone).length < 7 || digits(form.phone).length > 15)) e.phone = "Phone must have 7 to 15 digits.";
    if (form.email.trim() && !/\S+@\S+\.\S+/.test(form.email)) e.email = "This email looks wrong.";
    if (!form.product_id) e.product_id = "Choose a product.";
    if (form.lead_source === "other" && !form.custom_lead_source.trim()) e.custom_lead_source = "Write where this lead came from.";
    if (form.number_of_units !== "" && (!Number.isInteger(Number(form.number_of_units)) || Number(form.number_of_units) < 0)) { e.number_of_units = "Use a whole number."; setMore(true); }
    if (isPlatformConsole && !form.assigned_to) e.assigned_to = "Choose an owner in this company.";
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) setTimeout(() => { document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); document.getElementById(first)?.focus({ preventScroll: true }); }, 50);
    return !first;
  }

  function payload() {
    const followUp = form.follow_date ? new Date(`${form.follow_date}T${form.follow_time || "11:00"}:00+05:30`).toISOString() : null;
    return {
      company_id: isPlatformConsole ? form.company_id : undefined,
      team_id: form.team_id || undefined,
      product_id: form.product_id,
      contact_person: form.contact_person.trim(),
      company_name: form.company_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      industry: form.industry || null,
      lead_source: form.lead_source === "other" ? form.custom_lead_source.trim() : form.lead_source,
      follow_up_date: followUp,
      estimated_value: Number(form.estimated_value || 0),
      number_of_units: form.number_of_units === "" ? null : Number(form.number_of_units),
      no_of_employees: form.no_of_employees.trim() || null,
      active_users: form.active_users === "" ? null : Number(form.active_users),
      priority: form.priority,
      requirements: form.requirements.trim() || null,
      assigned_to: form.assigned_to || undefined,
      address_street: form.address_street.trim() || null,
      address_city: form.address_city.trim() || null,
      address_state: form.address_state.trim() || null,
      address_zip: form.address_zip.trim() || null,
      address_country: form.address_country.trim() || "India",
      advance_received: form.advance_received === "" ? 0 : Number(form.advance_received),
      payment_mode: form.payment_mode || null,
      payment_date: form.payment_date || null,
      next_payment_date: form.next_payment_date || null,
    };
  }

  async function submit(addAnother) {
    if (saving || resourceLoading || !validate()) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const created = await apiRequest("/leads", { method: "POST", token: session.token, body: payload() });
      if (form.first_note.trim() && created?.lead_id) {
        await apiRequest(`/leads/${created.lead_id}/notes`, { method: "POST", token: session.token, body: { content: form.first_note.trim() } }).catch(() => {});
      }
      clearDraft();
      if (addAnother) {
        setLastSaved({ id: created?.lead_id, name: form.company_name.trim() });
        setForm((f) => ({ ...blank(f.company_id), team_id: f.team_id, product_id: f.product_id, lead_source: f.lead_source, custom_lead_source: f.custom_lead_source, assigned_to: f.assigned_to }));
        setMatches([]);
        setRestored(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => document.getElementById("company_name")?.focus(), 300);
      } else {
        router.push(created?.lead_id ? `/leads/${created.lead_id}` : "/leads");
      }
    } catch (err) {
      setError(formatScopedError(err, "The lead could not be created."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  function applyPaste() {
    const found = readPasted(pasted);
    const filled = Object.entries(found).filter(([, value]) => value);
    if (!filled.length) { setNotice(""); setError("No phone, email or name was found in that text."); return; }
    setError("");
    setForm((f) => {
      const next = { ...f };
      filled.forEach(([key, value]) => { if (!next[key]) next[key] = value; });
      return next;
    });
    setErrors({});
    setPasted("");
    setPasteOpen(false);
    setNotice(`Filled ${filled.length} field${filled.length === 1 ? "" : "s"} from your text. Please check them.`);
  }

  const filled = [form.company_name, form.contact_person, form.phone || form.email, form.product_id].filter((v) => String(v || "").trim()).length;
  const required = 4;
  const value = Number(form.estimated_value || 0);
  const advance = Number(form.advance_received || 0);
  const followChips = [[dayKey(0), "Today"], [dayKey(1), "Tomorrow"], [dayKey(2), "In 2 days"], [dayKey(7), "In a week"]];
  const moreCount = [form.industry, form.no_of_employees, form.number_of_units, form.active_users, form.address_street, form.address_city, form.address_state, form.address_zip, form.advance_received, form.payment_mode, form.payment_date, form.next_payment_date].filter(Boolean).length;

  return (
    <DashboardShell session={session} title="Create lead" hideTitle heroStats={[]}>
      <div className="tw-buttons min-w-0 space-y-3 pb-24">
        <AlertError message={error} onDismiss={() => setError("")} />
        {!error ? <AlertSuccess message={notice} onDismiss={() => setNotice("")} /> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            <Link href="/leads" aria-label="Back to leads" title="Back to leads" className="grid h-9 w-9 place-items-center rounded-[10px] bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
            </Link>
            <div>
              <h1 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900">Create lead</h1>
              <p className="text-[13px] text-slate-500">Only the fields marked * are needed. Add the rest whenever you have it.</p>
            </div>
          </div>
          <button type="button" onClick={() => setPasteOpen((o) => !o)} aria-expanded={pasteOpen} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" /></svg>
            Paste an enquiry
          </button>
        </div>

        {restored ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-gold-50 px-4 py-2.5 text-[13px] text-gold-900 ring-1 ring-gold-200">
            <span>We kept the lead you were filling earlier.</span>
            <button type="button" className="font-semibold underline" onClick={() => { clearDraft(); setForm((f) => ({ ...blank(f.company_id), team_id: f.team_id })); setRestored(false); }}>Start fresh</button>
          </div>
        ) : null}
        {lastSaved ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-900 ring-1 ring-emerald-200">
            <span>{lastSaved.name} saved. Add the next lead.</span>
            {lastSaved.id ? <Link href={`/leads/${lastSaved.id}`} prefetch={false} className="font-semibold underline">Open it</Link> : null}
          </div>
        ) : null}
        {pasteOpen ? (
          <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
            <label htmlFor="paste-enquiry" className="text-[13px] font-semibold text-slate-800">Paste a WhatsApp message, email or IndiaMART enquiry</label>
            <textarea id="paste-enquiry" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={4} placeholder={"Name: Rajesh Kapoor\nCompany: Kapoor Steels\n9810012345, rajesh@kapoor.in"} className="mt-1.5 w-full resize-y rounded-[10px] border border-slate-200 p-2.5 text-[13.5px] outline-none focus:border-brand-400" />
            <button type="button" disabled={!pasted.trim()} onClick={applyPaste} className="mt-2 h-9 rounded-[10px] bg-slate-900 px-3.5 text-[13px] font-semibold text-white hover:bg-slate-700 disabled:opacity-40">Fill the form</button>
          </section>
        ) : null}

        {loading ? <div className="h-64 animate-pulse rounded-[14px] bg-white ring-1 ring-slate-200" /> : (
          <form className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_310px]" noValidate
            onSubmit={(e) => { e.preventDefault(); submit(false); }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(false); } }}>
            <div className="min-w-0 space-y-3">
              <Section title="Who is this lead?">
                <div className="grid gap-3 sm:grid-cols-2">
                  {isPlatformConsole ? (
                    <Field label="Company workspace" required id="company_id" error={errors.company_id} span="sm:col-span-2">
                      <select id="company_id" className={FIELD} value={form.company_id} onChange={(e) => set("company_id", e.target.value)}>
                        <option value="">Choose a company</option>
                        {companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}
                      </select>
                    </Field>
                  ) : null}
                  <Field label="Company" required id="company_name" error={errors.company_name}>
                    <input id="company_name" autoFocus className={FIELD} value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="Kapoor Steels" autoComplete="off" />
                  </Field>
                  <Field label="Contact person" required id="contact_person" error={errors.contact_person}>
                    <input id="contact_person" className={FIELD} value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} placeholder="Rajesh Kapoor" autoComplete="off" />
                  </Field>
                  <Field label="Phone" id="phone" error={errors.phone} hint={samePhone ? "" : "Phone or email is required."}>
                    <input id="phone" inputMode="tel" className={FIELD} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="98100 12345" autoComplete="off" />
                  </Field>
                  <Field label="Email" id="email" error={errors.email}>
                    <input id="email" type="email" className={FIELD} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="rajesh@kapoorsteels.in" autoComplete="off" />
                  </Field>
                </div>
                {matches.length ? (
                  <div className={`mt-3 rounded-[10px] p-3 ring-1 ${samePhone ? "bg-amber-50 ring-amber-200" : "bg-slate-50 ring-slate-200"}`}>
                    <p className={`text-[12.5px] font-semibold ${samePhone ? "text-amber-900" : "text-slate-600"}`}>{samePhone ? "This phone number is already a lead" : "Similar leads you can see"}</p>
                    <ul className="mt-1.5 space-y-1">
                      {matches.slice(0, 3).map((lead) => (
                        <li key={lead.lead_id} className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                          <span className="min-w-0 truncate text-slate-700"><b className="font-semibold text-slate-900">{lead.company_name || lead.contact_person}</b> · {lead.phone || lead.email} · {lead.assigned_to_name || "Unassigned"}</span>
                          <a href={`/leads/${lead.lead_id}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:underline">Open</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Section>

              <Section title="What are they interested in?">
                <div className="space-y-3">
                  {teamVisible ? (
                    <Field label="Team" required id="team_id" error={errors.team_id} hint={teamAssignment.description}>
                      <select id="team_id" className={FIELD} value={form.team_id} onChange={(e) => set("team_id", e.target.value)}>
                        <option value="">Choose a team</option>
                        {teams.map((t) => <option key={t.team_id} value={t.team_id}>{teamSelectLabel(t)}</option>)}
                      </select>
                    </Field>
                  ) : null}
                  <Field label="Product" required id="product_id" error={errors.product_id} hint={productHint}>
                    {productPicks.length && productPicks.length <= 6 && scopedProducts.length <= 6 ? (
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {productPicks.map((p) => (
                          <button key={p.product_id} type="button" onClick={() => set("product_id", p.product_id)} aria-pressed={form.product_id === p.product_id}
                            className={`flex items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[13px] font-semibold ring-1 transition ${form.product_id === p.product_id ? "bg-brand-50 text-brand-900 ring-2 ring-brand-500" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"}`}>
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color || "#157672" }} /><span className="truncate">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <select id="product_id" className={FIELD} value={form.product_id} onChange={(e) => set("product_id", e.target.value)} disabled={resourceLoading || teamPending}>
                        <option value="">Choose a product</option>
                        {scopedProducts.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
                      </select>
                    )}
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Lead value" id="estimated_value" hint={rupees(value)}>
                      <input id="estimated_value" type="number" min={0} className={FIELD} value={form.estimated_value} onChange={(e) => set("estimated_value", e.target.value)} placeholder="50000" />
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {VALUE_CHIPS.map((n) => <button key={n} type="button" onClick={() => set("estimated_value", String(n))} className={CHIP(value === n)}>{rupees(n).replace(".00", "").replace("₹1 lakh", "₹1 lakh")}</button>)}
                      </div>
                    </Field>
                    <Field label="Priority">
                      <div className="grid grid-cols-3 gap-1 rounded-[10px] bg-slate-100 p-1">
                        {PRIORITIES.map(([key, name, dot]) => (
                          <button key={key} type="button" onClick={() => set("priority", key)} aria-pressed={form.priority === key}
                            className={`flex items-center justify-center gap-1 rounded-[8px] py-1.5 text-[12px] font-semibold ${form.priority === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                            <span className={`h-2 w-2 rounded-full ${dot}`} />{name}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                  <Field label="Requirement" id="requirements">
                    <textarea id="requirements" rows={2} className="w-full resize-y rounded-[10px] border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-50" value={form.requirements} onChange={(e) => set("requirements", e.target.value)} placeholder="What do they need? For example, CRM for 20 sales reps" />
                  </Field>
                </div>
              </Section>

              <Section title="Where did it come from, and what's next?">
                <div className="space-y-3">
                  <Field label="Source">
                    <div className="flex flex-wrap gap-1.5">
                      {SOURCES.map(([key, name]) => <button key={key} type="button" onClick={() => set("lead_source", key)} aria-pressed={form.lead_source === key} className={CHIP(form.lead_source === key)}>{name}</button>)}
                    </div>
                  </Field>
                  {form.lead_source === "other" ? (
                    <Field label="Which source?" required id="custom_lead_source" error={errors.custom_lead_source}>
                      <input id="custom_lead_source" className={FIELD} value={form.custom_lead_source} onChange={(e) => set("custom_lead_source", e.target.value)} placeholder="IndiaMART, JustDial…" />
                    </Field>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Next follow-up" hint={form.follow_date ? "Shows on the calendar." : "Optional. Set it so this lead is not forgotten."}>
                      <div className="flex flex-wrap gap-1">
                        {followChips.map(([key, name]) => <button key={name} type="button" onClick={() => set("follow_date", form.follow_date === key ? "" : key)} aria-pressed={form.follow_date === key} className={CHIP(form.follow_date === key)}>{name}</button>)}
                      </div>
                      <div className="mt-1.5 grid grid-cols-[1fr_128px] gap-1.5">
                        <input aria-label="Follow-up date" type="date" min={dayKey()} className={FIELD} value={form.follow_date} onChange={(e) => set("follow_date", e.target.value)} />
                        <input aria-label="Follow-up time" type="time" className={FIELD} value={form.follow_time} onChange={(e) => set("follow_time", e.target.value)} />
                      </div>
                    </Field>
                    {canAssign ? (
                      <Field label="Owner" required={isPlatformConsole} id="assigned_to" error={errors.assigned_to} hint={ownerHint}>
                        <select id="assigned_to" className={FIELD} value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)} disabled={resourceLoading || teamPending}>
                          <option value="">{isPlatformConsole ? "Choose an owner" : "Keep with me"}</option>
                          {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.name} · {String(u.role || "").replace(/-/g, " ")}</option>)}
                        </select>
                      </Field>
                    ) : null}
                  </div>
                  <Field label="First note" id="first_note">
                    <textarea id="first_note" rows={2} className="w-full resize-y rounded-[10px] border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-50" value={form.first_note} onChange={(e) => set("first_note", e.target.value)} placeholder="Anything you already know from this enquiry" />
                  </Field>
                </div>
              </Section>

              <section className="rounded-[14px] bg-white ring-1 ring-slate-200">
                <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5">
                  <span>
                    <span className="block text-[15px] font-bold text-slate-900">More details {moreCount ? <span className="ml-1 rounded-full bg-brand-50 px-1.5 text-[12px] font-semibold text-brand-800">{moreCount}</span> : null}</span>
                    <span className="block text-[12.5px] text-slate-500">Payment, company size and address</span>
                  </span>
                  <svg className={`h-5 w-5 text-slate-400 transition ${more ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                </button>
                {more ? (
                  <div className="space-y-4 border-t border-slate-100 p-4 sm:p-5">
                    <div>
                      <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-500">Payment</h3>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Field label="Advance received" id="advance_received" hint={value ? `Pending ${rupees(Math.max(0, value - advance)) || "₹0"}` : rupees(advance)}>
                          <input id="advance_received" type="number" min={0} className={FIELD} value={form.advance_received} onChange={(e) => set("advance_received", e.target.value)} placeholder="10000" />
                        </Field>
                        <Field label="Payment mode" id="payment_mode">
                          <select id="payment_mode" className={FIELD} value={form.payment_mode} onChange={(e) => set("payment_mode", e.target.value)}>
                            <option value="">Not set</option>
                            {PAYMENT_MODES.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                          </select>
                        </Field>
                        <Field label="Payment date" id="payment_date"><input id="payment_date" type="date" className={FIELD} value={form.payment_date} onChange={(e) => set("payment_date", e.target.value)} /></Field>
                        <Field label="Next payment" id="next_payment_date"><input id="next_payment_date" type="date" className={FIELD} value={form.next_payment_date} onChange={(e) => set("next_payment_date", e.target.value)} /></Field>
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-500">Company</h3>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Field label="Industry" id="industry">
                          <select id="industry" className={FIELD} value={form.industry} onChange={(e) => set("industry", e.target.value)}>
                            <option value="">Not set</option>
                            {INDUSTRIES.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                          </select>
                        </Field>
                        <Field label="Employees" id="no_of_employees"><input id="no_of_employees" className={FIELD} value={form.no_of_employees} onChange={(e) => set("no_of_employees", e.target.value)} placeholder="50-100" /></Field>
                        <Field label="Units" id="number_of_units" error={errors.number_of_units}><input id="number_of_units" type="number" min={0} step={1} className={FIELD} value={form.number_of_units} onChange={(e) => set("number_of_units", e.target.value)} placeholder="25" /></Field>
                        <Field label="Active users" id="active_users"><input id="active_users" type="number" min={0} step={1} className={FIELD} value={form.active_users} onChange={(e) => set("active_users", e.target.value)} placeholder="50" /></Field>
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-500">Address</h3>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Field label="Street" id="address_street" span="sm:col-span-2 xl:col-span-4"><input id="address_street" className={FIELD} value={form.address_street} onChange={(e) => set("address_street", e.target.value)} placeholder="Sector 62, Business Park" /></Field>
                        <Field label="City" id="address_city"><input id="address_city" className={FIELD} value={form.address_city} onChange={(e) => set("address_city", e.target.value)} placeholder="Noida" /></Field>
                        <Field label="State" id="address_state"><input id="address_state" className={FIELD} value={form.address_state} onChange={(e) => set("address_state", e.target.value)} placeholder="Uttar Pradesh" /></Field>
                        <Field label="Pincode" id="address_zip"><input id="address_zip" className={FIELD} value={form.address_zip} onChange={(e) => set("address_zip", e.target.value)} placeholder="201301" /></Field>
                        <Field label="Country" id="address_country"><input id="address_country" className={FIELD} value={form.address_country} onChange={(e) => set("address_country", e.target.value)} /></Field>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              {teamAssignment.mode === "none" && canOpenTeams ? <Link href="/settings/teams" className="text-[13px] font-semibold text-brand-700 hover:underline">Set up teams first</Link> : null}
            </div>

            <aside className="space-y-3 lg:sticky lg:top-[76px]">
              <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="font-semibold text-slate-700">Required details</span>
                  <span className={`font-bold tabular-nums ${filled === required ? "text-emerald-700" : "text-slate-500"}`}>{filled} of {required}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all ${filled === required ? "bg-emerald-500" : "bg-brand-600"}`} style={{ width: `${(filled / required) * 100}%` }} /></div>
                <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-brand-700 text-[14px] font-bold text-white">{(form.company_name || form.contact_person || "L").slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-slate-900">{form.company_name || "Company"}</p>
                    <p className="truncate text-[12.5px] text-slate-500">{[form.contact_person, form.phone || form.email].filter(Boolean).join(" · ") || "Contact details"}</p>
                  </div>
                </div>
                <dl className="mt-3 space-y-1.5 text-[12.5px]">
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Product</dt><dd className="truncate font-medium text-slate-800">{selectedProduct?.name || "–"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Owner</dt><dd className="truncate font-medium text-slate-800">{owner?.name || (isPlatformConsole ? "–" : "You")}</dd></div>
                  {selectedTeam ? <div className="flex justify-between gap-3"><dt className="text-slate-500">Team</dt><dd className="truncate font-medium text-slate-800">{selectedTeam.name}</dd></div> : null}
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Value</dt><dd className="font-medium text-slate-800">{rupees(value) || "–"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Follow-up</dt><dd className="font-medium text-slate-800">{form.follow_date ? `${new Date(`${form.follow_date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}, ${form.follow_time}` : "–"}</dd></div>
                </dl>
              </section>
              <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-slate-200 bg-white p-3 lg:static lg:flex-col lg:rounded-[14px] lg:border-0 lg:p-4 lg:ring-1 lg:ring-slate-200">
                <button type="submit" disabled={saving || resourceLoading} className="h-10 flex-1 rounded-[10px] bg-brand-700 px-4 text-[13.5px] font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-50 lg:flex-none">{saving ? "Saving…" : "Create lead"}</button>
                <button type="button" disabled={saving || resourceLoading} onClick={() => submit(true)} className="h-10 flex-1 rounded-[10px] bg-white px-4 text-[13.5px] font-semibold text-brand-800 ring-1 ring-slate-200 hover:bg-brand-50 disabled:opacity-50 lg:flex-none">Save & add another</button>
                <p className="hidden text-center text-[11.5px] text-slate-400 lg:block">Ctrl + Enter to save. Your draft is kept if you leave.</p>
              </div>
            </aside>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
