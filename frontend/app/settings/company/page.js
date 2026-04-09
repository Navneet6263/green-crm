"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

const PANEL_CLASS = "rounded-[30px] border border-[#eadfcd] bg-white/82 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const INPUT_CLASS = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const KICKER_CLASS = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";

function parseJson(rawValue) {
  if (!rawValue) return {};
  if (typeof rawValue === "string") {
    try {
      return JSON.parse(rawValue);
    } catch (_error) {
      return {};
    }
  }
  return typeof rawValue === "object" ? rawValue : {};
}

function buildDraft(company) {
  const settings = parseJson(company?.service_settings);
  const authDelivery = parseJson(settings.auth_delivery);
  const smtpProfile = parseJson(settings.smtp_profile);

  return {
    name: company?.name || "",
    contact_email: company?.contact_email || "",
    admin_email: company?.admin_email || "",
    contact_phone: company?.contact_phone || "",
    industry: company?.industry || "",
    website: company?.website || "",
    country: company?.country || "India",
    settings_currency: company?.settings_currency || "INR",
    settings_timezone: company?.settings_timezone || "Asia/Kolkata",
    smtp_host: company?.smtp_host || "",
    smtp_port: company?.smtp_port ? String(company.smtp_port) : "",
    smtp_user: company?.smtp_user || "",
    smtp_password: "",
    smtp_from_email: smtpProfile.from_email || "",
    smtp_from_name: smtpProfile.from_name || "",
    smtp_reply_to: smtpProfile.reply_to || "",
    login_url: authDelivery.login_url || "",
    credentials_subject: authDelivery.credentials_subject || "",
    credentials_heading: authDelivery.credentials_heading || "",
    credentials_note: authDelivery.credentials_note || "",
    reset_subject: authDelivery.reset_subject || "",
    test_email_to: company?.contact_email || company?.admin_email || "",
  };
}

export default function CompanySettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [company, setCompany] = useState(null);
  const [people, setPeople] = useState([]);
  const [draft, setDraft] = useState(buildDraft(null));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }
    if (!["super-admin", "admin"].includes(activeSession.user?.role)) {
      router.replace("/dashboard");
      return;
    }

    setSession(activeSession);
    Promise.all([
      apiRequest("/auth/profile", { token: activeSession.token }),
      apiRequest("/auth/users?page_size=80", { token: activeSession.token }),
    ])
      .then(([response, usersResponse]) => {
        setCompany(response.company);
        setDraft(buildDraft(response.company));
        setPeople(usersResponse.items || []);
      })
      .catch((requestError) => setError(requestError.message));
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const body = {
        name: draft.name,
        contact_email: draft.contact_email,
        admin_email: draft.admin_email,
        contact_phone: draft.contact_phone,
        industry: draft.industry,
        website: draft.website,
        country: draft.country,
        settings_currency: draft.settings_currency,
        settings_timezone: draft.settings_timezone,
        smtp_host: draft.smtp_host || null,
        smtp_port: draft.smtp_port ? Number(draft.smtp_port) : null,
        smtp_user: draft.smtp_user || null,
        smtp_from_email: draft.smtp_from_email || null,
        smtp_from_name: draft.smtp_from_name || null,
        smtp_reply_to: draft.smtp_reply_to || null,
        login_url: draft.login_url || null,
        credentials_subject: draft.credentials_subject || null,
        credentials_heading: draft.credentials_heading || null,
        credentials_note: draft.credentials_note || null,
        reset_subject: draft.reset_subject || null,
      };

      if (draft.smtp_password.trim()) {
        body.smtp_password = draft.smtp_password.trim();
      }

      const response = await apiRequest(`/companies/${company.company_id}`, {
        method: "PUT",
        token: session.token,
        body,
      });

      setCompany(response);
      setDraft(buildDraft(response));
      setMessage("Company settings updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTestEmail() {
    if (!company || !draft.test_email_to.trim()) {
      setError("Test email recipient is required.");
      return;
    }

    setError("");
    setMessage("");
    setTesting(true);

    try {
      const response = await apiRequest("/communications/test-email", {
        method: "POST",
        token: session.token,
        body: {
          company_id: company.company_id,
          to: draft.test_email_to.trim(),
        },
      });

      setMessage(
        response.delivery?.delivery === "email"
          ? "SMTP test email sent successfully."
          : "SMTP test fell back to preview mode. Check backend SMTP routing."
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setTesting(false);
    }
  }

  const heroStats = company
    ? [
        { label: "Currency", value: company.settings_currency || "INR" },
        { label: "Timezone", value: company.settings_timezone || "Asia/Kolkata", color: "#4f8cff" },
        { label: "SMTP", value: company.smtp_host ? "Tenant Mail" : "Platform Mail", color: company.smtp_host ? "#1fc778" : "#f4a42d" },
        { label: "Login URL", value: draft.login_url ? "DB Saved" : "Platform Default", color: draft.login_url ? "#4f8cff" : "#94a3b8" },
      ]
    : [];
  const admins = people.filter((user) => user.role === "admin");
  const managers = people.filter((user) => user.role === "manager");

  return (
    <DashboardShell session={session} title="Company Settings" hideTitle heroStats={[]}>
      {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div> : null}
      {!company ? (
        <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">Loading company settings...</div>
      ) : (
        <section className="space-y-5">
          <article className="rounded-[34px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(247,240,227,0.96)_42%,_rgba(241,232,215,1)_100%)] p-5 shadow-[0_22px_60px_rgba(79,58,22,0.08)] md:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                  Company Settings
                </span>
                <h2 className="text-4xl font-semibold tracking-tight text-[#060710] md:text-[3rem] md:leading-[1.04]">
                  Company controls, leadership view, and delivery setup in one cleaner admin surface.
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-[#746853] md:text-base">
                  Review the tenant identity, see who is running the workspace, and manage SMTP plus invite delivery without the profile-like duplication.
                </p>
              </div>
              <div className="grid gap-3 xl:min-w-[420px] xl:max-w-[460px] xl:w-full sm:grid-cols-2">
                {heroStats.map((item, index) => (
                  <div key={item.label} className={`rounded-[24px] border border-[#eadfcd] p-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)] ${index === 0 ? "bg-[#fff6e4]" : "bg-white/88"}`}>
                    <p className={KICKER_CLASS}>{item.label}</p>
                    <p className="mt-4 text-2xl font-semibold tracking-tight text-[#060710]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <div className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr] xl:items-start">
            <form className={`${PANEL_CLASS} space-y-5`} onSubmit={handleSubmit}>
              <div>
                <p className={KICKER_CLASS}>Company Profile</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Tenant identity</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2"><span className={KICKER_CLASS}>Name</span><input className={INPUT_CLASS} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>Contact Email</span><input className={INPUT_CLASS} value={draft.contact_email} onChange={(event) => setDraft((current) => ({ ...current, contact_email: event.target.value }))} /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>Admin Email</span><input className={INPUT_CLASS} value={draft.admin_email} onChange={(event) => setDraft((current) => ({ ...current, admin_email: event.target.value }))} /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>Contact Phone</span><input className={INPUT_CLASS} value={draft.contact_phone} onChange={(event) => setDraft((current) => ({ ...current, contact_phone: event.target.value }))} /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>Industry</span><input className={INPUT_CLASS} value={draft.industry} onChange={(event) => setDraft((current) => ({ ...current, industry: event.target.value }))} /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>Website</span><input className={INPUT_CLASS} value={draft.website} onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))} /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>Currency</span><input className={INPUT_CLASS} value={draft.settings_currency} onChange={(event) => setDraft((current) => ({ ...current, settings_currency: event.target.value }))} /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>Timezone</span><input className={INPUT_CLASS} value={draft.settings_timezone} onChange={(event) => setDraft((current) => ({ ...current, settings_timezone: event.target.value }))} /></label>
                <label className="space-y-2 md:col-span-2"><span className={KICKER_CLASS}>Country</span><input className={INPUT_CLASS} value={draft.country} onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))} /></label>
              </div>

              <div>
                <p className={KICKER_CLASS}>SMTP & Sender Identity</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Delivery routing</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2"><span className={KICKER_CLASS}>SMTP Host</span><input className={INPUT_CLASS} value={draft.smtp_host} onChange={(event) => setDraft((current) => ({ ...current, smtp_host: event.target.value }))} placeholder="smtp.gmail.com" /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>SMTP Port</span><input className={INPUT_CLASS} value={draft.smtp_port} onChange={(event) => setDraft((current) => ({ ...current, smtp_port: event.target.value }))} placeholder="587" /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>SMTP User</span><input className={INPUT_CLASS} value={draft.smtp_user} onChange={(event) => setDraft((current) => ({ ...current, smtp_user: event.target.value }))} placeholder="crm@company.com" /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>SMTP Password</span><input className={INPUT_CLASS} type="password" value={draft.smtp_password} onChange={(event) => setDraft((current) => ({ ...current, smtp_password: event.target.value }))} placeholder="Leave blank to keep current password" /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>From Email</span><input className={INPUT_CLASS} value={draft.smtp_from_email} onChange={(event) => setDraft((current) => ({ ...current, smtp_from_email: event.target.value }))} placeholder="crm@company.com" /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>From Name</span><input className={INPUT_CLASS} value={draft.smtp_from_name} onChange={(event) => setDraft((current) => ({ ...current, smtp_from_name: event.target.value }))} placeholder="Company CRM" /></label>
                <label className="space-y-2 md:col-span-2"><span className={KICKER_CLASS}>Reply To</span><input className={INPUT_CLASS} value={draft.smtp_reply_to} onChange={(event) => setDraft((current) => ({ ...current, smtp_reply_to: event.target.value }))} placeholder="support@company.com" /></label>
                <label className="space-y-2 md:col-span-2"><span className={KICKER_CLASS}>Test Email To</span><input className={INPUT_CLASS} value={draft.test_email_to} onChange={(event) => setDraft((current) => ({ ...current, test_email_to: event.target.value }))} placeholder="ops@company.com" /></label>
              </div>

              <div>
                <p className={KICKER_CLASS}>Invite & Reset Copy</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Auth delivery text</h3>
              </div>
              <div className="grid gap-4">
                <label className="space-y-2"><span className={KICKER_CLASS}>Login URL</span><input className={INPUT_CLASS} value={draft.login_url} onChange={(event) => setDraft((current) => ({ ...current, login_url: event.target.value }))} placeholder="https://crm.greencall.in/login" /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>Credential Subject</span><input className={INPUT_CLASS} value={draft.credentials_subject} onChange={(event) => setDraft((current) => ({ ...current, credentials_subject: event.target.value }))} placeholder="Welcome to GreenCRM" /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>Credential Heading</span><input className={INPUT_CLASS} value={draft.credentials_heading} onChange={(event) => setDraft((current) => ({ ...current, credentials_heading: event.target.value }))} placeholder="Your account is ready" /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>Password Reset Subject</span><input className={INPUT_CLASS} value={draft.reset_subject} onChange={(event) => setDraft((current) => ({ ...current, reset_subject: event.target.value }))} placeholder="Reset your workspace password" /></label>
                <label className="space-y-2"><span className={KICKER_CLASS}>Credential Note</span><textarea className={`${INPUT_CLASS} min-h-[130px] resize-y`} value={draft.credentials_note} onChange={(event) => setDraft((current) => ({ ...current, credentials_note: event.target.value }))} rows={4} placeholder="Please sign in and change this temporary password immediately." /></label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={saving}>{saving ? "Saving..." : "Save Company Settings"}</button>
                <button className={GHOST_BUTTON_CLASS} type="button" onClick={handleSendTestEmail} disabled={testing || !draft.test_email_to.trim()}>{testing ? "Sending Test..." : "Send Test Email"}</button>
              </div>
            </form>

            <div className="space-y-5">
              <article className={PANEL_CLASS}>
                <div className="mb-5">
                  <p className={KICKER_CLASS}>Leadership</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Who runs this workspace</h3>
                </div>
                <div className="grid gap-3">
                  {[{ label: "Admins", items: admins }, { label: "Managers", items: managers }].map((group) => (
                    <div key={group.label} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <strong className="text-base text-[#060710]">{group.label}</strong>
                        <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{group.items.length}</span>
                      </div>
                      <div className="space-y-2">
                        {group.items.length ? group.items.map((user) => (
                          <div key={user.user_id} className="flex items-center gap-3 rounded-[18px] border border-[#eadfcd] bg-white px-3 py-3">
                            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#fff0c8] text-[#8d6e27]">
                              <DashboardIcon name="users" className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <strong className="block truncate text-sm text-[#060710]">{user.name}</strong>
                              <span className="block truncate text-xs text-[#8f816a]">{user.email || user.role}</span>
                            </div>
                          </div>
                        )) : <p className="text-sm leading-7 text-[#746853]">No {group.label.toLowerCase()} found yet.</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className={PANEL_CLASS}>
                <div className="mb-5">
                  <p className={KICKER_CLASS}>Company Snapshot</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Tenant reference</h3>
                </div>
                <div className="grid gap-3">
                  {[["Company", company.name], ["Contact Email", company.contact_email || draft.contact_email], ["Admin Email", company.admin_email || draft.admin_email], ["Phone", company.contact_phone || draft.contact_phone], ["Website", company.website || draft.website], ["Country", company.country || draft.country]].map(([label, value]) => (
                    <div key={label} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                      <span className={KICKER_CLASS}>{label}</span>
                      <strong className="mt-3 block text-sm leading-6 text-[#060710]">{value || "--"}</strong>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>
      )}
    </DashboardShell>
  );
}
