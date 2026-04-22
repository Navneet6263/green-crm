import { INPUT_CLASS } from "./constants";

export default function SecretField({ label, value, disabled, onChange }) {
  return (
    <label className="space-y-2">
      <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <input
        className={INPUT_CLASS}
        type="password"
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder="Stored securely"
      />
    </label>
  );
}
