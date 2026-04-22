"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "../../lib/api";
import CommunicationSettingsSection from "../integrations/CommunicationSettingsSection";
import { formatNumber, parseJson } from "./format";
import {
  Badge,
  INPUT_CLASS,
  MetricCard,
  MetricGrid,
  Notice,
  PageIntro,
  Panel,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SUB_PANEL_CLASS,
  TEXTAREA_CLASS,
} from "./ui";

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

export default function SystemSettingsContent({ session, data, error, loading, refresh }) {
  const [draft, setDraft] = useState(buildPlatformDraft(null));
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(buildPlatformDraft(data.platform));
    setNotice(null);
  }, [data.platform]);

  async function savePlatformDefaults(event) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

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

      setNotice({ tone: "success", text: "Platform defaults updated." });
      await refresh();
    } catch (requestError) {
      setNotice({ tone: "error", text: requestError.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Notice tone="error" text={error} className="mb-4" />
      {notice ? <Notice tone={notice.tone} text={notice.text} className="mb-4" /> : null}
      {loading ? <Notice tone="info" text="Loading system settings..." className="mb-4" /> : null}

      {!loading ? (
        <div className="space-y-6">
          <PageIntro
            eyebrow="Platform Defaults"
            title="System-wide email and auth defaults"
            description="These defaults power future invites, reset emails, and sender identity whenever a tenant has not overridden its own delivery profile."
            meta={
              <>
                <Badge tone="violet">Super Admin only</Badge>
                <Badge tone={data.safety?.can_create_more ? "emerald" : "amber"}>{data.safety?.can_create_more ? "Safety healthy" : "Safety limit reached"}</Badge>
              </>
            }
          />

          <MetricGrid className="2xl:grid-cols-4">
            <MetricCard icon="company" label="Companies" value={formatNumber(data.summary?.companies || 0)} note="Tenant count currently visible on the platform." tone="emerald" />
            <MetricCard icon="users" label="Users" value={formatNumber(data.summary?.users || 0)} note="Total active identities under platform oversight." tone="blue" />
            <MetricCard icon="products" label="Products" value={formatNumber(data.summary?.products || 0)} note="Catalog footprint currently active in the CRM." tone="violet" />
            <MetricCard icon="security" label="Super Admin Safety" value={data.safety?.can_create_more ? "Healthy" : "At limit"} note={`Current seats: ${data.safety?.super_admin_count || 0}/${data.safety?.max_super_admins || 0}`} tone="amber" />
          </MetricGrid>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
            <Panel eyebrow="Delivery Defaults" title="Platform auth routing" description="Update the fallback login URL, email subjects, and sender identity used when tenant-specific settings are blank.">
              <form className="space-y-4" onSubmit={savePlatformDefaults}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Default login URL</span>
                    <input className={INPUT_CLASS} value={draft.login_url} onChange={(event) => setDraft((current) => ({ ...current, login_url: event.target.value }))} placeholder="https://crm.greencall.in/login" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Credential subject</span>
                    <input className={INPUT_CLASS} value={draft.credentials_subject} onChange={(event) => setDraft((current) => ({ ...current, credentials_subject: event.target.value }))} placeholder="Welcome to GreenCRM" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Credential heading</span>
                    <input className={INPUT_CLASS} value={draft.credentials_heading} onChange={(event) => setDraft((current) => ({ ...current, credentials_heading: event.target.value }))} placeholder="Your account is ready" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Password reset subject</span>
                    <input className={INPUT_CLASS} value={draft.reset_subject} onChange={(event) => setDraft((current) => ({ ...current, reset_subject: event.target.value }))} placeholder="Reset your workspace password" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Default from email</span>
                    <input className={INPUT_CLASS} value={draft.smtp_from_email} onChange={(event) => setDraft((current) => ({ ...current, smtp_from_email: event.target.value }))} placeholder="crm@greencall.in" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Default from name</span>
                    <input className={INPUT_CLASS} value={draft.smtp_from_name} onChange={(event) => setDraft((current) => ({ ...current, smtp_from_name: event.target.value }))} placeholder="GreenCRM" />
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Default reply-to</span>
                  <input className={INPUT_CLASS} value={draft.smtp_reply_to} onChange={(event) => setDraft((current) => ({ ...current, smtp_reply_to: event.target.value }))} placeholder="support@greencall.in" />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Credential note</span>
                  <textarea className={TEXTAREA_CLASS} value={draft.credentials_note} onChange={(event) => setDraft((current) => ({ ...current, credentials_note: event.target.value }))} rows={4} placeholder="Please sign in and change this temporary password immediately." />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save Platform Defaults"}
                  </button>
                  <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setDraft(buildPlatformDraft(data.platform))}>
                    Reset Draft
                  </button>
                </div>
              </form>
            </Panel>

            <div className="space-y-6">
              <Panel eyebrow="Preview" title="Current fallback output" description="A quick readout of the values new invites and resets will inherit when a tenant has not saved its own copy.">
                <div className="space-y-3">
                  <div className={SUB_PANEL_CLASS}>
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Login URL</span>
                    <p className="mt-2 text-sm text-slate-700">{draft.login_url || "frontend env fallback"}</p>
                  </div>
                  <div className={SUB_PANEL_CLASS}>
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">From Identity</span>
                    <p className="mt-2 text-sm text-slate-700">{draft.smtp_from_name || "GreenCRM"} | {draft.smtp_from_email || "env fallback"}</p>
                  </div>
                  <div className={SUB_PANEL_CLASS}>
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Reply-to</span>
                    <p className="mt-2 text-sm text-slate-700">{draft.smtp_reply_to || "No explicit reply-to set"}</p>
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          <CommunicationSettingsSection
            companyId="platform-root"
            token={session?.token}
            title="Shared provider infrastructure"
            description="This is the platform-level credential vault used when companies are approved for shared calling, WhatsApp, SMS, or attendance policies."
            canEditIntegrations
            platformRoot
          />
        </div>
      ) : null}
    </>
  );
}
