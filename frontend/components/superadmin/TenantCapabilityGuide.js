"use client";

const ITEMS = [
  {
    label: "Module Access",
    title: "Controls sidebar and page visibility",
    description: "Turn a module on here if the tenant should see it in the workspace navigation.",
  },
  {
    label: "Channel Capability",
    title: "Controls whether actions actually work",
    description: "Calling, WhatsApp, SMS, and attendance still depend on provider mode, approvals, and backend capability rules.",
  },
];

export default function TenantCapabilityGuide() {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {ITEMS.map((item) => (
        <article
          key={item.label}
          className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
        >
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
            {item.label}
          </span>
          <h3 className="mt-3 text-lg font-black text-slate-900">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
        </article>
      ))}
    </section>
  );
}
