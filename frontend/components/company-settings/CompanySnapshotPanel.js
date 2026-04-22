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
      <div className="mb-5">
        <p className={KICKER_CLASS}>Company Snapshot</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Tenant reference</h3>
      </div>

      <div className="grid gap-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
            <span className={KICKER_CLASS}>{label}</span>
            <strong className="mt-3 block text-sm leading-6 text-[#060710]">{value || "--"}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}
