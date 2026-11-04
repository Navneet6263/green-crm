import { KICKER_CLASS, PANEL_CLASS } from "./constants";

export default function CompanySnapshotPanel({ company, draft }) {
  const items = [
    ["Company", company.name],
    ["Contact Email", company.contact_email || draft.contact_email],
    ["Admin Email", company.admin_email || draft.admin_email],
    ["Phone", company.contact_phone || draft.contact_phone],
    ["Website", company.website || draft.website],
    ["Country", company.country || draft.country],
  ];

  return (
    <article className={PANEL_CLASS}>
      <div className="mb-3">
        <h3 className="text-[14.5px] font-bold text-slate-900">At a glance</h3>
      </div>

      <div className="grid gap-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-[10px] bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
            <span className={KICKER_CLASS}>{label}</span>
            <strong className="mt-0.5 block text-[13px] text-slate-900">{value || "--"}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}
