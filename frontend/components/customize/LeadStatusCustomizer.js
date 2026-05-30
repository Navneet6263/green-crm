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
    <div className="rounded-[24px] border border-[#eadfcd] bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#fffaf1] transition-colors"
      >
        <div>
          <h3 className="text-lg font-semibold text-[#060710]">Lead Statuses</h3>
          <p className="mt-1 text-xs text-[#8f816a]">
            Select which statuses to show in your lead pipeline
          </p>
        </div>
        <div className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
          <DashboardIcon name="chevron-down" className="h-5 w-5 text-[#7c6d55]" />
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-[#eadfcd]/50">
          <div className="pt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DEFAULT_STATUSES.map((status) => {
              const isEnabled = statuses.includes(status.value);
              return (
                <label
                  key={status.value}
                  className={`flex items-center gap-3 rounded-[16px] border px-4 py-3 cursor-pointer transition-all ${
                    isEnabled
                      ? "border-[#7c6d55] bg-[#fffaf1]"
                      : "border-[#eadfcd] bg-white hover:bg-[#fffaf1]/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => toggleStatus(status.value)}
                    className="h-4 w-4 rounded border-[#7c6d55] text-[#7c6d55] focus:ring-[#7c6d55]"
                  />
                  <span className="text-sm font-medium text-[#060710]">{status.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
