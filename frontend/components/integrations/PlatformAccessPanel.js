import PermissionPanel from "./PermissionPanel";
import { SUB_PANEL_CLASS } from "./constants";

export default function PlatformAccessPanel({
  permissions,
  canEdit,
  onToggle,
  platformChannels = [],
  fields = [],
  eyebrow = "Managed Services",
  title = "Managed paid services",
  description = "Own credentials take priority. If they are missing, superadmin-approved platform services act as the backend fallback.",
}) {
  return (
    <div className={SUB_PANEL_CLASS}>
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{eyebrow}</span>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>

      {platformChannels.length ? (
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          {platformChannels.map((channel) => (
            <span key={channel} className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Saved platform mode: {channel}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5">
        <PermissionPanel
          permissions={permissions}
          canEdit={canEdit}
          onToggle={onToggle}
          fields={fields}
          framed={false}
          showHeader={false}
        />
      </div>
    </div>
  );
}
