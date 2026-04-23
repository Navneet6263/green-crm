const leadRows = [
  { name: "Aarav Enterprises", source: "Website lead", status: "New" },
  { name: "Sapphire Realty", source: "Call enquiry", status: "Follow-up" },
  { name: "Nova Traders", source: "WhatsApp", status: "Qualified" },
];

const activityRows = [
  { label: "Calls today", value: "42", note: "Tracked with click-to-call" },
  { label: "WhatsApp replies", value: "18", note: "Shared team follow-up" },
  { label: "Field check-ins", value: "9/11", note: "Geo-fencing enabled" },
];

export default function HeroVisual() {
  return (
    <div className="relative overflow-hidden rounded-[2.1rem] border border-slate-200/70 bg-white p-5 shadow-[0_32px_90px_rgba(15,23,42,0.12)] sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_62%)]" />

      <div className="relative rounded-[1.6rem] border border-slate-200/80 bg-[#f8fafc] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-emerald-600">
              GreenCRM Sales Workspace
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              One view for leads, calls, messages, and team updates
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            Fast, lightweight UI
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-950">Today&apos;s lead queue</p>
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                3 priority leads
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {leadRows.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 rounded-[1.15rem] border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.source}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">Quick actions</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[1.15rem] bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  Call lead
                </div>
                <div className="rounded-[1.15rem] bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
                  Send WhatsApp
                </div>
                <div className="rounded-[1.15rem] bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
                  Mark attendance
                </div>
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">Manager snapshot</p>
              <div className="mt-4 space-y-3">
                {activityRows.map((item) => (
                  <div key={item.label} className="rounded-[1.15rem] border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-700">{item.label}</p>
                      <p className="text-lg font-semibold text-slate-950">{item.value}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
