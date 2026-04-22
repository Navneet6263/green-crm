import { KICKER_CLASS } from "../communications/constants";

function stat(label, value) {
  return { label, value: value ?? "--" };
}

export default function AttendanceHero({ attendance, historyCount }) {
  const stats = [
    stat("Provider", attendance?.provider || "custom"),
    stat("Source", attendance?.source || "tenant"),
    stat("Recent Events", historyCount || 0),
    stat("Last Sync", attendance?.last_event?.created_at ? new Date(attendance.last_event.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "--"),
  ];

  return (
    <article className="rounded-[34px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(247,240,227,0.96)_42%,_rgba(241,232,215,1)_100%)] p-5 shadow-[0_22px_60px_rgba(79,58,22,0.08)] md:p-7">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-4">
          <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">Attendance / Location</span>
          <h2 className="text-4xl font-semibold tracking-tight text-[#060710] md:text-[3rem] md:leading-[1.04]">
            Keep office attendance separate from communications.
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-[#746853] md:text-base">
            Punch in and punch out stay isolated behind backend capability checks, approved office IP rules, and tenant-level module access controlled by superadmin.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px] xl:max-w-[460px] xl:w-full">
          {stats.map((item, index) => (
            <article key={item.label} className={`rounded-[24px] border border-[#eadfcd] p-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)] ${index === 0 ? "bg-[#fff6e4]" : "bg-white/82"}`}>
              <p className={KICKER_CLASS}>{item.label}</p>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-[#060710]">{item.value}</p>
            </article>
          ))}
        </div>
      </div>
    </article>
  );
}
