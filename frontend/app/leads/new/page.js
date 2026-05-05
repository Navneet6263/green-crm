"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import {
  canManageScopedAssignments, filterRecordsByTeam, formatScopedError,
  getTeamAssignmentState, isPlatformConsoleRole, loadProductsForScope,
  loadTeamScopeResources, resolveScopedCompanyId, scopedOwnersHelperText,
  scopedProductsEmptyMessage, scopedProductsHelperText, scopedUsersEmptyMessage,
  shouldShowTeamSelector, teamSelectionRequiredMessage,
} from "../../../lib/teamScope";
import { AlertError } from "../../../components/ui/Alert";
import { LeadFormHeader, LeadPreviewStrip, LeadFormSection1, LeadFormSection2, LeadFormSection3 } from "./LeadFormSections";
import { LeadFormSidebar } from "./LeadFormSidebar";
import { T } from "./lead-form-tokens";

const ALLOWED_ROLES = ["super-admin","platform-admin","platform-manager","admin","manager","sales","marketing"];

const INDUSTRY_OPTIONS = [
  { value:"", label:"Select industry" },
  { value:"technology", label:"Technology" }, { value:"healthcare", label:"Healthcare" },
  { value:"finance", label:"Finance" }, { value:"education", label:"Education" },
  { value:"manufacturing", label:"Manufacturing" }, { value:"retail", label:"Retail" },
  { value:"real-estate", label:"Real Estate" }, { value:"staffing", label:"Staffing" },
  { value:"services", label:"Professional Services" }, { value:"other", label:"Other" },
];
const LEAD_SOURCE_OPTIONS = [
  { value:"website", label:"Website" }, { value:"google", label:"Google" },
  { value:"facebook", label:"Facebook" }, { value:"instagram", label:"Instagram" },
  { value:"linkedin", label:"LinkedIn" }, { value:"referral", label:"Referral" },
  { value:"cold-call", label:"Cold Call" }, { value:"email-campaign", label:"Email Campaign" },
  { value:"partner", label:"Partner" }, { value:"trade-show", label:"Trade Show" },
  { value:"walk-in", label:"Walk-in" }, { value:"other", label:"Other" },
];
const PRIORITY_OPTIONS = [
  { value:"low", label:"Low Priority" }, { value:"medium", label:"Medium Priority" }, { value:"high", label:"High Priority" },
];

function createForm(cid = "") {
  return { company_id:cid, team_id:"", product_id:"", contact_person:"", company_name:"", email:"", phone:"", industry:"", lead_source:"website", custom_lead_source:"", follow_up_date:"", estimated_value:"", number_of_units:"", priority:"medium", requirements:"", assigned_to:"", address_street:"", address_city:"", address_state:"", address_zip:"", address_country:"India" };
}

function formatDateTimeMin() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}T${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;
}

// Map field name → data-field id used in Label components
const FIELD_SCROLL_MAP = {
  company_id: "field-company_id", team_id: "field-team_id", product_id: "field-product_id",
  contact_person: "field-contact_person", company_name: "field-company_name",
  email: "field-email", phone: "field-phone", custom_lead_source: "field-custom_lead_source",
  number_of_units: "field-number_of_units", assigned_to: "field-assigned_to",
};

export default function NewLeadPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [teams, setTeams] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [productHistory, setProductHistory] = useState([]);
  const [form, setForm] = useState(createForm());
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const role = session?.user?.role || "";
  const canAssign = canManageScopedAssignments(role);
  const isPlatformConsole = isPlatformConsoleRole(role);
  const isSuperAdmin = role === "super-admin";
  const selectedCompanyId = resolveScopedCompanyId(session, form.company_id);
  const selectedCompany = useMemo(() => companies.find(c => c.company_id === selectedCompanyId) || companies[0] || session?.company || null, [companies, selectedCompanyId, session?.company]);
  const selectedProduct = useMemo(() => products.find(p => p.product_id === form.product_id) || null, [products, form.product_id]);
  const teamAssignment = useMemo(() => getTeamAssignmentState(teams, form.team_id, "lead"), [form.team_id, teams]);
  const selectedTeam = teamAssignment.selectedTeam;
  const teamSelectorVisible = shouldShowTeamSelector(role, teams);
  const teamSelectionPending = teamSelectorVisible && !form.team_id;
  const filteredProducts = useMemo(() => teamSelectionPending ? [] : filterRecordsByTeam(products, form.team_id), [products, form.team_id, teamSelectionPending]);
  const selectedAssignee = useMemo(() => assignableUsers.find(u => u.user_id === form.assigned_to) || null, [assignableUsers, form.assigned_to]);
  const minimumDateTime = useMemo(() => formatDateTimeMin(), []);
  const canOpenTeamWorkspace = ["super-admin","platform-admin","platform-manager","admin","manager"].includes(role);

  const ownerHelperMessage = useMemo(() => {
    if (!canAssign || resourceLoading) return "";
    if (teamSelectionPending) return "Choose a team to load available owners.";
    if (!assignableUsers.length) return scopedUsersEmptyMessage(selectedTeam);
    return selectedTeam ? scopedOwnersHelperText(selectedTeam) : "";
  }, [assignableUsers.length, canAssign, resourceLoading, selectedTeam, teamSelectionPending]);

  const productHelperMessage = useMemo(() => {
    if (resourceLoading) return "";
    if (teamSelectionPending) return "Choose a team to load products.";
    if (!filteredProducts.length) return scopedProductsEmptyMessage(selectedTeam);
    return selectedTeam ? scopedProductsHelperText(selectedTeam) : "";
  }, [filteredProducts.length, resourceLoading, selectedTeam, teamSelectionPending]);

  const quickProductPicks = useMemo(() => {
    if (productHistory.length) {
      return productHistory.slice(0, 3).map(item => {
        const p = products.find(e => e.product_id === item.product_id);
        return { product_id: item.product_id, name: item.name, subtitle: `${item.lead_count || 0} leads`, color: p?.color || "#16b67b" };
      }).filter(item => item.product_id && filteredProducts.some(p => p.product_id === item.product_id));
    }
    return filteredProducts.slice(0, 3).map(p => ({ product_id: p.product_id, name: p.name, subtitle: "Quick pick", color: p.color || "#16b67b" }));
  }, [filteredProducts, productHistory, products]);

  function onChange(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => e[field] ? { ...e, [field]: "" } : e);
  }

  useEffect(() => {
    let ignore = false;
    async function boot() {
      const s = loadSession();
      if (!s) return router.replace("/login");
      if (!ALLOWED_ROLES.includes(s.user?.role)) return router.replace("/dashboard");
      setSession(s);
      try {
        if (["super-admin","platform-admin","platform-manager"].includes(s.user?.role)) {
          const r = await apiRequest("/companies?page_size=50", { token: s.token });
          if (ignore) return;
          const items = r.items || [];
          setCompanies(items);
          setForm(createForm(items[0]?.company_id || ""));
        } else {
          const co = s.company ? [{ company_id: s.company.company_id || s.user?.company_id, name: s.company.name }] : [];
          setCompanies(co);
          setForm(createForm(s.user?.company_id || s.company?.company_id || ""));
        }
      } catch (e) { if (!ignore) setError(e.message); }
      finally { if (!ignore) setLoading(false); }
    }
    boot();
    return () => { ignore = true; };
  }, [router]);

  useEffect(() => {
    let ignore = false;
    async function loadResources() {
      if (!session) return;
      if (isPlatformConsole && !form.company_id) { setTeams([]); setProducts([]); setAssignableUsers([]); setProductHistory([]); return; }
      setResourceLoading(true); setError("");
      try {
        const [scope, prods, hist] = await Promise.all([
          loadTeamScopeResources(session.token, { companyId: selectedCompanyId, teamId: form.team_id, includeUsers: canAssign && !teamSelectionPending, userPageSize: 80 }),
          !teamSelectionPending ? loadProductsForScope(session.token, { companyId: isPlatformConsole ? selectedCompanyId : undefined, teamId: form.team_id, pageSize: 50 }) : Promise.resolve([]),
          !isSuperAdmin ? apiRequest("/leads/user/product-history", { token: session.token }) : Promise.resolve([]),
        ]);
        if (ignore) return;
        const nextTeams = scope.teams || [], nextUsers = scope.users || [], nextTid = scope.teamId || "";
        const nextProds = prods || [], scopedProds = filterRecordsByTeam(nextProds, nextTid);
        setTeams(nextTeams); setProducts(nextProds); setAssignableUsers(nextUsers); setProductHistory(!isSuperAdmin ? hist || [] : []);
        setForm(f => ({ ...f, team_id: nextTid, product_id: scopedProds.some(p => p.product_id === f.product_id) ? f.product_id : "", assigned_to: nextUsers.some(u => u.user_id === f.assigned_to) ? f.assigned_to : "" }));
      } catch (e) { if (!ignore) setError(formatScopedError(e, "Failed to load lead scope.")); }
      finally { if (!ignore) setResourceLoading(false); }
    }
    loadResources();
    return () => { ignore = true; };
  }, [canAssign, form.company_id, form.team_id, isPlatformConsole, isSuperAdmin, selectedCompanyId, session, teamSelectionPending]);

  function validate() {
    const e = {};
    if (isPlatformConsole && !form.company_id) e.company_id = "Select a company.";
    if (teamSelectorVisible && !form.team_id) e.team_id = teamSelectionRequiredMessage("lead");
    if (!form.product_id) e.product_id = "Select a product.";
    if (!form.contact_person.trim()) e.contact_person = "Contact name is required.";
    if (!form.company_name.trim()) e.company_name = "Company name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.phone.trim()) e.phone = "Phone is required.";
    else { const d = form.phone.replace(/\D/g,""); if (d.length < 7 || d.length > 15) e.phone = "Phone must be 7–15 digits."; }
    if (form.lead_source === "other" && !form.custom_lead_source.trim()) e.custom_lead_source = "Enter the custom source.";
    if (form.number_of_units !== "") { const u = Number(form.number_of_units); if (!Number.isInteger(u) || u < 0) e.number_of_units = "Must be a whole number."; }
    if (isPlatformConsole && !form.assigned_to) e.assigned_to = "Choose the tenant owner.";
    setErrors(e);
    // Scroll to first error
    const firstKey = Object.keys(e)[0];
    if (firstKey) {
      setTimeout(() => {
        const el = document.getElementById(`field-${firstKey}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    }
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (saving || resourceLoading || !validate()) return;
    setSaving(true); setError("");
    try {
      const r = await apiRequest("/leads", { method:"POST", token:session.token, body: {
        company_id: isPlatformConsole ? form.company_id : undefined,
        team_id: form.team_id || undefined, product_id: form.product_id,
        contact_person: form.contact_person.trim(), company_name: form.company_name.trim(),
        email: form.email.trim(), phone: form.phone.trim(),
        industry: form.industry || null,
        lead_source: form.lead_source === "other" ? form.custom_lead_source.trim() : form.lead_source,
        follow_up_date: form.follow_up_date ? form.follow_up_date.replace("T"," ") : null,
        estimated_value: Number(form.estimated_value || 0),
        number_of_units: form.number_of_units === "" ? null : Number(form.number_of_units),
        priority: form.priority, requirements: form.requirements.trim() || null,
        assigned_to: form.assigned_to || undefined,
        address_street: form.address_street.trim() || null, address_city: form.address_city.trim() || null,
        address_state: form.address_state.trim() || null, address_zip: form.address_zip.trim() || null,
        address_country: form.address_country.trim() || "India",
      }});
      router.push(`/leads/${r.lead_id}`);
    } catch (err) { setError(formatScopedError(err, "Failed to create lead.")); }
    finally { setSaving(false); }
  }

  return (
    <DashboardShell session={session} title="Create Lead" hideTitle heroStats={[]}>
      <div className="mx-auto max-w-[1280px] space-y-5 px-1">
        <AlertError message={error} onDismiss={() => setError("")} />

        {loading ? <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-sm text-slate-500">Loading lead composer…</div> : null}

        {!loading ? (
          <>
            <LeadFormHeader form={form} selectedCompany={selectedCompany} selectedTeam={selectedTeam} selectedProduct={selectedProduct} selectedAssignee={selectedAssignee} isPlatformConsole={isPlatformConsole} session={session} />
            <LeadPreviewStrip form={form} selectedProduct={selectedProduct} selectedTeam={selectedTeam} selectedAssignee={selectedAssignee} session={session} isPlatformConsole={isPlatformConsole} />

            <form className="grid gap-5 xl:grid-cols-[1fr_320px] xl:items-start" onSubmit={handleSubmit}>
              {/* Left — form sections */}
              <div className="space-y-4">
                <LeadFormSection1
                  form={form} errors={errors} companies={companies} teams={teams}
                  assignableUsers={assignableUsers} products={filteredProducts}
                  isPlatformConsole={isPlatformConsole} canAssign={canAssign}
                  teamSelectorVisible={teamSelectorVisible} teamSelectionPending={teamSelectionPending}
                  resourceLoading={resourceLoading} teamAssignment={teamAssignment}
                  ownerHelperMessage={ownerHelperMessage} productHelperMessage={productHelperMessage}
                  canOpenTeamWorkspace={canOpenTeamWorkspace} onChange={onChange}
                />
                <LeadFormSection2
                  form={form} errors={errors}
                  INDUSTRY_OPTIONS={INDUSTRY_OPTIONS} LEAD_SOURCE_OPTIONS={LEAD_SOURCE_OPTIONS} PRIORITY_OPTIONS={PRIORITY_OPTIONS}
                  minimumDateTime={minimumDateTime} onChange={onChange}
                />
                <LeadFormSection3 form={form} onChange={onChange} />

                {/* Submit at bottom of form */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                  <p className="text-sm text-slate-400">Fill all required fields before submitting.</p>
                  <div className="flex gap-3">
                    <button className={T.ghost} type="button" onClick={() => router.push("/leads")}>Cancel</button>
                    <button className={T.gold} type="submit" disabled={saving || resourceLoading || !filteredProducts.length}>
                      <DashboardIcon name={saving ? "analytics" : "leads"} className="h-4 w-4" />
                      {saving ? "Creating…" : "Create Lead"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right — quick picks */}
              <LeadFormSidebar
                quickProductPicks={quickProductPicks}
                productHelperMessage={productHelperMessage}
                form={form}
                onPickProduct={pid => onChange("product_id", pid)}
              />
            </form>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
