"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../lib/api";
import { ACCESS_FEATURES, ACCESS_PRESETS, PLAN_OPTIONS, ROLE_LIMIT_FIELDS, planOf } from "../../app/super-admin/companies/company-config";
import { buildAccessState, buildCreateCompanyPayload, buildSettingsDraft, buildSettingsPayload, createCompanyForm, getCompanyMetrics, normalizeCompanies } from "../../app/super-admin/companies/company-utils";
import CompanyDrawer from "./companies/CompanyDrawer";
import CompanyList from "./companies/CompanyList";
import CreateCompanyDrawer from "./companies/CreateCompanyDrawer";
import { formatNumber } from "./format";
import { MetricCard, Notice, PageIntro, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "./ui";

/** Platform Companies: every tenant in a table; open one to change its plan, modules, settings and roles. */
export default function PlatformCompaniesContent({ session, data, error, loading, refresh }) {
  const role = session?.user?.role || "";
  const canCreate = role === "super-admin";
  const canManage = ["super-admin", "platform-admin"].includes(role);
  const [form, setForm] = useState(createCompanyForm);
  const [createOpen, setCreateOpen] = useState(false);
  const [createNotice, setCreateNotice] = useState(null);
  const [pageNotice, setPageNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [openId, setOpenId] = useState("");
  const [accessDraft, setAccessDraft] = useState(() => buildAccessState());
  const [settingsDraft, setSettingsDraft] = useState(() => buildSettingsDraft(null));
  const [accessNotice, setAccessNotice] = useState(null);
  const [settingsNotice, setSettingsNotice] = useState(null);
  const [overviewNotice, setOverviewNotice] = useState(null);
  const [savingAccess, setSavingAccess] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  const companies = useMemo(() => normalizeCompanies(data.companies?.items || []), [data.companies]);
  const selected = useMemo(() => companies.find((c) => c.company_id === openId) || null, [companies, openId]);
  const metrics = useMemo(() => getCompanyMetrics(companies), [companies]);
  const counts = useMemo(() => ({
    active: companies.filter((c) => c.status === "active").length,
    trial: companies.filter((c) => c.status === "trial").length,
    suspended: companies.filter((c) => c.status === "suspended").length,
    tracking: companies.filter((c) => planOf(c.access) === "tracking").length,
    developer: companies.filter((c) => c.access.developer_api).length,
  }), [companies]);

  useEffect(() => {
    if (!selected) return;
    setAccessDraft(buildAccessState(selected.service_access));
    setSettingsDraft(buildSettingsDraft(selected));
    setAccessNotice(null);
    setSettingsNotice(null);
  }, [selected]);

  const put = (body) => apiRequest(`/companies/${selected.company_id}`, { method: "PUT", token: session.token, body });

  async function handleCreate(e) {
    e.preventDefault();
    if (!canCreate) return;
    setSubmitting(true);
    setCreateNotice(null);
    try {
      const r = await apiRequest("/companies", { method: "POST", token: session.token, body: buildCreateCompanyPayload(form) });
      const hint = r.credential_delivery?.delivery === "email" ? " Login details were emailed to the admin." : r.admin_temporary_password ? ` Admin password: ${r.admin_temporary_password}` : "";
      setPageNotice({ tone: "success", text: `${r.company?.name || "Company"} created on ${PLAN_OPTIONS.find((p) => p.key === form.plan)?.label || "Full CRM"}.${hint}` });
      setForm(createCompanyForm());
      setCreateOpen(false);
      await refresh();
      if (r.company?.company_id) setOpenId(r.company.company_id);
    } catch (err) {
      setCreateNotice({ tone: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function changePlan(planKey) {
    const plan = PLAN_OPTIONS.find((p) => p.key === planKey);
    const text = planKey === "full"
      ? `Upgrade ${selected.name} to Full CRM? Every module turns on and seat limits are removed. Their tracking data stays.`
      : `Switch ${selected.name} to Tracking only? CRM screens are hidden (data is kept) and seats become 1 admin, 1 manager, 1 sales.`;
    if (!window.confirm(text)) return;
    setBusy(true);
    setOverviewNotice(null);
    try {
      const staff = ROLE_LIMIT_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: plan.seats ? plan.seats[f.key] ?? 0 : null }), {});
      await put({ service_access: { ...accessDraft, ...ACCESS_PRESETS[planKey] }, staff_limits: staff });
      setOverviewNotice({ tone: "success", text: `${selected.name} is now on ${plan.label}.` });
      await refresh();
    } catch (err) {
      setOverviewNotice({ tone: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus() {
    const next = selected.status === "suspended" ? "active" : "suspended";
    if (!window.confirm(`${next === "suspended" ? "Suspend" : "Activate"} ${selected.name}?`)) return;
    setBusy(true);
    setOverviewNotice(null);
    try {
      await put({ status: next });
      setOverviewNotice({ tone: "success", text: `${selected.name} is now ${next}.` });
      await refresh();
    } catch (err) {
      setOverviewNotice({ tone: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  function toggleFeature(k) {
    const f = ACCESS_FEATURES.find((i) => i.key === k);
    if (!canManage || f?.mandatory || (f?.superAdminOnly && role !== "super-admin")) return;
    setAccessDraft((d) => ({ ...d, [k]: !d[k] }));
    setAccessNotice(null);
  }

  async function saveAccess() {
    setSavingAccess(true);
    setAccessNotice(null);
    try { await put({ service_access: accessDraft }); setAccessNotice({ tone: "success", text: "Modules saved." }); await refresh(); }
    catch (err) { setAccessNotice({ tone: "error", text: err.message }); } finally { setSavingAccess(false); }
  }

  async function saveSettings() {
    setSavingSettings(true);
    setSettingsNotice(null);
    try { await put(buildSettingsPayload(settingsDraft)); setSettingsDraft((d) => ({ ...d, smtp_password: "" })); setSettingsNotice({ tone: "success", text: "Settings saved." }); await refresh(); }
    catch (err) { setSettingsNotice({ tone: "error", text: err.message }); } finally { setSavingSettings(false); }
  }

  async function testEmail() {
    if (!settingsDraft.test_email_to.trim()) return;
    setTestingEmail(true);
    setSettingsNotice(null);
    try {
      const r = await apiRequest("/communications/test-email", { method: "POST", token: session.token, body: { company_id: selected.company_id, to: settingsDraft.test_email_to.trim() } });
      setSettingsNotice({ tone: r.delivery?.delivery === "email" ? "success" : "info", text: r.delivery?.delivery === "email" ? "Test email sent." : "Mail is not set up, so it was only previewed." });
    } catch (err) { setSettingsNotice({ tone: "error", text: err.message }); } finally { setTestingEmail(false); }
  }

  if (loading) return <Notice tone="info" text="Loading companies…" />;

  return (
    <div className="tw-buttons min-w-0 space-y-4 pb-10">
      <PageIntro title="Companies" description="Every company on GreenCRM. Open one to change its plan, modules, mail, seats and roles."
        actions={<>
          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={refresh}>Refresh</button>
          {canCreate ? <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => { setCreateNotice(null); setCreateOpen(true); }}>+ New company</button> : null}
        </>} />
      <Notice tone="error" text={error} />
      {pageNotice ? <Notice tone={pageNotice.tone} text={pageNotice.text} /> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Companies" value={formatNumber(metrics.total)} note={`${counts.active} active · ${counts.trial} trial`} tone="amber" />
        <MetricCard label="Suspended" value={formatNumber(counts.suspended)} note="Cannot sign in" tone="rose" />
        <MetricCard label="Tracking only" value={formatNumber(counts.tracking)} note="On the tracking plan" tone="violet" />
        <MetricCard label="Developer API" value={formatNumber(counts.developer)} note="Switched on" tone="teal" />
        <MetricCard label="Own mail server" value={formatNumber(metrics.smtpReady)} note="Others use GreenCRM mail" tone="blue" />
        <MetricCard label="Seat limits" value={formatNumber(metrics.seatPolicies)} note={`${metrics.customLogin} with own login link`} tone="emerald" />
      </div>

      <CompanyList companies={companies} selectedId={openId} onOpen={setOpenId} />

      <CreateCompanyDrawer open={createOpen} onClose={() => setCreateOpen(false)} form={form} notice={createNotice} submitting={submitting} onSubmit={handleCreate}
        onFieldChange={(k, v) => { setForm((f) => ({ ...f, [k]: v })); setCreateNotice(null); }} />
      <CompanyDrawer company={selected} onClose={() => { setOpenId(""); setOverviewNotice(null); }} session={session} role={role} busy={busy} notice={overviewNotice}
        access={{ draft: accessDraft, notice: accessNotice, saving: savingAccess }}
        settings={{ draft: settingsDraft, notice: settingsNotice, saving: savingSettings, testing: testingEmail }}
        actions={{
          changePlan, toggleStatus, toggleFeature, saveAccess, saveSettings, testEmail,
          applyPreset: (p) => { if (canManage) { setAccessDraft((d) => ({ ...d, ...(ACCESS_PRESETS[p] || ACCESS_PRESETS.full) })); setAccessNotice(null); } },
          settingsField: (k, v) => { setSettingsDraft((d) => ({ ...d, [k]: v })); setSettingsNotice(null); },
          limitField: (k, v) => { setSettingsDraft((d) => ({ ...d, staff_limits: { ...d.staff_limits, [k]: v } })); setSettingsNotice(null); },
        }} />
    </div>
  );
}
