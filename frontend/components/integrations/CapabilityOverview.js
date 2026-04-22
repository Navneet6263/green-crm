import { CHANNEL_META, CHANNEL_ORDER } from "./config";
import { SUB_PANEL_CLASS } from "./constants";
import { formatReason, getCapabilityTone } from "./utils";

function CapabilityCard({ channel, capability }) {
  return (
    <div className={SUB_PANEL_CLASS}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{CHANNEL_META[channel].label}</span>
          <p className="mt-2 text-sm leading-6 text-slate-600">{CHANNEL_META[channel].description}</p>
        </div>
        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${getCapabilityTone(capability)}`}>
          {capability?.enabled ? capability.provider || "Enabled" : "Disabled"}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
        <span>Source: {capability?.source || "tenant"}</span>
        <span>Mode: {capability?.mode || "own_credentials"}</span>
        {!capability?.enabled && capability?.reason ? <span>Reason: {formatReason(capability.reason)}</span> : null}
      </div>
    </div>
  );
}

export default function CapabilityOverview({ capabilities }) {
  return (
    <section>
      <div className="mb-4">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Resolved channel capability</span>
        <p className="mt-2 text-sm leading-6 text-slate-600">Each card shows the backend-authoritative result after tenant config, platform approval, and provider mode are combined.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {CHANNEL_ORDER.map((channel) => (
          <CapabilityCard key={channel} channel={channel} capability={capabilities?.[channel]} />
        ))}
      </div>
    </section>
  );
}
