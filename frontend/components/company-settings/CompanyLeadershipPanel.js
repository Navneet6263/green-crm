import DashboardIcon from "../dashboard/icons";

import { PANEL_CLASS } from "./constants";

export default function CompanyLeadershipPanel({ people }) {
  const admins = people.filter((user) => user.role === "admin");
  const managers = people.filter((user) => user.role === "manager");

  return (
    <article className={PANEL_CLASS}>
      <div className="mb-3">
        <h3 className="text-[14.5px] font-bold text-slate-900">Who runs this workspace</h3>
        <p className="text-[12.5px] text-slate-500">Admins and managers of your company</p>
      </div>
      <div className="grid gap-2">
        {[{ label: "Admins", items: admins }, { label: "Managers", items: managers }].map((group) => (
          <div key={group.label} className="rounded-[12px] bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="mb-3 flex items-center justify-between gap-3">
              <strong className="text-[13.5px] text-slate-900">{group.label}</strong>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-brand-700">{group.items.length}</span>
            </div>
            <div className="space-y-2">
              {group.items.length ? group.items.map((user) => (
                <div key={user.user_id} className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-3 py-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold-50 text-gold-800">
                    <DashboardIcon name="users" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-slate-900">{user.name}</strong>
                    <span className="block truncate text-xs text-slate-500">{user.email || user.role}</span>
                  </div>
                </div>
              )) : <p className="text-[12.5px] text-slate-500">No {group.label.toLowerCase()} found yet.</p>}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
