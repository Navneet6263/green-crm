import DashboardIcon from "../dashboard/icons";

import { KICKER_CLASS, PANEL_CLASS } from "./constants";

export default function CompanyLeadershipPanel({ people }) {
  const admins = people.filter((user) => user.role === "admin");
  const managers = people.filter((user) => user.role === "manager");

  return (
    <article className={PANEL_CLASS}>
      <div className="mb-5">
        <p className={KICKER_CLASS}>Leadership</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Who runs this workspace</h3>
      </div>
      <div className="grid gap-3">
        {[{ label: "Admins", items: admins }, { label: "Managers", items: managers }].map((group) => (
          <div key={group.label} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <strong className="text-base text-[#060710]">{group.label}</strong>
              <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{group.items.length}</span>
            </div>
            <div className="space-y-2">
              {group.items.length ? group.items.map((user) => (
                <div key={user.user_id} className="flex items-center gap-3 rounded-[18px] border border-[#eadfcd] bg-white px-3 py-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#fff0c8] text-[#8d6e27]">
                    <DashboardIcon name="users" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-[#060710]">{user.name}</strong>
                    <span className="block truncate text-xs text-[#8f816a]">{user.email || user.role}</span>
                  </div>
                </div>
              )) : <p className="text-sm leading-7 text-[#746853]">No {group.label.toLowerCase()} found yet.</p>}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
