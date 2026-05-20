import DashboardIcon from "../../../../components/dashboard/icons";
import { T } from "./edit-lead-tokens";

export function EditContextSection({ form, changeNote, requiresChangeNote, saving, router, params, onChange, onChangeNoteChange }) {
  return (
    <article className={T.panel}>
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-blue-200 bg-blue-50 text-sm font-bold text-blue-600">3</span>
        <div>
          <h3 className="text-base font-bold text-slate-900">Additional Context</h3>
          <p className="text-xs text-slate-500">Requirements and change notes</p>
        </div>
      </div>
      <div className="grid gap-4">
        <label className="space-y-2">
          <span className={T.kicker}>Requirements</span>
          <textarea className={`${T.input} min-h-[120px] resize-y`} rows="4" value={form.requirements} onChange={(e) => onChange("requirements", e.target.value)} placeholder="Enter lead requirements..." />
        </label>
        <label className="space-y-2">
          <span className={T.kicker}>{requiresChangeNote ? "Change Note (Required)" : "Change Note"}</span>
          <textarea
            className={`${T.input} min-h-[120px] resize-y`}
            rows="4"
            value={changeNote}
            onChange={(e) => onChangeNoteChange(e.target.value)}
            placeholder={requiresChangeNote ? "Explain what changed and why (required for audit trail)" : "Optional note about this update"}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button className={T.ghost} type="button" onClick={() => router.push(`/leads/${params.id}`)}>
          Cancel
        </button>
        <button className={T.gold} type="submit" disabled={saving || (requiresChangeNote && !changeNote.trim())}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </article>
  );
}
