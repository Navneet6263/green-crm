import { useState } from "react";
import DashboardIcon from "../dashboard/icons";

const DEFAULT_STATUSES = [
  { value: "new", label: "New", color: "blue" },
  { value: "pending", label: "Pending", color: "yellow" },
  { value: "contacted", label: "Contacted", color: "purple" },
  { value: "qualified", label: "Qualified", color: "cyan" },
  { value: "proposal", label: "Proposal", color: "indigo" },
  { value: "negotiation", label: "Negotiation", color: "orange" },
  { value: "booked-demo", label: "Booked Demo", color: "pink" },
  { value: "demo-done", label: "Demo Done", color: "teal" },
  { value: "trial-started", label: "Trial Started", color: "violet" },
  { value: "closed-won", label: "Closed Won", color: "green" },
  { value: "closed-lost", label: "Closed Lost", color: "red" },
];

export default function LeadStatusCustomizer({ statuses, onChange }) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleStatus = (statusValue) => {
    if (statuses.includes(statusValue)) {
      onChange(statuses.filter((s) => s !== statusValue));
    } else {
      onChange([...statuses, statusValue]);
    }
  };

  return (
    <div className="rounded-[14px] border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Lead Statuses</h3>
          <p className="mt-1 text-xs text-slate-500">
            Select which statuses to show in your lead pipeline
          </p>
        </div>
        <div className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
          <DashboardIcon name="chevron-down" className="h-5 w-5 text-brand-700" />
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <div className="pt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DEFAULT_STATUSES.map((status) => {
              const isEnabled = statuses.includes(status.value);
              return (
                <label
                  key={status.value}
                  className={`flex items-center gap-3 rounded-[16px] border px-4 py-3 cursor-pointer transition-all ${
                    isEnabled
                      ? "border-slate-300 bg-slate-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => toggleStatus(status.value)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-200"
                  />
                  <span className="text-sm font-medium text-slate-900">{status.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
