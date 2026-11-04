export default function CompactHero({ company, draft }) {
  const stats = company
    ? [
        ["Currency", company.settings_currency || "INR"],
        ["Time zone", company.settings_timezone || "Asia/Kolkata"],
        ["Email sending", company.smtp_host ? "Own mail server" : "GreenCRM mail"],
        ["Login page", draft.login_url ? "Custom" : "Default"],
      ]
    : [];
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-[14px] bg-white p-4 ring-1 ring-slate-200 sm:p-5">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-gradient-to-br from-brand-500 to-brand-700 text-[17px] font-bold text-white">
        {String(company?.name || "C").slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-bold text-slate-900">{company?.name || "Your company"}</p>
        <p className="text-[12.5px] text-slate-500">Company ID {company?.company_id}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-[10px] bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
            <dt className="text-[11px] font-semibold text-slate-500">{label}</dt>
            <dd className="text-[13px] font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
