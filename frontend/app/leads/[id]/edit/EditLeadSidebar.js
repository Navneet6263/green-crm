import DashboardIcon from "../../../../components/dashboard/icons";
import { T } from "./edit-lead-tokens";

export function EditAuditPreview({ changeItems }) {
  return (
    <article className={T.panel}>
      <div className="mb-5">
        <p className={T.kicker}>Change Preview</p>
        <h3 className="mt-2 text-lg font-bold text-slate-900">Audit Trail</h3>
      </div>

      {changeItems.length ? (
        <div className="space-y-3">
          {changeItems.map((item) => (
            <div key={item.field} className={T.softPanel}>
              <p className={T.kicker}>{item.label}</p>
              <div className="mt-3 grid gap-2">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Before</span>
                  <strong className="mt-1 block text-sm text-slate-900">{item.previous}</strong>
                </div>
                <div className="flex justify-center text-blue-500">
                  <DashboardIcon name="analytics" className="h-4 w-4" />
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-blue-600">After</span>
                  <strong className="mt-1 block text-sm text-blue-900">{item.next}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-white text-slate-400 shadow-sm">
            <DashboardIcon name="documents" className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">No changes yet</h3>
          <p className="mt-1 text-sm text-slate-500">Edit fields to see what will change</p>
        </div>
      )}
    </article>
  );
}

export function EditSaveRules() {
  return (
    <article className={T.panel}>
      <p className={T.kicker}>Validation Rules</p>
      <div className="mt-4 space-y-2">
        {[
          "Product selection is required",
          "Estimated value must be a number",
          "Change note required when editing",
        ].map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <DashboardIcon name="documents" className="h-4 w-4" />
            </span>
            <strong className="text-sm text-slate-700">{item}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}
