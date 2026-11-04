import { StatCard } from "../teams/teams-tokens";

export function UserStats({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Total members" value={stats.total} accent="sky" />
      <StatCard label="Active" value={stats.active} accent="emerald" />
      <StatCard label="Roles in use" value={stats.roles} accent="violet" />
      <StatCard label="Inactive" value={stats.inactive} accent="rose" />
    </div>
  );
}
