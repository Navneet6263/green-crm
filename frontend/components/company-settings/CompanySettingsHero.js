import { KICKER_CLASS } from "./constants";

export default function CompanySettingsHero({ company, draft }) {
  const heroStats = company
    ? [
        { label: "Currency", value: company.settings_currency || "INR" },
        { label: "Timezone", value: company.settings_timezone || "Asia/Kolkata" },
        { label: "SMTP", value: company.smtp_host ? "Tenant Mail" : "Platform Mail" },
        { label: "Login URL", value: draft.login_url ? "DB Saved" : "Platform Default" },
      ]
    : [];

  return (
    <article className="rounded-[34px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(247,240,227,0.96)_42%,_rgba(241,232,215,1)_100%)] p-5 shadow-[0_22px_60px_rgba(79,58,22,0.08)] md:p-7">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-4">
          <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">Company Settings</span>
          <div>
            <h2 className="text-4xl font-semibold tracking-tight text-[#060710] md:text-[3rem] md:leading-[1.04]">Company controls, leadership view, and delivery setup in one cleaner admin surface.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#746853] md:text-base">Review the tenant identity, see who is running the workspace, and manage SMTP plus invite delivery without the profile-like duplication.</p>
          </div>
        </div>

        <div className="grid gap-3 xl:min-w-[420px] xl:max-w-[460px] xl:w-full sm:grid-cols-2">
          {heroStats.map((item, index) => (
            <div key={item.label} className={`rounded-[24px] border border-[#eadfcd] p-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)] ${index === 0 ? "bg-[#fff6e4]" : "bg-white/88"}`}>
              <p className={KICKER_CLASS}>{item.label}</p>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-[#060710]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
