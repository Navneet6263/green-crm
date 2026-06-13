import DashboardIcon from "../../../../components/dashboard/icons";
import { T } from "./edit-lead-tokens";

export function EditLeadHeader({ originalLead, selectedTeam, params, router }) {
  const initials = (value = "Lead") => {
    return String(value)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "L";
  };

  return (
    <article className={T.heroPanel}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button className={T.ghost} type="button" onClick={() => router.push("/leads")}>
          ← Back
        </button>
        <a href={`/leads/${params.id}`} className={T.ghost}>
          View Details
        </a>
      </div>

      <div className="mt-4 flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-base font-bold text-white shadow-lg">
          {initials(originalLead?.contact_person || originalLead?.company_name || "Lead")}
        </div>
        <div className="flex-1 min-w-0">
          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-600">
            Edit Lead
          </span>
          <h2 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 sm:text-xl truncate">
            {originalLead?.contact_person || originalLead?.company_name || "Lead"}
          </h2>
          
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <strong className="font-semibold text-slate-900">ID:</strong> {originalLead?.lead_id || "--"}
            </span>
            {originalLead?.company_name && (
              <>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 truncate">
                  <strong className="font-semibold text-slate-900">Company:</strong> 
                  <span className="truncate">{originalLead.company_name}</span>
                </span>
              </>
            )}
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <strong className="font-semibold text-slate-900">Team:</strong> {selectedTeam?.name || originalLead?.team_name || "Auto"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function EditIdentitySection({ form, isAdmin, teams, users, selectedTeam, teamSelectorVisible, canManageAssignment, resourceLoading, teamSelectionPending, ownerEmptyMessage, onChange }) {
  const LEAD_SOURCE_OPTIONS = [
    { value:"website", label:"Website" }, { value:"google", label:"Google" },
    { value:"facebook", label:"Facebook" }, { value:"instagram", label:"Instagram" },
    { value:"linkedin", label:"LinkedIn" }, { value:"referral", label:"Referral" },
    { value:"cold-call", label:"Cold Call" }, { value:"email-campaign", label:"Email Campaign" },
    { value:"partner", label:"Partner" }, { value:"trade-show", label:"Trade Show" },
    { value:"walk-in", label:"Walk-in" }, { value:"other", label:"Other" },
  ];

  return (
    <article className={T.panel}>
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-blue-200 bg-blue-50 text-sm font-bold text-blue-600">1</span>
        <div>
          <h3 className="text-base font-bold text-slate-900">Contact & Company</h3>
          <p className="text-xs text-slate-500">Basic lead information</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className={T.kicker}>Contact Person</span>
          <input className={T.input} value={form.contact_person} onChange={(e) => onChange("contact_person", e.target.value)} required />
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Company Name</span>
          <input className={T.input} value={form.company_name} onChange={(e) => onChange("company_name", e.target.value)} required />
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>No. of Employees</span>
          <input className={T.input} type="text" value={form.no_of_employees} onChange={(e) => onChange("no_of_employees", e.target.value)} placeholder="e.g. 100-500" />
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Active Users</span>
          <input className={T.input} type="number" min={0} step={1} value={form.active_users} onChange={(e) => onChange("active_users", e.target.value)} placeholder="e.g. 50" />
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Mode of Payment</span>
          <select className={T.input} value={form.payment_mode || ""} onChange={(e) => onChange("payment_mode", e.target.value)}>
            <option value="">Select payment mode</option>
            <option value="upi">UPI</option>
            <option value="credit_debit_card">Credit/Debit Card</option>
            <option value="neft_company">NEFT/Company Account</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Client Tenure (End Date)</span>
          <div className="flex gap-2">
            <select 
              className={T.input} 
              style={{ width: '130px', flexShrink: 0 }} 
              onChange={(e) => {
                const months = parseInt(e.target.value, 10);
                if (months) {
                  const d = new Date();
                  d.setMonth(d.getMonth() + months);
                  // Return format YYYY-MM-DD
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  const dd = String(d.getDate()).padStart(2, '0');
                  onChange("client_tenure", `${yyyy}-${mm}-${dd}`);
                }
              }}
            >
              <option value="">Custom</option>
              <option value="1">1 Month</option>
              <option value="3">3 Months</option>
              <option value="6">6 Months</option>
              <option value="12">12 Months</option>
            </select>
            <input 
              className={T.input} 
              type="date" 
              value={form.client_tenure ? String(form.client_tenure).split('T')[0] : ""} 
              onChange={(e) => onChange("client_tenure", e.target.value)} 
            />
          </div>
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Email</span>
          <input className={T.input} type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} />
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Phone</span>
          <input className={T.input} value={form.phone} onChange={(e) => onChange("phone", e.target.value)} required />
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>Lead Source</span>
          <select className={T.input} value={form.lead_source || "website"} onChange={(e) => onChange("lead_source", e.target.value)}>
            {LEAD_SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        {teamSelectorVisible ? (
          <label className="space-y-2">
            <span className={T.kicker}>Team</span>
            <select className={T.input} value={form.team_id} onChange={(e) => onChange("team_id", e.target.value)}>
              <option value="">Select team</option>
              {teams.map((team) => (
                <option key={team.team_id} value={team.team_id}>
                  {team.name || team.team_id}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {canManageAssignment ? (
          <label className="space-y-2">
            <span className={T.kicker}>Lead Owner</span>
            <select className={T.input} value={form.assigned_to} onChange={(e) => onChange("assigned_to", e.target.value)} disabled={resourceLoading || teamSelectionPending}>
              <option value="">Keep current owner</option>
              {users.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.name} | {user.role}
                </option>
              ))}
            </select>
            {ownerEmptyMessage ? <small className="text-xs font-medium text-slate-500">{ownerEmptyMessage}</small> : null}
          </label>
        ) : null}
      </div>
      {selectedTeam ? (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700">
          <strong className="font-semibold text-slate-900">Team:</strong> {selectedTeam.name || selectedTeam.team_id}
        </div>
      ) : null}
    </article>
  );
}
