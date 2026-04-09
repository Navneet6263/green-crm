"use client";

import { useEffect, useMemo, useState } from "react";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import { apiRequest } from "../../../lib/api";
import { ACCESS_FEATURES, ACCESS_PRESETS } from "./company-config";
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
} from "./company-utils";
import {
  AccessSection,
  CompanyDirectorySection,
  ControlNotesCard,
  CreateCompanySection,
  NoticeBanner,
  PageFrame,
  TenantSettingsSection,
} from "./company-ui";

function CompaniesContent({ session, data, error, loading, refresh }) {
  const role = session?.user?.role || "";
  const canCreateCompany = role === "super-admin";
  const canManageTenant = ["super-admin", "platform-admin"].includes(role);

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
  const selectedCompanyName = settingsDraft.name || selectedCompany?.name || "No tenant selected";
  const selectedFeatureCount = selectedCompany ? getEnabledFeatureCount(accessDraft) : 0;
  const selectedLimitCount = countLimitRoles(settingsDraft.staff_limits);
  const selectedStatusStyle = getStatusClasses(settingsDraft.status || selectedCompany?.status);

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
    setSettingsDraft((current) => ({
      ...current,
      staff_limits: { ...current.staff_limits, [limitRole]: value },
    }));
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
        body: {
          company_id: selectedCompany.company_id,
          to: settingsDraft.test_email_to.trim(),
        },
      });

      const sentByEmail = response.delivery?.delivery === "email";
      setSettingsNotice({
        tone: sentByEmail ? "success" : "info",
        text: sentByEmail
          ? "SMTP test email sent successfully."
          : "SMTP test fell back to preview mode. Check backend SMTP routing.",
      });
    } catch (requestError) {
      setSettingsNotice({ tone: "error", text: requestError.message });
    } finally {
      setTestingEmail(false);
    }
  }

  return (
    <>
      {error ? <NoticeBanner notice={{ tone: "error", text: error }} className="mb-4" /> : null}
      {loading ? <NoticeBanner notice={{ tone: "info", text: "Loading companies..." }} /> : null}

      {!loading ? (
        <PageFrame>
          {createNotice ? <NoticeBanner notice={createNotice} /> : null}

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
            <CreateCompanySection
              canCreateCompany={canCreateCompany}
              form={form}
              onFieldChange={updateCreateField}
              onSubmit={handleCreateCompany}
              submitting={submitting}
            />
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
          ) : null}
        </PageFrame>
      ) : null}
    </>
  );
}

export default function SuperAdminCompaniesPage() {
  return (
    <WorkspacePage
      title="Companies"
      eyebrow="Tenant Directory"
      allowedRoles={["super-admin", "platform-admin", "platform-manager"]}
      requestBuilder={() => [{ key: "companies", path: "/companies?page_size=20" }]}
      heroStats={({ data }) => {
        const companies = data.companies?.items || [];
        return [
          { label: "Tenants", value: companies.length },
          { label: "Active", value: companies.filter((company) => company.status === "active").length, color: "#16a34a" },
          { label: "Trial", value: companies.filter((company) => company.status === "trial").length, color: "#f59e0b" },
          { label: "Suspended", value: companies.filter((company) => company.status === "suspended").length, color: "#ef4444" },
        ];
      }}
    >
      {(props) => <CompaniesContent {...props} />}
    </WorkspacePage>
  );
}
