import PermissionPanel from "./PermissionPanel";
import { SUB_PANEL_CLASS } from "./constants";

export default function PlatformAccessPanel({ permissions, canEdit, onToggle, platformChannels = [] }) {
  return (
    <div className={SUB_PANEL_CLASS}>
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Platform credential approval</span>
        <p className="text-sm leading-6 text-slate-600">
          Shared provider approvals stay separate from tenant credentials. Companies can choose platform mode, but access only becomes active after these approvals are enabled.
        </p>
      </div>

      {platformChannels.length ? (
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          {platformChannels.map((channel) => (
            <span key={channel} className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Using platform mode: {channel}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5">
        <PermissionPanel permissions={permissions} canEdit={canEdit} onToggle={onToggle} framed={false} />
      </div>
    </div>
  );
}
