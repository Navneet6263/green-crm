import { T } from "./users-tokens";

export function UserStats({ stats }) {
  const metrics = [
    { label: "Total Members", value: stats.total, style: "border-slate-200 bg-slate-100" },
    { label: "Active", value: stats.active, style: "border-emerald-200 bg-emerald-100" },
    { label: "Roles in Use", value: stats.roles, style: "border-sky-200 bg-sky-100" },
    { label: "Inactive", value: stats.inactive, style: "border-rose-200 bg-rose-100" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map(({ label, value, style }) => (
        <div key={label} className={`rounded-2xl border px-4 py-3.5 ${style}`}>
          <p className={T.kicker}>{label}</p>
          <p className="mt-1 text-2xl font-bold leading-none text-slate-900">{value}</p>
        </div>
      ))}
    </div>
  );
}
