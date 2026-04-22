import { KICKER_CLASS, PANEL_CLASS } from "./constants";

export default function SelectedEntityCard({ record }) {
  if (!record) {
    return null;
  }

  return (
    <article className={PANEL_CLASS}>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">{record.entity_type}</span>
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-[#060710]">{record.subtitle}</h3>
            <p className="mt-2 text-sm leading-7 text-[#746853]">{record.title}</p>
          </div>
        </div>
        <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{record.status}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[["Email", record.email || "Add an email before sending"], ["Phone", record.phone || "No phone on file"], ["Context", record.product], ["Owner", record.owner]].map(([label, value]) => (
          <div key={label} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
            <span className={KICKER_CLASS}>{label}</span>
            <strong className="mt-3 block text-sm leading-6 text-[#060710]">{value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}
