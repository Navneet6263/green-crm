"use client";

import { useEffect, useState } from "react";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import { apiRequest } from "../../../lib/api";

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

function buildPlatformDraft(platform) {
  const settings = parseJson(platform?.service_settings);
  const authDelivery = parseJson(settings.auth_delivery);
  const smtpProfile = parseJson(settings.smtp_profile);

  return {
    login_url: authDelivery.login_url || "",
    credentials_subject: authDelivery.credentials_subject || "",
    credentials_heading: authDelivery.credentials_heading || "",
    credentials_note: authDelivery.credentials_note || "",
    reset_subject: authDelivery.reset_subject || "",
    smtp_from_email: smtpProfile.from_email || "",
    smtp_from_name: smtpProfile.from_name || "",
    smtp_reply_to: smtpProfile.reply_to || "",
  };
}

export default function SuperAdminSettingsPage() {
  return (
    <WorkspacePage
      title="System Settings"
      eyebrow="Platform Defaults"
      allowedRoles={["super-admin"]}
      requestBuilder={() => [
        { key: "summary", path: "/dashboard/summary" },
        { key: "safety", path: "/super-admin/safety-status" },
        { key: "platform", path: "/companies/platform-root" },
      ]}
      heroStats={({ data }) => [
        { label: "Products", value: data.summary?.products || 0 },
        { label: "Companies", value: data.summary?.companies || 0, color: "#4a9eff" },
        { label: "Users", value: data.summary?.users || 0, color: "#1fc778" },
        { label: "Safety", value: data.safety?.can_create_more ? "Healthy" : "At Limit", color: data.safety?.can_create_more ? "#1fc778" : "#f5a623" },
      ]}
    >
      {(props) => <SystemSettingsContent {...props} />}
    </WorkspacePage>
  );
}

function SystemSettingsContent({ session, data, error, loading, refresh }) {
  const [draft, setDraft] = useState(buildPlatformDraft(null));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(buildPlatformDraft(data.platform));
    setMessage("");
  }, [data.platform]);

  async function savePlatformDefaults(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await apiRequest("/companies/platform-root", {
        method: "PUT",
        token: session.token,
        body: {
          login_url: draft.login_url || null,
          credentials_subject: draft.credentials_subject || null,
          credentials_heading: draft.credentials_heading || null,
          credentials_note: draft.credentials_note || null,
          reset_subject: draft.reset_subject || null,
          smtp_from_email: draft.smtp_from_email || null,
          smtp_from_name: draft.smtp_from_name || null,
          smtp_reply_to: draft.smtp_reply_to || null,
        },
      });

      setMessage("Platform defaults updated.");
      await refresh();
    } catch (requestError) {
      setMessage(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className={message === "Platform defaults updated." ? "alert" : "alert error"}>{message}</div> : null}
      {loading ? <div className="alert">Loading system settings...</div> : null}
      {!loading ? (
        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Platform Email Defaults</h2>
            </div>
            <p className="muted" style={{ marginBottom: "1rem" }}>
              Ye defaults database me save hote hain aur future invite/reset emails me use hote hain. Company-level settings in defaults ko override kar sakti hain.
            </p>
            <form className="form-grid" onSubmit={savePlatformDefaults}>
              <label className="field">
                <span>Default Login URL</span>
                <input value={draft.login_url} onChange={(event) => setDraft((current) => ({ ...current, login_url: event.target.value }))} placeholder="https://crm.greencall.in/login" />
              </label>
              <label className="field">
                <span>Credential Subject</span>
                <input value={draft.credentials_subject} onChange={(event) => setDraft((current) => ({ ...current, credentials_subject: event.target.value }))} placeholder="Welcome to GreenCRM" />
              </label>
              <label className="field">
                <span>Credential Heading</span>
                <input value={draft.credentials_heading} onChange={(event) => setDraft((current) => ({ ...current, credentials_heading: event.target.value }))} placeholder="Your account is ready" />
              </label>
              <label className="field">
                <span>Password Reset Subject</span>
                <input value={draft.reset_subject} onChange={(event) => setDraft((current) => ({ ...current, reset_subject: event.target.value }))} placeholder="Reset your workspace password" />
              </label>
              <label className="field">
                <span>Default From Email</span>
                <input value={draft.smtp_from_email} onChange={(event) => setDraft((current) => ({ ...current, smtp_from_email: event.target.value }))} placeholder="crm@greencall.in" />
              </label>
              <label className="field">
                <span>Default From Name</span>
                <input value={draft.smtp_from_name} onChange={(event) => setDraft((current) => ({ ...current, smtp_from_name: event.target.value }))} placeholder="GreenCRM" />
              </label>
              <label className="field full-width">
                <span>Default Reply To</span>
                <input value={draft.smtp_reply_to} onChange={(event) => setDraft((current) => ({ ...current, smtp_reply_to: event.target.value }))} placeholder="support@greencall.in" />
              </label>
              <label className="field full-width">
                <span>Credential Note</span>
                <textarea value={draft.credentials_note} onChange={(event) => setDraft((current) => ({ ...current, credentials_note: event.target.value }))} rows={4} placeholder="Please sign in and change this temporary password immediately." />
              </label>
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Platform Defaults"}
              </button>
            </form>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h2>Platform Snapshot</h2>
            </div>
            <div className="table-stack">
              <div className="table-row">
                <div>
                  <strong>Tenant Count</strong>
                  <span>Active + trial tenants currently visible on the platform.</span>
                </div>
                <strong>{data.summary?.companies || 0}</strong>
              </div>
              <div className="table-row">
                <div>
                  <strong>Default Login URL</strong>
                  <span>Fallback used when a tenant-specific login URL is not saved.</span>
                </div>
                <strong>{draft.login_url || "frontend env fallback"}</strong>
              </div>
              <div className="table-row">
                <div>
                  <strong>Super Admin Safety</strong>
                  <span>Create more super-admin accounts only while slots remain available.</span>
                </div>
                <strong>{data.safety?.can_create_more ? "Healthy" : "At limit"}</strong>
              </div>
              <div className="table-row">
                <div>
                  <strong>SMTP Routing</strong>
                  <span>Global SMTP still comes from backend env. Tenant SMTP can override it company-wise.</span>
                </div>
                <strong>Env + DB</strong>
              </div>
            </div>
          </article>
        </section>
      ) : null}
    </>
  );
}
