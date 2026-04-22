import { TEXTAREA_CLASS } from "./constants";

function valueToText(value) {
  return Array.isArray(value) ? value.join("\n") : value || "";
}

export default function AllowedIpListEditor({ value, disabled, onChange }) {
  return (
    <label className="space-y-2 md:col-span-2">
      <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Allowed IPs</span>
      <textarea
        className={TEXTAREA_CLASS}
        rows={4}
        value={valueToText(value)}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={"203.0.113.10\n198.51.100.0/24"}
      />
      <span className="block text-xs leading-5 text-slate-500">Enter one IP or CIDR range per line. Punch in and punch out will be allowed only from these office IPs.</span>
    </label>
  );
}
