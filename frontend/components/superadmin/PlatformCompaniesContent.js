"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../lib/api";
import CommunicationSettingsSection from "../integrations/CommunicationSettingsSection";
import CompanyRoleControlPanel from "./company-roles/CompanyRoleControlPanel";
import TenantCapabilityGuide from "./TenantCapabilityGuide";
import { ACCESS_FEATURES } from "../../app/super-admin/companies/company-config";
import { buildAccessState, buildCreateCompanyPayload, buildSettingsDraft, buildSettingsPayload, countLimitRoles, createCompanyForm, getCompanyMetrics, getEnabledFeatureCount, normalizeCompanies } from "../../app/super-admin/companies/company-utils";
import { AccessSection, CompanyDirectorySection, ControlNotesCard, CreateCompanySection, NoticeBanner, TenantSettingsSection } from "../../app/super-admin/companies/company-ui";
import { Badge, MetricCard, MetricGrid, Notice, PageIntro, SECONDARY_BUTTON_CLASS } from "./ui";
import { formatNumber, titleize } from "./format";

function Section({ title, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-slate-100 bg-white">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition rounded-2xl">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-slate-900">{title}</span>
          {badge ? <Badge tone="slate">{badge}</Badge> : null}
        </div>
        <svg className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open ? <div className="border-t border-slate-100 px-5 py-4">{children}</div> : null}
    </div>
  );
}

export default function PlatformCompaniesContent({ session, data, error, loading, refresh }) {
  const role = session?.user?.role || "";
  const canCreate = role === "super-admin";
  const canManage = ["super-admin", "platform-admin"].includes(role);
  const canRoles = role === "super-admin";
  const [form, setForm] = useState(createCompanyForm);
  const [createNotice, setCreateNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [accessDraft, setAccessDraft] = useState(() => buildAccessState());
  const [settingsDraft, setSettingsDraft] = useState(() => buildSettingsDraft(null));
  const [accessNotice, setAccessNotice] = useState(null);
  const [settingsNotice, setSettingsNotice] = useState(null);
  const [savingAccess, setSavingAccess] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const companies = useMemo(() => normalizeCompanies(data.companies?.items || []), [data.companies]);
  const selected = useMemo(() => companies.find(c => c.company_id === selectedId) || companies[0] || null, [companies, selectedId]);
  const metrics = useMemo(() => getCompanyMetrics(companies), [companies]);

  useEffect(() => { if (companies.length && !companies.some(c => c.company_id === selectedId)) setSelectedId(companies[0]?.company_id || ""); }, [companies, selectedId]);
  useEffect(() => { if (!selected) { setAccessDraft(buildAccessState()); setSettingsDraft(buildSettingsDraft(null)); return; } setAccessDraft(buildAccessState(selected.service_access)); setSettingsDraft(buildSettingsDraft(selected)); setAccessNotice(null); setSettingsNotice(null); }, [selected]);

  async function handleCreate(e) {
    e.preventDefault(); if (!canCreate) return;
    setSubmitting(true); setCreateNotice(null);
    try {
      const r = await apiRequest("/companies", { method: "POST", token: session.token, body: buildCreateCompanyPayload(form) });
      const hint = r.credential_delivery?.delivery === "email" ? " Credentials emailed." : r.admin_temporary_password ? ` Password: ${r.admin_temporary_password}` : "";
      setCreateNotice({ tone: "success", text: `Company created.${hint}` });
      if (r.company?.company_id) setSelectedId(r.company.company_id);
      setForm(createCompanyForm()); await refresh();
    } catch (err) { setCreateNotice({ tone: "error", text: err.message }); } finally { setSubmitting(false); }
  }

  function toggleFeature(k) { const f = ACCESS_FEATURES.find(i => i.key === k); if (!canManage || f?.mandatory) return; setAccessDraft(d => ({ ...d, [k]: !d[k] })); setAccessNotice(null); }
  function applyPreset(p) { if (!canManage) return; const { ACCESS_PRESETS } = require("../../app/super-admin/companies/company-config"); setAccessDraft({ ...(ACCESS_PRESETS[p] || ACCESS_PRESETS.full) }); setAccessNotice(null); }

  async function saveAccess() {
    if (!selected || !canManage) return; setSavingAccess(true); setAccessNotice(null);
    try { await apiRequest(`/companies/${selected.company_id}`, { method: "PUT", token: session.token, body: { service_access: accessDraft } }); setAccessNotice({ tone: "success", text: "Access updated." }); await refresh(); }
    catch (err) { setAccessNotice({ tone: "error", text: err.message }); } finally { setSavingAccess(false); }
  }

  async function saveSettings() {
    if (!selected || !canManage) return; setSavingSettings(true); setSettingsNotice(null);
    try { await apiRequest(`/companies/${selected.company_id}`, { method: "PUT", token: session.token, body: buildSettingsPayload(settingsDraft) }); setSettingsDraft(d => ({ ...d, smtp_password: "" })); setSettingsNotice({ tone: "success", text: "Settings saved." }); await refresh(); }
    catch (err) { setSettingsNotice({ tone: "error", text: err.message }); } finally { setSavingSettings(false); }
  }

  async function testEmail() {
    if (!selected || !settingsDraft.test_email_to.trim() || !canManage) return; setTestingEmail(true); setSettingsNotice(null);
    try { const r = await apiRequest("/communications/test-email", { method: "POST", token: session.token, body: { company_id: selected.company_id, to: settingsDraft.test_email_to.trim() } }); setSettingsNotice({ tone: r.delivery?.delivery === "email" ? "success" : "info", text: r.delivery?.delivery === "email" ? "Test email sent." : "Fell back to preview mode." }); }
    catch (err) { setSettingsNotice({ tone: "error", text: err.message }); } finally { setTestingEmail(false); }
  }

  if (loading) return <Notice tone="info" text="Loading tenants…" />;

  return (
    <div className="space-y-4">
      <Notice tone="error" text={error} />
      <PageIntro eyebrow="Tenants" title="Companies" meta={<><Badge tone="emerald">{formatNumber(metrics.active || 0)} active</Badge><Badge tone="amber">{formatNumber(metrics.trial || 0)} trial</Badge><Badge tone="rose">{formatNumber(metrics.suspended || 0)} suspended</Badge></>} />

      <MetricGrid className="lg:grid-cols-4">
        <MetricCard icon="company" label="Total" value={formatNumber(metrics.total)} tone="emerald" />
        <MetricCard icon="settings" label="SMTP" value={formatNumber(metrics.smtpReady)} tone="blue" />
        <MetricCard icon="security" label="Custom Login" value={formatNumber(metrics.customLogin)} tone="violet" />
        <MetricCard icon="users" label="Seat Policies" value={formatNumber(metrics.seatPolicies)} tone="amber" />
      </MetricGrid>

      {createNotice ? <NoticeBanner notice={createNotice} /> : null}

      {/* Directory — always open */}
      <Section title="Workspace Directory" badge={`${companies.length}`} defaultOpen>
        <CompanyDirectorySection companies={companies} metrics={metrics} selectedCompany={selected} selectedCompanyName={settingsDraft.name || selected?.name || "—"} selectedStatusStyle={require("../../app/super-admin/companies/company-utils").getStatusClasses(settingsDraft.status || selected?.status)} selectedFeatureCount={selected ? getEnabledFeatureCount(accessDraft) : 0} selectedLimitCount={countLimitRoles(settingsDraft.staff_limits)} settingsDraft={settingsDraft} onSelectCompany={setSelectedId} />
      </Section>

      <Section title="Create Company" badge={canCreate ? "Super Admin" : "Locked"}>
        <CreateCompanySection canCreateCompany={canCreate} form={form} onFieldChange={(k, v) => { setForm(f => ({ ...f, [k]: v })); setCreateNotice(null); }} onSubmit={handleCreate} submitting={submitting} />
      </Section>

      <Section title="Module Access" badge={selected ? `${getEnabledFeatureCount(accessDraft)}/${ACCESS_FEATURES.length}` : "—"}>
        <AccessSection selectedCompany={selected} selectedCompanyName={settingsDraft.name || selected?.name || "—"} selectedFeatureCount={selected ? getEnabledFeatureCount(accessDraft) : 0} canManageTenant={canManage} accessDraft={accessDraft} accessNotice={accessNotice} onApplyPreset={applyPreset} onToggleFeature={toggleFeature} onSave={saveAccess} savingAccess={savingAccess} />
      </Section>

      {selected ? (
        <>
          <Section title="Capability Guide"><TenantCapabilityGuide /></Section>
          <Section title="Tenant Settings">
            <TenantSettingsSection selectedCompany={selected} selectedCompanyName={settingsDraft.name || selected?.name || "—"} canManageTenant={canManage} settingsDraft={settingsDraft} settingsNotice={settingsNotice} onFieldChange={(k, v) => { setSettingsDraft(d => ({ ...d, [k]: v })); setSettingsNotice(null); }} onLimitChange={(k, v) => { setSettingsDraft(d => ({ ...d, staff_limits: { ...d.staff_limits, [k]: v } })); setSettingsNotice(null); }} onSave={saveSettings} onSendTestEmail={testEmail} savingSettings={savingSettings} testingEmail={testingEmail} />
          </Section>
          <Section title="Communication & Channels">
            <CommunicationSettingsSection companyId={selected.company_id} token={session?.token} title="Provider routing & capability" canEditIntegrations={canManage} canEditPermissions={role === "super-admin" && selected.company_id !== "platform-root"} platformRoot={selected.company_id === "platform-root"} />
          </Section>
          <Section title="Role Control">
            <CompanyRoleControlPanel companyId={selected.company_id} companyName={selected.name} token={session?.token} canManage={canRoles} />
          </Section>
        </>
      ) : null}
    </div>
  );
}
