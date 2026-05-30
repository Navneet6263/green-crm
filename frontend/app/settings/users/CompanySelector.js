import { T } from "./users-tokens";

export function CompanySelector({ companies, selectedCompanyId, onChange }) {
  return (
    <div className={`${T.panel} flex flex-wrap items-center gap-4 px-5 py-4`}>
      <p className="text-sm font-semibold text-slate-700">Company</p>
      <select 
        className={`${T.input} max-w-[280px]`} 
        value={selectedCompanyId} 
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Choose company</option>
        {companies.map((c) => (
          <option key={c.company_id} value={c.company_id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
