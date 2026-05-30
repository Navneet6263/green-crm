import { KICKER_CLASS } from "./constants";

export default function CompactHero({ company, draft }) {
  const stats = company
    ? [
        { label: "Currency", value: company.settings_currency || "INR" },
        { label: "Timezone", value: company.settings_timezone || "Asia/Kolkata" },
        { label: "SMTP", value: company.smtp_host ? "Custom" : "Platform" },
        { label: "Login", value: draft.login_url ? "Custom" : "Default" },
      ]
    : [];

  return (
    <div className="rounded-[24px] border border-[#eadfcd] bg-gradient-to-br from-white via-[#fffaf1] to-[#fff6e4] p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className={`${KICKER_CLASS} inline-block mb-2`}>Company Settings</span>
          <h1 className="text-2xl font-bold text-[#060710] lg:text-3xl">
            {company?.name || "Company Configuration"}
          </h1>
          <p className="mt-2 text-sm text-[#746853] max-w-2xl">
            Manage tenant identity, SMTP delivery, and authentication settings
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            {stats.map((item) => (
              <div 
                key={item.label} 
                className="rounded-[16px] border border-[#eadfcd] bg-white/80 px-3 py-2.5 text-center"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8f816a]">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#060710]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          
          <a
            href="/settings/customize"
            className="rounded-[16px] border border-[#7c6d55] bg-[#7c6d55] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#6f614c] transition-colors"
          >
            🎨 Customize CRM
          </a>
        </div>
      </div>
    </div>
  );
}
