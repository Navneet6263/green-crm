"use client";

const board = [
  { label: "New Leads", value: "18", tone: "bg-[#edf8f2] text-[#0f7a5f]" },
  { label: "Follow-up Today", value: "09", tone: "bg-[#fff5de] text-[#946200]" },
  { label: "Warm Deals", value: "06", tone: "bg-[#eef5ff] text-[#2f6fdd]" },
];

const feed = [
  { title: "Aarav Foods", note: "Demo follow-up due at 4:00 pm", badge: "Call reminder" },
  { title: "BluePeak Realty", note: "Customer asked for pricing deck", badge: "Follow-up note" },
  { title: "Nova Mobility", note: "Document shared with decision maker", badge: "Document uploaded" },
];

export default function HeroVisual() {
  return (
    <div className="relative px-2 pb-10 pt-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,245,0.96))] p-5 shadow-[0_40px_100px_rgba(13,31,27,0.12)] sm:p-6">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(15,122,95,0.16),transparent_62%)]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#0f7a5f]">Live sales workspace</p>
              <h3 className="mt-2 text-xl font-semibold text-[#0d1f1b]">One clean view for lead movement</h3>
            </div>
            <span className="rounded-full bg-[#edf8f2] px-3 py-1 text-sm font-semibold text-[#0f7a5f]">Fast follow-up</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {board.map((item) => (
              <div key={item.label} className="rounded-[1.35rem] border border-[#e5ece3] bg-white/94 p-4">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.tone}`}>{item.label}</span>
                <strong className="mt-4 block text-3xl font-semibold tracking-tight text-[#0d1f1b]">{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
            <div className="rounded-[1.5rem] border border-[#e5ece3] bg-white/96 p-4">
              <p className="text-sm font-semibold text-[#0d1f1b]">Pipeline status</p>
              <div className="mt-4 space-y-3">
                {["Captured", "Assigned", "Follow-up", "Closed"].map((item, index) => (
                  <div key={item} className="flex items-center justify-between gap-3 rounded-[1rem] bg-[#f6faf5] px-4 py-3">
                    <span className="text-sm font-medium text-[#48635a]">{item}</span>
                    <span className="text-sm font-semibold text-[#0d1f1b]">{["18", "14", "09", "04"][index]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#e5ece3] bg-[#f8fbf7] p-4">
              <p className="text-sm font-semibold text-[#0d1f1b]">Follow-up feed</p>
              <div className="mt-4 space-y-3">
                {feed.map((item) => (
                  <div key={item.title} className="rounded-[1rem] bg-white px-4 py-3 shadow-[0_12px_24px_rgba(13,31,27,0.04)]">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm text-[#0d1f1b]">{item.title}</strong>
                      <span className="rounded-full bg-[#fff5de] px-2.5 py-1 text-[11px] font-semibold text-[#946200]">{item.badge}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#5c6f68]">{item.note}</p>
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
