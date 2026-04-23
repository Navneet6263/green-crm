import { SUB_PANEL_CLASS, TOGGLE_CLASS } from "./constants";

export default function PermissionPanel({
  permissions,
  canEdit,
  onToggle,
  fields = [],
  framed = true,
  eyebrow = "Platform approvals",
  title = "Platform approvals",
  description = "Shared provider access is approved here.",
  showHeader = true,
}) {
  if (!permissions) {
    return null;
  }

  return (
    <div className={framed ? SUB_PANEL_CLASS : ""}>
      {showHeader ? (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{eyebrow}</span>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
      ) : null}

      <div className={`${showHeader ? "mt-5 " : ""}grid gap-3 md:grid-cols-2`}>
        {fields.map((item) => (
          <label key={item.key} className="flex items-start gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3">
            <input className={TOGGLE_CLASS} type="checkbox" checked={Boolean(permissions[item.key])} onChange={() => onToggle(item.key)} disabled={!canEdit} />
            <span className="min-w-0">
              <strong className="block text-sm text-slate-900">{item.label}</strong>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {item.description || `Controls whether the company can consume the shared ${item.channel} setup.`}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
