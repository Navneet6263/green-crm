"use client";

import DashboardIcon from "../dashboard/icons";
import AttendanceSettingsCard from "./AttendanceSettingsCard";
import CallSettingsCard from "./CallSettingsCard";
import CapabilityOverview from "./CapabilityOverview";
import PlatformAccessPanel from "./PlatformAccessPanel";
import SmsSettingsCard from "./SmsSettingsCard";
import WhatsAppSettingsCard from "./WhatsAppSettingsCard";
import { PANEL_CLASS, PRIMARY_BUTTON_CLASS } from "./constants";
import { useCommunicationSettings } from "./useCommunicationSettings";

export default function CommunicationSettingsSection({
  companyId,
  token,
  title,
  description,
  canEditIntegrations,
  canEditPermissions = false,
  platformRoot = false,
}) {
  const settings = useCommunicationSettings({
    companyId,
    token,
    enabled: Boolean(companyId && token),
    canEditPermissions,
  });

  if (!companyId) {
    return null;
  }

  const platformChannels = Object.values(settings.draft.integrations || {})
    .filter((item) => item?.mode === "platform_credentials")
    .map((item) => item.channel);

  return (
    <article className={PANEL_CLASS}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700/80">Channel Capability</span>
          <h2 className="mt-2 text-[clamp(1.35rem,1.8vw,1.9rem)] font-black leading-tight text-slate-900">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <strong className="block text-slate-900">Company</strong>
          <span>{companyId}</span>
        </div>
      </div>

      {settings.error ? <div className="mt-5 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{settings.error}</div> : null}
      {settings.message ? <div className="mt-5 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{settings.message}</div> : null}
      {settings.loading ? <div className="mt-5 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">Loading communication settings...</div> : null}

      {!settings.loading ? (
        <div className="mt-6 space-y-5">
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
            Module Access decides whether a tenant sees Communications or Attendance in the sidebar. Channel Capability decides whether provider-backed actions are active once those modules are visible.
          </div>
          <CapabilityOverview capabilities={settings.draft.capabilities} />
          {settings.draft.permissions ? (
            <PlatformAccessPanel
              permissions={settings.draft.permissions}
              canEdit={canEditPermissions}
              onToggle={settings.togglePermission}
              platformChannels={platformChannels}
            />
          ) : null}
          <div className="grid gap-4 xl:grid-cols-2">
            <CallSettingsCard
              draft={settings.draft.integrations.call}
              capability={settings.draft.capabilities.call}
              canEdit={canEditIntegrations}
              showPermissionNote={!canEditPermissions}
              platformRoot={platformRoot}
              onChannelChange={(key, value) => settings.updateChannel("call", key, value)}
              onConfigChange={(key, value) => settings.updateConfig("call", key, value)}
            />
            <WhatsAppSettingsCard
              draft={settings.draft.integrations.whatsapp}
              capability={settings.draft.capabilities.whatsapp}
              canEdit={canEditIntegrations}
              showPermissionNote={!canEditPermissions}
              platformRoot={platformRoot}
              onChannelChange={(key, value) => settings.updateChannel("whatsapp", key, value)}
              onConfigChange={(key, value) => settings.updateConfig("whatsapp", key, value)}
            />
            <SmsSettingsCard
              draft={settings.draft.integrations.sms}
              capability={settings.draft.capabilities.sms}
              canEdit={canEditIntegrations}
              showPermissionNote={!canEditPermissions}
              platformRoot={platformRoot}
              onChannelChange={(key, value) => settings.updateChannel("sms", key, value)}
              onConfigChange={(key, value) => settings.updateConfig("sms", key, value)}
            />
            <AttendanceSettingsCard
              draft={settings.draft.integrations.attendance}
              capability={settings.draft.capabilities.attendance}
              canEdit={canEditIntegrations}
              showPermissionNote={!canEditPermissions}
              platformRoot={platformRoot}
              onChannelChange={(key, value) => settings.updateChannel("attendance", key, value)}
              onConfigChange={(key, value) => settings.updateConfig("attendance", key, value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm leading-6 text-slate-600">
              Provider credentials stay backend-side only. The frontend saves drafts through the secured company settings API and capabilities resolve from backend rules.
            </p>
            <button
              className={PRIMARY_BUTTON_CLASS}
              type="button"
              onClick={settings.save}
              disabled={settings.saving || (!canEditIntegrations && !canEditPermissions)}
            >
              <DashboardIcon name="settings" className="h-4 w-4" />
              {settings.saving ? "Saving..." : "Save Channel Capability"}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
