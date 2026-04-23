"use client";

import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../lib/api";
import CommunicationSettingsSection from "../integrations/CommunicationSettingsSection";
import CompanyRoleControlPanel from "./company-roles/CompanyRoleControlPanel";
import TenantCapabilityGuide from "./TenantCapabilityGuide";
import { describeSmtp } from "../../app/super-admin/companies/company-utils";
import { ACCESS_FEATURES, ACCESS_PRESETS } from "../../app/super-admin/companies/company-config";
import {
  buildAccessState,
  buildCreateCompanyPayload,
  buildSettingsDraft,
  buildSettingsPayload,
  countLimitRoles,
  createCompanyForm,
  getCompanyMetrics,
  getEnabledFeatureCount,
  getStatusClasses,
  normalizeCompanies,
} from "../../app/super-admin/companies/company-utils";
import {
  AccessSection,
  CompanyDirectorySection,
  ControlNotesCard,
  CreateCompanySection,
  NoticeBanner,
  PageFrame,
  TenantSettingsSection,
} from "../../app/super-admin/companies/company-ui";
import { Badge, MetricCard, MetricGrid, Notice, PageIntro } from "./ui";
import { formatNumber, titleize } from "./format";

export default function PlatformCompaniesContent({ session, data, error, loading, refresh }) {
  const role = session?.user?.role || "";
  const canCreateCompany = role === "super-admin";
  const canManageTenant = ["super-admin", "platform-admin"].includes(role);
  const canManageRoles = role === "super-admin";
  const [form, setForm] = useState(createCompanyForm);
  const [createNotice, setCreateNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [accessDraft, setAccessDraft] = useState(() => buildAccessState());
  const [settingsDraft, setSettingsDraft] = useState(() => buildSettingsDraft(null));
  const [accessNotice, setAccessNotice] = useState(null);
  const [settingsNotice, setSettingsNotice] = useState(null);
  const [savingAccess, setSavingAccess] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const companies = data.companies?.items || [];
  const normalizedCompanies = useMemo(() => normalizeCompanies(companies), [companies]);
  const selectedCompany = useMemo(
    () => normalizedCompanies.find((company) => company.company_id === selectedCompanyId) || normalizedCompanies[0] || null,
    [normalizedCompanies, selectedCompanyId]
  );
  const companyMetrics = useMemo(() => getCompanyMetrics(normalizedCompanies), [normalizedCompanies]);
  const activeCompanies = normalizedCompanies.filter((company) => company.status === "active").length;
  const trialCompanies = normalizedCompanies.filter((company) => company.status === "trial").length;
  const suspendedCompanies = normalizedCompanies.filter((company) => company.status === "suspended").length;
  const selectedCompanyName = settingsDraft.name || selectedCompany?.name || "No tenant selected";
  const selectedFeatureCount = selectedCompany ? getEnabledFeatureCount(accessDraft) : 0;
  const selectedLimitCount = countLimitRoles(settingsDraft.staff_limits);
  const selectedStatusStyle = getStatusClasses(settingsDraft.status || selectedCompany?.status);
  const tenantSmtpCount = normalizedCompanies.filter((company) => describeSmtp(company) === "Tenant SMTP").length;

  useEffect(() => {
    if (!normalizedCompanies.length) {
      setSelectedCompanyId("");
      return;
    }
    if (!normalizedCompanies.some((company) => company.company_id === selectedCompanyId)) {
      setSelectedCompanyId(normalizedCompanies[0].company_id);
    }
  }, [normalizedCompanies, selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompany) {
      setAccessDraft(buildAccessState());
      setSettingsDraft(buildSettingsDraft(null));
      setAccessNotice(null);
      setSettingsNotice(null);
      return;
    }
    setAccessDraft(buildAccessState(selectedCompany.service_access));
    setSettingsDraft(buildSettingsDraft(selectedCompany));
    setAccessNotice(null);
    setSettingsNotice(null);
  }, [selectedCompany]);

  function updateCreateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setCreateNotice(null);
  }

  async function handleCreateCompany(event) {
    event.preventDefault();
    if (!canCreateCompany) return;
    setSubmitting(true);
    setCreateNotice(null);

    try {
      const response = await apiRequest("/companies", {
        method: "POST",
        token: session.token,
        body: buildCreateCompanyPayload(form),
      });

      const deliveryHint =
        response.credential_delivery?.delivery === "email"
          ? " Admin credentials email sent."
          : response.credential_delivery?.delivery === "queued"
            ? " Admin credentials email is sending in background."
            : response.credential_delivery?.preview_login_url
              ? ` Preview login URL: ${response.credential_delivery.preview_login_url}`
              : "";

      setCreateNotice({
        tone: "success",
        text: response.admin_temporary_password
          ? `Company created. Admin temporary password: ${response.admin_temporary_password}.${deliveryHint}`
          : `Company created successfully.${deliveryHint}`,
      });

      if (response.company?.company_id) {
        setSelectedCompanyId(response.company.company_id);
      }

      setForm(createCompanyForm());
      await refresh();
    } catch (requestError) {
      setCreateNotice({ tone: "error", text: requestError.message });
    } finally {
      setSubmitting(false);
    }
  }

  function toggleFeature(featureKey) {
    const feature = ACCESS_FEATURES.find((item) => item.key === featureKey);
    if (!canManageTenant || feature?.mandatory) return;
    setAccessDraft((current) => ({ ...current, [featureKey]: !current[featureKey] }));
    setAccessNotice(null);
  }

  function applyPreset(presetName) {
    if (!canManageTenant) return;
    setAccessDraft({ ...(ACCESS_PRESETS[presetName] || ACCESS_PRESETS.full) });
    setAccessNotice(null);
  }

  async function handleSaveAccess() {
    if (!selectedCompany || !canManageTenant) return;
    setSavingAccess(true);
    setAccessNotice(null);

    try {
      await apiRequest(`/companies/${selectedCompany.company_id}`, {
        method: "PUT",
        token: session.token,
        body: { service_access: accessDraft },
      });
      setAccessNotice({ tone: "success", text: "Access rules updated successfully." });
      await refresh();
    } catch (requestError) {
      setAccessNotice({ tone: "error", text: requestError.message });
    } finally {
      setSavingAccess(false);
    }
  }

  function updateSettingsField(key, value) {
    setSettingsDraft((current) => ({ ...current, [key]: value }));
    setSettingsNotice(null);
  }

  function updateLimitField(limitRole, value) {
    setSettingsDraft((current) => ({ ...current, staff_limits: { ...current.staff_limits, [limitRole]: value } }));
    setSettingsNotice(null);
  }

  async function handleSaveCompanySettings() {
    if (!selectedCompany || !canManageTenant) return;
    setSavingSettings(true);
    setSettingsNotice(null);

    try {
      await apiRequest(`/companies/${selectedCompany.company_id}`, {
        method: "PUT",
        token: session.token,
        body: buildSettingsPayload(settingsDraft),
      });
      setSettingsDraft((current) => ({ ...current, smtp_password: "" }));
      setSettingsNotice({ tone: "success", text: "Tenant email and staff settings updated." });
      await refresh();
    } catch (requestError) {
      setSettingsNotice({ tone: "error", text: requestError.message });
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSendTestEmail() {
    if (!selectedCompany || !settingsDraft.test_email_to.trim() || !canManageTenant) return;
    setTestingEmail(true);
    setSettingsNotice(null);

    try {
      const response = await apiRequest("/communications/test-email", {
        method: "POST",
        token: session.token,
        body: { company_id: selectedCompany.company_id, to: settingsDraft.test_email_to.trim() },
      });

      setSettingsNotice({
        tone: response.delivery?.delivery === "email" ? "success" : "info",
        text: response.delivery?.delivery === "email" ? "SMTP test email sent successfully." : "SMTP test fell back to preview mode. Check backend SMTP routing.",
      });
    } catch (requestError) {
      setSettingsNotice({ tone: "error", text: requestError.message });
    } finally {
      setTestingEmail(false);
    }
  }

  return (
    <>
      <Notice tone="error" text={error} className="mb-4" />
      {loading ? <Notice tone="info" text="Loading tenant directory..." className="mb-4" /> : null}

      {!loading ? (
        <div className="space-y-6">
          <PageIntro
            eyebrow="Tenant Directory"
            title="Platform oversight for every workspace"
            description="Review workspace health, create new tenants, tune service access, and fix delivery or seat-limit issues without dropping into tenant views."
            meta={
              <>
                <Badge tone="slate">{titleize(role)} view</Badge>
                <Badge tone="emerald">{formatNumber(activeCompanies)} active</Badge>
                <Badge tone="amber">{formatNumber(trialCompanies)} trial</Badge>
                <Badge tone="rose">{formatNumber(suspendedCompanies)} suspended</Badge>
              </>
            }
          />

          <MetricGrid className="2xl:grid-cols-4">
            <MetricCard icon="company" label="Visible tenants" value={formatNumber(companyMetrics.total)} note="Every company visible from this platform seat." tone="emerald" />
            <MetricCard icon="settings" label="Tenant SMTP" value={formatNumber(tenantSmtpCount)} note={`${formatNumber(companyMetrics.total - tenantSmtpCount)} still inherit platform delivery.`} tone="blue" />
            <MetricCard icon="users" label="Enabled modules" value={formatNumber(normalizedCompanies.reduce((total, company) => total + getEnabledFeatureCount(company.access), 0))} note="Module footprint across currently loaded tenants." tone="violet" />
            <MetricCard icon="security" label="Selected workspace" value={selectedCompanyName} note={selectedCompany ? `${selectedFeatureCount} modules on | ${selectedLimitCount || "Open"} seat limits` : "Select a workspace to review settings."} tone="amber" />
          </MetricGrid>

          {createNotice ? <NoticeBanner notice={createNotice} /> : null}

          <PageFrame>
            <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_340px]">
              <CompanyDirectorySection
                companies={normalizedCompanies}
                metrics={companyMetrics}
                selectedCompany={selectedCompany}
                selectedCompanyName={selectedCompanyName}
                selectedStatusStyle={selectedStatusStyle}
                selectedFeatureCount={selectedFeatureCount}
                selectedLimitCount={selectedLimitCount}
                settingsDraft={settingsDraft}
                onSelectCompany={setSelectedCompanyId}
              />
              <ControlNotesCard />
            </section>

            <section className="grid gap-6 2xl:grid-cols-2">
              <CreateCompanySection canCreateCompany={canCreateCompany} form={form} onFieldChange={updateCreateField} onSubmit={handleCreateCompany} submitting={submitting} />
              <AccessSection
                selectedCompany={selectedCompany}
                selectedCompanyName={selectedCompanyName}
                selectedFeatureCount={selectedFeatureCount}
                canManageTenant={canManageTenant}
                accessDraft={accessDraft}
                accessNotice={accessNotice}
                onApplyPreset={applyPreset}
                onToggleFeature={toggleFeature}
                onSave={handleSaveAccess}
                savingAccess={savingAccess}
              />
            </section>

            {selectedCompany ? (
              <>
                <TenantCapabilityGuide />
                <TenantSettingsSection
                  selectedCompany={selectedCompany}
                  selectedCompanyName={selectedCompanyName}
                  canManageTenant={canManageTenant}
                  settingsDraft={settingsDraft}
                  settingsNotice={settingsNotice}
                  onFieldChange={updateSettingsField}
                  onLimitChange={updateLimitField}
                  onSave={handleSaveCompanySettings}
                  onSendTestEmail={handleSendTestEmail}
                  savingSettings={savingSettings}
                  testingEmail={testingEmail}
                />
                <CommunicationSettingsSection
                  companyId={selectedCompany.company_id}
                  token={session?.token}
                  title="Managed services, provider routing, and capability resolution"
                  description="Tenant modules can stay visible even when paid services are blocked. Backend rules resolve own credentials first and superadmin-approved platform services second."
                  canEditIntegrations={canManageTenant}
                  canEditPermissions={role === "super-admin" && selectedCompany.company_id !== "platform-root"}
                  platformRoot={selectedCompany.company_id === "platform-root"}
                />
                <CompanyRoleControlPanel companyId={selectedCompany.company_id} companyName={selectedCompany.name} token={session?.token} canManage={canManageRoles} />
              </>
            ) : null}
          </PageFrame>
        </div>
      ) : null}
    </>
  );
}
