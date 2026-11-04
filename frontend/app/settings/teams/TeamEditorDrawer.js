"use client";

import SideDrawer from "../../../components/ui/SideDrawer";
import { colorFor } from "../../../components/dashboard/home/widgetCatalog";
import { T, initials } from "./teams-tokens";

const label = "block space-y-1 text-[12px] font-semibold text-slate-600";

/** Side panel to create a team or change its name, code, description and status. */
export function TeamEditorDrawer({ open, mode, form, saving, teamId, onClose, onSave, onChange }) {
  const creating = mode === "create";
  return (
    <SideDrawer open={open} onClose={onClose} title={creating ? "New team" : "Edit team"}
      subtitle={creating ? "Save it first, then add members and managers" : "Name, code, description and status"}
      footer={(
        <div className="flex justify-end gap-2">
          <button className={T.ghost} type="button" onClick={onClose}>Cancel</button>
          <button className={T.gold} type="submit" form="team-editor" disabled={saving}>{saving ? (creating ? "Creating…" : "Saving…") : creating ? "Create team" : "Save changes"}</button>
        </div>
      )}>
      <form id="team-editor" className="space-y-4" onSubmit={onSave}>
        <div className="flex items-center gap-3 rounded-[12px] bg-white px-4 py-3 ring-1 ring-slate-200">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[14px] font-bold text-white" style={{ background: colorFor(teamId || form.name || "team") }}>{initials(form.name || "Team")}</span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-slate-900">{form.name || "Team name"}</p>
            <p className="text-[12px] text-slate-500">{form.code || "Code is made from the name"}</p>
          </div>
        </div>

        <div className="space-y-4 rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
          <label className={label}>Team name
            <input className={T.input} value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="e.g. North Sales" required />
          </label>
          <label className={label}>Team code <span className="font-normal text-slate-400">(optional)</span>
            <input className={T.input} value={form.code} onChange={(e) => onChange("code", e.target.value.toUpperCase().replace(/\s+/g, "_"))} placeholder="e.g. NORTH_SALES" />
          </label>
          <label className={label}>Description
            <textarea className={`${T.input} min-h-[96px] resize-y`} rows={3} value={form.description} onChange={(e) => onChange("description", e.target.value)} placeholder="What this team owns, e.g. all leads from Delhi NCR" />
          </label>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[14px] bg-white px-4 py-3 ring-1 ring-slate-200">
          <span>
            <b className="block text-[13.5px] font-semibold text-slate-900">Active</b>
            <span className="block text-[12px] text-slate-500">Inactive teams are hidden when assigning leads and customers.</span>
          </span>
          <input type="checkbox" role="switch" checked={form.is_active} onChange={(e) => onChange("is_active", e.target.checked)}
            className="relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:shadow before:transition checked:bg-brand-600 checked:before:translate-x-4" />
        </label>
      </form>
    </SideDrawer>
  );
}
