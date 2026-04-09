"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

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
    apiRequest("/auth/profile", { token: activeSession.token })
      .then((response) => {
        setCompany(response.company);
        setDraft(buildDraft(response.company));
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

  return (
    <DashboardShell session={session} title="Company Settings" heroStats={heroStats}>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert">{message}</div> : null}
      {!company ? (
        <div className="alert">Loading company settings...</div>
      ) : (
        <section className="dashboard-shell">
          <form className="panel" onSubmit={handleSubmit}>
            <div className="panel-header">
              <h2>Company Profile</h2>
            </div>
            <div className="form-grid two-column">
              <label className="field"><span>Name</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className="field"><span>Contact Email</span><input value={draft.contact_email} onChange={(event) => setDraft((current) => ({ ...current, contact_email: event.target.value }))} /></label>
              <label className="field"><span>Admin Email</span><input value={draft.admin_email} onChange={(event) => setDraft((current) => ({ ...current, admin_email: event.target.value }))} /></label>
              <label className="field"><span>Contact Phone</span><input value={draft.contact_phone} onChange={(event) => setDraft((current) => ({ ...current, contact_phone: event.target.value }))} /></label>
              <label className="field"><span>Industry</span><input value={draft.industry} onChange={(event) => setDraft((current) => ({ ...current, industry: event.target.value }))} /></label>
              <label className="field"><span>Website</span><input value={draft.website} onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))} /></label>
              <label className="field"><span>Currency</span><input value={draft.settings_currency} onChange={(event) => setDraft((current) => ({ ...current, settings_currency: event.target.value }))} /></label>
              <label className="field"><span>Timezone</span><input value={draft.settings_timezone} onChange={(event) => setDraft((current) => ({ ...current, settings_timezone: event.target.value }))} /></label>
              <label className="field full-width"><span>Country</span><input value={draft.country} onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))} /></label>
            </div>

            <div className="panel-header" style={{ marginTop: "1.4rem" }}>
              <h2>SMTP & Sender Identity</h2>
            </div>
            <div className="form-grid two-column">
              <label className="field"><span>SMTP Host</span><input value={draft.smtp_host} onChange={(event) => setDraft((current) => ({ ...current, smtp_host: event.target.value }))} placeholder="smtp.gmail.com" /></label>
              <label className="field"><span>SMTP Port</span><input value={draft.smtp_port} onChange={(event) => setDraft((current) => ({ ...current, smtp_port: event.target.value }))} placeholder="587" /></label>
              <label className="field"><span>SMTP User</span><input value={draft.smtp_user} onChange={(event) => setDraft((current) => ({ ...current, smtp_user: event.target.value }))} placeholder="crm@company.com" /></label>
              <label className="field"><span>SMTP Password</span><input type="password" value={draft.smtp_password} onChange={(event) => setDraft((current) => ({ ...current, smtp_password: event.target.value }))} placeholder="Leave blank to keep current password" /></label>
              <label className="field"><span>From Email</span><input value={draft.smtp_from_email} onChange={(event) => setDraft((current) => ({ ...current, smtp_from_email: event.target.value }))} placeholder="crm@company.com" /></label>
              <label className="field"><span>From Name</span><input value={draft.smtp_from_name} onChange={(event) => setDraft((current) => ({ ...current, smtp_from_name: event.target.value }))} placeholder="Company CRM" /></label>
              <label className="field full-width"><span>Reply To</span><input value={draft.smtp_reply_to} onChange={(event) => setDraft((current) => ({ ...current, smtp_reply_to: event.target.value }))} placeholder="support@company.com" /></label>
              <label className="field full-width"><span>Test Email To</span><input value={draft.test_email_to} onChange={(event) => setDraft((current) => ({ ...current, test_email_to: event.target.value }))} placeholder="ops@company.com" /></label>
            </div>

            <div className="panel-header" style={{ marginTop: "1.4rem" }}>
              <h2>Invite & Reset Email Copy</h2>
            </div>
            <div className="form-grid">
              <label className="field"><span>Login URL</span><input value={draft.login_url} onChange={(event) => setDraft((current) => ({ ...current, login_url: event.target.value }))} placeholder="https://crm.greencall.in/login" /></label>
              <label className="field"><span>Credential Subject</span><input value={draft.credentials_subject} onChange={(event) => setDraft((current) => ({ ...current, credentials_subject: event.target.value }))} placeholder="Welcome to GreenCRM" /></label>
              <label className="field"><span>Credential Heading</span><input value={draft.credentials_heading} onChange={(event) => setDraft((current) => ({ ...current, credentials_heading: event.target.value }))} placeholder="Your account is ready" /></label>
              <label className="field"><span>Password Reset Subject</span><input value={draft.reset_subject} onChange={(event) => setDraft((current) => ({ ...current, reset_subject: event.target.value }))} placeholder="Reset your workspace password" /></label>
              <label className="field full-width"><span>Credential Note</span><textarea value={draft.credentials_note} onChange={(event) => setDraft((current) => ({ ...current, credentials_note: event.target.value }))} rows={4} placeholder="Please sign in and change this temporary password immediately." /></label>
            </div>

            <div className="form-actions" style={{ marginTop: "1.4rem" }}>
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Company Settings"}
              </button>
              <button className="button ghost" type="button" onClick={handleSendTestEmail} disabled={testing || !draft.test_email_to.trim()}>
                {testing ? "Sending Test..." : "Send Test Email"}
              </button>
            </div>
          </form>
        </section>
      )}
    </DashboardShell>
  );
}
