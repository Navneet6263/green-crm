import DashboardIcon from "../../../components/dashboard/icons";
import { T } from "./users-tokens";

export function CreateUserForm({ 
  createForm, 
  setCreateForm, 
  roles, 
  creating, 
  onSubmit,
  isSuperAdmin,
  isManager = false,
  managedTeams = [],
  teamsLoading = false,
  teamsError = "",
  companies,
  selectedCompanyId,
  onCompanyChange
}) {
  return (
    <div className={`${T.panel} px-5 py-5`}>
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
          <DashboardIcon name="users" className="h-4 w-4" />
        </div>
        <div>
          <p className={T.kicker}>Add Member</p>
          <h2 className="text-base font-bold text-slate-900">Create new team member</h2>
        </div>
      </div>

      <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}>
        {isSuperAdmin && (
          <label className="block space-y-1.5 sm:col-span-2 xl:col-span-3">
            <span className={T.kicker}>Company</span>
            <select 
              className={`${T.input} max-w-[280px]`} 
              value={selectedCompanyId} 
              onChange={(e) => onCompanyChange(e.target.value)}
            >
              <option value="">Choose company</option>
              {companies.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {isManager && (
          <label className="block space-y-1.5 sm:col-span-2 xl:col-span-3">
            <span className={T.kicker}>Employee team *</span>
            <select className={T.input} value={createForm.team_id || ""} required
              disabled={teamsLoading || !managedTeams.length}
              onChange={(e) => setCreateForm((form) => ({ ...form, team_id: e.target.value }))}>
              <option value="">{teamsLoading ? "Loading your teams..." : "Choose your team"}</option>
              {managedTeams.map((team) => (
                <option key={team.team_id} value={team.team_id}>{team.name}{team.code ? ` | ${team.code}` : ""}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500" role={teamsError ? "alert" : undefined}>
              {teamsError || (!teamsLoading && !managedTeams.length
                ? "Ask your company admin to add you as a member of an active team before creating employees."
                : "The new employee will automatically join this team.")}
            </p>
          </label>
        )}

        <label className="block space-y-1.5">
          <span className={T.kicker}>Full Name *</span>
          <input 
            className={T.input} 
            value={createForm.name} 
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} 
            placeholder="Jane Smith" 
            required 
          />
        </label>

        <label className="block space-y-1.5">
          <span className={T.kicker}>Email *</span>
          <input 
            className={T.input} 
            type="email" 
            value={createForm.email} 
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} 
            placeholder="jane@company.com" 
            required 
          />
        </label>

        <label className="block space-y-1.5">
          <span className={T.kicker}>Role *</span>
          <select 
            className={T.input} 
            value={createForm.role} 
            onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
          >
            {roles.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className={T.kicker}>Department</span>
          <input 
            className={T.input} 
            value={createForm.department} 
            onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))} 
            placeholder="Sales Desk" 
          />
        </label>

        <label className="block space-y-1.5">
          <span className={T.kicker}>Phone</span>
          <input 
            className={T.input} 
            value={createForm.phone} 
            onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} 
            placeholder="+91 98765 43210" 
          />
        </label>

        <label className="block space-y-1.5">
          <span className={T.kicker}>Temp Password</span>
          <input 
            className={T.input} 
            type="password" 
            value={createForm.password} 
            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} 
            placeholder="Optional" 
          />
        </label>

        <div className="flex items-end sm:col-span-2 xl:col-span-3">
          <button 
            className={T.gold} 
            type="submit" 
            disabled={creating || (isSuperAdmin && !selectedCompanyId)
              || (isManager && (teamsLoading || Boolean(teamsError) || !managedTeams.some((team) => team.team_id === createForm.team_id)))}
          >
            <DashboardIcon name="users" className="h-4 w-4" />
            {creating ? "Creating…" : "Create Team Member"}
          </button>
        </div>
      </form>
    </div>
  );
}
