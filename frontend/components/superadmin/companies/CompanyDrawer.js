"use client";

import { useEffect, useState } from "react";
import SideDrawer from "../../ui/SideDrawer";
import CommunicationSettingsSection from "../../integrations/CommunicationSettingsSection";
import CompanyRoleControlPanel from "../company-roles/CompanyRoleControlPanel";
import { ACCESS_FEATURES, ROLE_LIMIT_FIELDS, planOf } from "../../../app/super-admin/companies/company-config";
import { AccessSection, TenantSettingsSection } from "../../../app/super-admin/companies/company-ui";
import { avatar, describeSmtp, getEnabledFeatureCount } from "../../../app/super-admin/companies/company-utils";
import { formatDate } from "../format";
import { Badge, Notice, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "../ui";
import { PLAN_LABEL, PLAN_TONE } from "./CompanyList";

const TABS = [["overview", "Overview"], ["modules", "Modules"], ["settings", "Settings"], ["channels", "Channels"], ["roles", "Roles"]];

function Fact({ label, value }) {
  return <div className="rounded-[12px] bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100"><p className="text-[11px] text-slate-500">{label}</p><p className="truncate text-[14px] font-bold text-slate-900">{value}</p></div>;
}

function Overview({ company, settingsDraft, onChangePlan, onToggleStatus, busy, notice, canManage }) {
  const plan = planOf(company.access);
  const limits = ROLE_LIMIT_FIELDS.filter((f) => settingsDraft.staff_limits?.[f.key] !== "" && settingsDraft.staff_limits?.[f.key] !== undefined);
  return (
    <div className="space-y-4">
      <Notice tone={notice?.tone} text={notice?.text} />
      <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Plan</p>
            <p className="mt-1 flex items-center gap-2 text-[17px] font-bold text-slate-900">{PLAN_LABEL[plan]} <Badge tone={PLAN_TONE[plan]}>{getEnabledFeatureCount(company.access)}/{ACCESS_FEATURES.length} modules</Badge></p>
            <p className="mt-0.5 text-[12.5px] text-slate-500">{plan === "tracking" ? "Live tracking and attendance only. No CRM screens." : plan === "full" ? "Every CRM module is on." : "Modules were picked one by one."}</p>
          </div>
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              {plan !== "full" ? <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={busy} onClick={() => onChangePlan("full")}>Upgrade to Full CRM</button> : null}
              {plan !== "tracking" ? <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={busy} onClick={() => onChangePlan("tracking")}>Switch to Tracking only</button> : null}
            </div>
          ) : null}
        </div>
        <p className="mt-3 rounded-[10px] bg-slate-50 px-3 py-2 text-[12px] text-slate-500 ring-1 ring-slate-100">Changing the plan only switches screens on or off and sets seat limits. Leads, tracking history and users are never deleted.</p>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact label="Status" value={company.status || "trial"} />
        <Fact label="Email from" value={describeSmtp(settingsDraft)} />
        <Fact label="Currency" value={settingsDraft.settings_currency || "INR"} />
        <Fact label="Since" value={formatDate(company.created_at)} />
      </div>

      <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
        <p className="text-[13.5px] font-bold text-slate-900">Seats</p>
        {limits.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">{limits.map((f) => <Badge key={f.key} tone={Number(settingsDraft.staff_limits[f.key]) ? "teal" : "slate"}>{f.label}: {settingsDraft.staff_limits[f.key]}</Badge>)}</div>
        ) : <p className="mt-1 text-[12.5px] text-slate-500">No limit on any role.</p>}
        <p className="mt-2 text-[12px] text-slate-500">Change these in Settings → Staff limits.</p>
      </section>

      <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
        <p className="text-[13.5px] font-bold text-slate-900">Contact</p>
        <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-[12.5px] sm:grid-cols-2">
          {[["Admin email", company.admin_email], ["Contact email", company.contact_email], ["Phone", company.contact_phone], ["Industry", company.industry], ["Website", company.website], ["Company ID", company.company_id]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="truncate font-semibold text-slate-800">{v || "–"}</dd></div>
          ))}
        </dl>
      </section>

      {canManage ? (
        <section className={`rounded-[14px] p-4 ring-1 ${company.status === "suspended" ? "bg-emerald-50 ring-emerald-100" : "bg-rose-50 ring-rose-100"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13.5px] font-bold text-slate-900">{company.status === "suspended" ? "This company is suspended" : "Suspend this company"}</p>
              <p className="text-[12px] text-slate-600">{company.status === "suspended" ? "Nobody can sign in. Activate it to let them back in." : "Everyone in the company is signed out and cannot sign in. Data stays."}</p>
            </div>
            <button type="button" disabled={busy} onClick={onToggleStatus} className={company.status === "suspended" ? PRIMARY_BUTTON_CLASS : "inline-flex h-9 items-center rounded-[10px] bg-white px-3.5 text-[13px] font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50"}>
              {company.status === "suspended" ? "Activate" : "Suspend"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** One company: plan, modules, settings, channels and roles, in tabs. */
export default function CompanyDrawer({ company, onClose, session, role, access, settings, actions, busy, notice }) {
  const [tab, setTab] = useState("overview");
  useEffect(() => { setTab("overview"); }, [company?.company_id]);
  if (!company) return null;
  const canManage = ["super-admin", "platform-admin"].includes(role);
  const plan = planOf(company.access);

  return (
    <SideDrawer open={Boolean(company)} onClose={onClose} width="max-w-[860px]"
      title={<span className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-brand-700 text-[11px] font-bold text-white">{avatar(company.name)}</span>{company.name}</span>}
      subtitle={<span className="flex flex-wrap items-center gap-1.5">{company.slug} · <Badge tone={PLAN_TONE[plan]}>{PLAN_LABEL[plan]}</Badge><Badge tone={company.status === "active" ? "emerald" : company.status === "suspended" ? "rose" : "amber"}>{company.status || "trial"}</Badge></span>}>
      <div className="space-y-4">
        <div className="flex gap-1 overflow-x-auto rounded-[12px] bg-slate-100 p-1 [scrollbar-width:none]">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={tab === key}
              className={`shrink-0 rounded-[9px] px-3 py-1.5 text-[13px] font-semibold transition ${tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>
          ))}
        </div>
        {tab === "overview" ? <Overview company={company} settingsDraft={settings.draft} onChangePlan={actions.changePlan} onToggleStatus={actions.toggleStatus} busy={busy} notice={notice} canManage={canManage} /> : null}
        {tab === "modules" ? (
          <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
            <AccessSection selectedCompany={company} selectedCompanyName={company.name} selectedFeatureCount={getEnabledFeatureCount(access.draft)} canManageTenant={canManage} accessDraft={access.draft}
              accessNotice={access.notice} onApplyPreset={actions.applyPreset} onToggleFeature={actions.toggleFeature} onSave={actions.saveAccess} savingAccess={access.saving} />
          </section>
        ) : null}
        {tab === "settings" ? (
          <TenantSettingsSection selectedCompany={company} selectedCompanyName={company.name} canManageTenant={canManage} settingsDraft={settings.draft} settingsNotice={settings.notice}
            onFieldChange={actions.settingsField} onLimitChange={actions.limitField} onSave={actions.saveSettings} onSendTestEmail={actions.testEmail} savingSettings={settings.saving} testingEmail={settings.testing} />
        ) : null}
        {tab === "channels" ? (
          <CommunicationSettingsSection companyId={company.company_id} token={session?.token} title="Provider routing & capability" canEditIntegrations={canManage}
            canEditPermissions={role === "super-admin" && company.company_id !== "platform-root"} platformRoot={company.company_id === "platform-root"} />
        ) : null}
        {tab === "roles" ? <CompanyRoleControlPanel companyId={company.company_id} companyName={company.name} token={session?.token} canManage={role === "super-admin"} /> : null}
      </div>
    </SideDrawer>
  );
}
