import AllowedIpListEditor from "./AllowedIpListEditor";
import ProviderModeSelector from "./ProviderModeSelector";
import SecretField from "./SecretField";
import { CHANNEL_META } from "./config";
import { INPUT_CLASS, SUB_PANEL_CLASS, TOGGLE_CLASS } from "./constants";
import { formatReason, getConfigFields } from "./utils";

function TextField({ field, value, disabled, onChange }) {
  return (
    <label className={field.full ? "space-y-2 md:col-span-2" : "space-y-2"}>
      <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{field.label}</span>
      <input className={INPUT_CLASS} value={value || ""} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </label>
  );
}

export default function ChannelCard({ channel, draft, capability, canEdit, showPermissionNote, platformRoot, onChannelChange, onConfigChange }) {
  const usingPlatform = !platformRoot && draft.mode === "platform_credentials";

  return (
    <div className={SUB_PANEL_CLASS}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <input className={TOGGLE_CLASS} type="checkbox" checked={Boolean(draft.enabled)} onChange={(event) => onChannelChange("enabled", event.target.checked)} disabled={!canEdit} />
            <div>
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{CHANNEL_META[channel].label}</span>
              <h3 className="mt-1 text-lg font-bold text-slate-900">{capability?.enabled ? "Live capability" : "Draft configuration"}</h3>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{CHANNEL_META[channel].description}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Provider: {capability?.provider || draft.provider}</span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Mode: {capability?.mode || draft.mode}</span>
        </div>
      </div>

      <div className="mt-5">
        <ProviderModeSelector
          channel={channel}
          provider={draft.provider}
          mode={draft.mode}
          canEdit={canEdit}
          platformRoot={platformRoot}
          onProviderChange={(value) => onChannelChange("provider", value)}
          onModeChange={(value) => onChannelChange("mode", value)}
        />
      </div>

      {usingPlatform ? (
        <div className="mt-5 rounded-[18px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-600">
          Shared provider mode is selected. {showPermissionNote ? "Approval must be enabled by superadmin or platform-admin." : "This company will inherit the platform configuration when approval is granted."}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {getConfigFields(channel, draft.provider).map((field) => {
            if (field.key === "allowed_ips") {
              return <AllowedIpListEditor key={field.key} value={draft.config?.[field.key]} disabled={!canEdit} onChange={(value) => onConfigChange(field.key, value)} />;
            }
            if (field.secret) {
              return <SecretField key={field.key} label={field.label} value={draft.config?.[field.key]} disabled={!canEdit} onChange={(value) => onConfigChange(field.key, value)} />;
            }
            return <TextField key={field.key} field={field} value={draft.config?.[field.key]} disabled={!canEdit} onChange={(value) => onConfigChange(field.key, value)} />;
          })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3 text-xs font-medium text-slate-500">
        {draft.has_config ? <span>Secure config already saved</span> : <span>No stored config yet</span>}
        {!capability?.enabled && capability?.reason ? <span>Reason: {formatReason(capability.reason)}</span> : null}
      </div>
    </div>
  );
}
