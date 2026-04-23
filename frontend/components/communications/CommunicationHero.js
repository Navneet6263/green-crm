import { KICKER_CLASS } from "./constants";

export default function CommunicationHero({ leads, customers, records, selectedRecord, capabilities }) {
  const enabledChannels = ["email", "call", "whatsapp", "sms"].filter((channel) => capabilities?.[channel]?.enabled).length;
  const stats = [
    { label: "Lead Contacts", value: leads.length },
    { label: "Customers", value: customers.length },
    { label: "Reachable Records", value: records.filter((record) => record.email || record.phone).length },
    { label: "Live Channels", value: enabledChannels || 0 },
  ];

  return (
    <article className="rounded-[34px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(247,240,227,0.96)_42%,_rgba(241,232,215,1)_100%)] p-5 shadow-[0_22px_60px_rgba(79,58,22,0.08)] md:p-7">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-4">
          <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">Multi-channel CRM</span>
          <h2 className="text-4xl font-semibold tracking-tight text-[#060710] md:text-[3rem] md:leading-[1.04]">
            One communication desk for email, call, WhatsApp, and SMS.
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-[#746853] md:text-base">
            Communication modules stay visible for discovery, but backend capability rules decide whether tenant credentials or superadmin-approved GreenCRM services can execute each action.
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

      {selectedRecord ? (
        <div className="mt-5 rounded-[24px] border border-[#eadfcd] bg-white/82 px-4 py-4">
          <p className={KICKER_CLASS}>Selected Record</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <strong className="block text-lg text-[#060710]">{selectedRecord.subtitle}</strong>
              <p className="mt-1 text-sm text-[#746853]">{selectedRecord.title}</p>
            </div>
            <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
              {selectedRecord.status}
            </span>
          </div>
        </div>
      ) : null}
    </article>
  );
}
