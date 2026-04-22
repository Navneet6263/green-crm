import { MODE_OPTIONS, PROVIDER_OPTIONS } from "./config";
import { INPUT_CLASS } from "./constants";

export default function ProviderModeSelector({ channel, provider, mode, canEdit, platformRoot, onProviderChange, onModeChange }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2">
        <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Provider</span>
        <select className={INPUT_CLASS} value={provider} onChange={(event) => onProviderChange(event.target.value)} disabled={!canEdit || channel === "attendance"}>
          {PROVIDER_OPTIONS[channel].map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>

      {!platformRoot ? (
        <label className="space-y-2">
          <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Credential mode</span>
          <select className={INPUT_CLASS} value={mode} onChange={(event) => onModeChange(event.target.value)} disabled={!canEdit}>
            {MODE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      ) : null}
    </div>
  );
}
