import { T } from "./users-tokens";

export function PageHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className={T.kicker}>Settings · Users</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
          Workspace Users
        </h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Create, manage, and control access for every team member.
        </p>
      </div>
    </div>
  );
}
