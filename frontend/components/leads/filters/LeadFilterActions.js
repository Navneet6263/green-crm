"use client";

export default function LeadFilterActions({ activeCount, onReset, disabled, buttonClassName }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#efe6d8] pt-4">
      <p className="text-xs font-semibold text-[#8f816a]">
        {activeCount ? `${activeCount} filters active.` : "Showing your current lead scope."}
      </p>
      <button className={buttonClassName} type="button" onClick={onReset} disabled={disabled}>
        Reset Filters
      </button>
    </div>
  );
}
