"use client";

import DashboardIcon from "../../../components/dashboard/icons";
import { T } from "./teams-tokens";

export function TeamEditorDrawer({ open, mode, form, saving, onClose, onSave, onChange }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <aside className="absolute right-0 top-0 h-full w-full max-w-[520px] overflow-y-auto border-l border-slate-100 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {mode === "create" ? "New Team" : "Edit Team"}
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">
              {mode === "create" ? "Set up team identity" : "Update team details"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </div>

        <form className="space-y-5 px-6 py-6" onSubmit={onSave}>
          <p className="text-sm text-slate-500">
            {mode === "create"
              ? "Save the team first, then add members and managers from the detail panel."
              : "Update name, code, description, or active status without leaving the workspace."}
          </p>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Team Name *</span>
            <input
              className={T.input}
              value={form.name}
              onChange={e => onChange("name", e.target.value)}
              placeholder="e.g. North Sales"
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Team Code</span>
            <input
              className={T.input}
              value={form.code}
              onChange={e => onChange("code", e.target.value.toUpperCase().replace(/\s+/g, "_"))}
              placeholder="Auto-generated if left blank"
            />
            <p className="text-xs text-slate-400">Leave blank to auto-generate from the team name.</p>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</span>
            <textarea
              className={`${T.input} min-h-[110px] resize-y`}
              rows={4}
              value={form.description}
              onChange={e => onChange("description", e.target.value)}
              placeholder="What does this team own, and how should users think about it?"
            />
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-amber-300 accent-amber-500"
              checked={form.is_active}
              onChange={e => onChange("is_active", e.target.checked)}
            />
            <span>
              <strong className="block text-sm text-slate-900">Active team</strong>
              <span className="mt-0.5 block text-xs text-slate-400">
                Active teams appear in CRM ownership pickers. Inactive teams are hidden from record assignment.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <button className={T.ghost} type="button" onClick={onClose}>Cancel</button>
            <button className={T.gold} type="submit" disabled={saving}>
              <DashboardIcon name="settings" className="h-4 w-4" />
              {saving ? (mode === "create" ? "Creating…" : "Saving…") : mode === "create" ? "Create Team" : "Save Team"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
