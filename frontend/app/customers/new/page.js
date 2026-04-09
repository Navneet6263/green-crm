"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { buildCustomerNotes } from "../../../lib/customerProfile";
import { loadSession } from "../../../lib/session";

const PANEL_CLASS = "rounded-[30px] border border-[#eadfcd] bg-white/82 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const SOFT_PANEL_CLASS = "rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4";
const INPUT_CLASS = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const KICKER_CLASS = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
const HERO_PANEL_CLASS = "rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] p-6 shadow-[0_24px_70px_rgba(79,58,22,0.08)] md:p-8";
const DARK_PANEL_CLASS = "rounded-[34px] border border-[#1d1a12] bg-[linear-gradient(155deg,#10111d_0%,#171a28_56%,#25212d_100%)] p-6 text-white shadow-[0_24px_80px_rgba(6,7,16,0.3)] md:p-7";

function initials(value = "Customer") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "C";
}

function createInitialForm() {
  return {
    name: "",
    company_name: "",
    email: "",
    phone: "",
    total_value: "",
    website: "",
    industry: "",
    business_summary: "",
    address_street: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    country: "India",
    notes: "",
  };
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [form, setForm] = useState(createInitialForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }

    setSession(activeSession);
  }, [router]);

  const readinessItems = useMemo(
    () => [
      { label: "Primary contact added", done: Boolean(form.name.trim()) },
      { label: "Company identity ready", done: Boolean(form.company_name.trim()) },
      { label: "Email and phone ready", done: Boolean(form.email.trim() && form.phone.trim()) },
      { label: "Business summary added", done: Boolean(form.business_summary.trim()) },
      { label: "Location added", done: Boolean(form.address_city.trim() || form.address_state.trim() || form.country.trim()) },
    ],
    [form]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await apiRequest("/customers", {
        method: "POST",
        token: session.token,
        body: {
          name: form.name.trim(),
          company_name: form.company_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          total_value: Number(form.total_value || 0),
          notes: buildCustomerNotes(
            {
              website: form.website.trim(),
              industry: form.industry.trim(),
              business_summary: form.business_summary.trim(),
              address_street: form.address_street.trim(),
              address_city: form.address_city.trim(),
              address_state: form.address_state.trim(),
              address_zip: form.address_zip.trim(),
              country: form.country.trim(),
            },
            form.notes
          ),
        },
      });
      router.push(`/customers/${response.customer_id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell session={session} title="Create Customer" hideTitle heroStats={[]}>
      {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

      <section className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <article className={HERO_PANEL_CLASS}>
            <div className="flex items-start gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-[#10111d] text-xl font-bold text-white shadow-[0_18px_32px_rgba(6,7,16,0.18)]">
                {initials(form.company_name || form.name || "Customer")}
              </div>
              <div className="space-y-4">
                <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                  Customer Intake
                </span>
                <div>
                  <h2 className="text-4xl font-semibold tracking-tight text-[#060710] md:text-[3.2rem] md:leading-[1.02]">
                    Build a customer record with real account context, not just contact data.
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-[#746853] md:text-base">
                    Capture the relationship owner, company basics, business summary, address, and opening note inside a sharper intake workspace.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-[#eadfcd] bg-white/90 p-5 shadow-[0_14px_28px_rgba(79,58,22,0.05)]">
                <p className={KICKER_CLASS}>Primary Contact</p>
                <strong className="mt-4 block text-2xl font-black tracking-tight text-[#060710]">{form.name || "--"}</strong>
                <p className="mt-2 text-sm leading-6 text-[#766952]">The person the account team will recognize first.</p>
              </div>
              <div className="rounded-[24px] border border-[#eadfcd] bg-[#fff7e8] p-5 shadow-[0_14px_28px_rgba(79,58,22,0.05)]">
                <p className={KICKER_CLASS}>Company Identity</p>
                <strong className="mt-4 block text-2xl font-black tracking-tight text-[#060710]">{form.company_name || "--"}</strong>
                <p className="mt-2 text-sm leading-6 text-[#766952]">The business name that will sit across customer views.</p>
              </div>
              <div className="rounded-[24px] border border-[#eadfcd] bg-white/90 p-5 shadow-[0_14px_28px_rgba(79,58,22,0.05)]">
                <p className={KICKER_CLASS}>Market Position</p>
                <strong className="mt-4 block text-2xl font-black tracking-tight text-[#060710]">{form.industry || "Not set"}</strong>
                <p className="mt-2 text-sm leading-6 text-[#766952]">Useful for handoffs, routing, and account understanding.</p>
              </div>
            </div>
          </article>

          <article className={DARK_PANEL_CLASS}>
            <div className="space-y-4">
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
                Account Blueprint
              </span>
              <h3 className="text-[2rem] font-semibold leading-[1.08] tracking-tight text-white">
                Everything you type here shapes the customer desk, detail page, and follow-up history later.
              </h3>
              <p className="text-sm leading-7 text-white/68">
                This intake is designed to produce a complete account surface: who they are, what the company does, where they operate, and why the account matters.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Website", value: form.website || "Not set" },
                { label: "Country", value: form.country || "Not set" },
                { label: "Value", value: form.total_value ? `INR ${Number(form.total_value).toLocaleString("en-IN")}` : "Not set" },
                { label: "Location", value: [form.address_city, form.address_state].filter(Boolean).join(", ") || "Not set" },
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">{item.label}</p>
                  <strong className="mt-3 block text-xl font-black text-white">{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-3">
              {readinessItems.map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/6 px-4 py-3.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.done ? "bg-emerald-400" : "bg-[#d7b258]"}`} />
                  <strong className="text-sm text-white">{item.label}</strong>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.06fr_0.94fr] xl:items-start">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <article className={PANEL_CLASS}>
              <div className="mb-5 flex items-start gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-[#eadfcd] bg-[#fff3d0] text-sm font-black text-[#8d6e27]">01</span>
                <div>
                  <p className={KICKER_CLASS}>Primary Contact</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Who owns this account</h3>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className={KICKER_CLASS}>Contact Name</span>
                  <input className={INPUT_CLASS} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                </label>
                <label className="space-y-2">
                  <span className={KICKER_CLASS}>Company Name</span>
                  <input className={INPUT_CLASS} value={form.company_name} onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))} required />
                </label>
                <label className="space-y-2">
                  <span className={KICKER_CLASS}>Email</span>
                  <input className={INPUT_CLASS} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
                </label>
                <label className="space-y-2">
                  <span className={KICKER_CLASS}>Phone</span>
                  <input className={INPUT_CLASS} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required />
                </label>
              </div>
            </article>

            <article className={PANEL_CLASS}>
              <div className="mb-5 flex items-start gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-[#eadfcd] bg-[#fff3d0] text-sm font-black text-[#8d6e27]">02</span>
                <div>
                  <p className={KICKER_CLASS}>Company Profile</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">What this company does</h3>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className={KICKER_CLASS}>Industry</span>
                  <input className={INPUT_CLASS} value={form.industry} onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))} placeholder="Technology, Manufacturing, Retail" />
                </label>
                <label className="space-y-2">
                  <span className={KICKER_CLASS}>Website</span>
                  <input className={INPUT_CLASS} value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://company.com" />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className={KICKER_CLASS}>Business Summary</span>
                  <textarea className={`${INPUT_CLASS} min-h-[150px] resize-y`} rows="5" value={form.business_summary} onChange={(event) => setForm((current) => ({ ...current, business_summary: event.target.value }))} placeholder="What does this company do, what do they sell, and what kind of customers do they serve?" />
                </label>
              </div>
            </article>

            <article className={PANEL_CLASS}>
              <div className="mb-5 flex items-start gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-[#eadfcd] bg-[#fff3d0] text-sm font-black text-[#8d6e27]">03</span>
                <div>
                  <p className={KICKER_CLASS}>Address</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Location details</h3>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className={KICKER_CLASS}>Street Address</span>
                  <input className={INPUT_CLASS} value={form.address_street} onChange={(event) => setForm((current) => ({ ...current, address_street: event.target.value }))} />
                </label>
                <label className="space-y-2">
                  <span className={KICKER_CLASS}>City</span>
                  <input className={INPUT_CLASS} value={form.address_city} onChange={(event) => setForm((current) => ({ ...current, address_city: event.target.value }))} />
                </label>
                <label className="space-y-2">
                  <span className={KICKER_CLASS}>State</span>
                  <input className={INPUT_CLASS} value={form.address_state} onChange={(event) => setForm((current) => ({ ...current, address_state: event.target.value }))} />
                </label>
                <label className="space-y-2">
                  <span className={KICKER_CLASS}>Postal Code</span>
                  <input className={INPUT_CLASS} value={form.address_zip} onChange={(event) => setForm((current) => ({ ...current, address_zip: event.target.value }))} />
                </label>
                <label className="space-y-2">
                  <span className={KICKER_CLASS}>Country</span>
                  <input className={INPUT_CLASS} value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} />
                </label>
              </div>
            </article>

            <article className={PANEL_CLASS}>
              <div className="mb-5 flex items-start gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-[#eadfcd] bg-[#fff3d0] text-sm font-black text-[#8d6e27]">04</span>
                <div>
                  <p className={KICKER_CLASS}>Commercial Notes</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Value and first note</h3>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className={KICKER_CLASS}>Total Value</span>
                  <input className={INPUT_CLASS} type="number" value={form.total_value} onChange={(event) => setForm((current) => ({ ...current, total_value: event.target.value }))} />
                </label>
                <div />
                <label className="space-y-2 md:col-span-2">
                  <span className={KICKER_CLASS}>Opening Note</span>
                  <textarea className={`${INPUT_CLASS} min-h-[160px] resize-y`} rows="5" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Capture the first customer note, relationship context, or next action." />
                </label>
              </div>
            </article>

            <div className="flex flex-wrap justify-end gap-3">
              <button className={GHOST_BUTTON_CLASS} type="button" onClick={() => router.push("/customers")}>
                Cancel
              </button>
              <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={saving}>
                <DashboardIcon name="customers" className="h-4 w-4" />
                {saving ? "Creating..." : "Create Customer"}
              </button>
            </div>
          </form>

          <div className="space-y-5 xl:sticky xl:top-6">
            <article className={PANEL_CLASS}>
              <p className={KICKER_CLASS}>Live Preview</p>
              <div className="mt-4 rounded-[28px] border border-[#eadfcd] bg-[linear-gradient(145deg,#fffdf7_0%,#fff3d8_100%)] p-5">
                <div className="flex items-start gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-[#10111d] text-xl font-bold text-white shadow-[0_18px_32px_rgba(6,7,16,0.18)]">
                    {initials(form.company_name || form.name || "Customer")}
                  </div>
                  <div className="min-w-0">
                    <span className={KICKER_CLASS}>Account Preview</span>
                    <h3 className="mt-3 truncate text-[1.9rem] font-black tracking-tight text-[#060710]">
                      {form.company_name || "Customer profile preview"}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[#746853]">
                      {form.business_summary || "The company overview will appear here once you add what the business does."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {[
                    ["Contact", form.name || "--"],
                    ["Email", form.email || "--"],
                    ["Phone", form.phone || "--"],
                    ["Address", [form.address_street, form.address_city, form.address_state, form.country].filter(Boolean).join(", ") || "--"],
                  ].map(([label, value]) => (
                    <div key={label} className={SOFT_PANEL_CLASS}>
                      <span className={KICKER_CLASS}>{label}</span>
                      <strong className="mt-3 block text-sm leading-6 text-[#060710]">{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className={PANEL_CLASS}>
              <p className={KICKER_CLASS}>What gets saved</p>
              <div className="mt-4 space-y-3">
                {[
                  "Primary customer contact and company identity",
                  "Business summary and website for future handoffs",
                  "Address details for account context",
                  "Opening note for the customer history trail",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-[20px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff0c8] text-[#8d6e27]">
                      <DashboardIcon name="documents" className="h-4 w-4" />
                    </span>
                    <strong className="text-sm text-[#060710]">{item}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
