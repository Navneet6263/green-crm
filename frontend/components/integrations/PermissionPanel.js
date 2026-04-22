import { PERMISSION_FIELDS } from "./config";
import { SUB_PANEL_CLASS, TOGGLE_CLASS } from "./constants";

export default function PermissionPanel({ permissions, canEdit, onToggle, framed = true }) {
  if (!permissions) {
    return null;
  }

  return (
    <div className={framed ? SUB_PANEL_CLASS : ""}>
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Platform approvals</span>
        <p className="text-sm leading-6 text-slate-600">
          Shared provider access is approved here. Tenant admins can switch a channel to platform mode, but only platform roles can approve usage.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {PERMISSION_FIELDS.map((item) => (
          <label key={item.key} className="flex items-start gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3">
            <input className={TOGGLE_CLASS} type="checkbox" checked={Boolean(permissions[item.key])} onChange={() => onToggle(item.key)} disabled={!canEdit} />
            <span className="min-w-0">
              <strong className="block text-sm text-slate-900">{item.label}</strong>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Controls whether the company can consume the shared {item.channel} setup.</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
