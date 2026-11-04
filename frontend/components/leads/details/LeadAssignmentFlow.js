"use client";

function formatActor(item) {
  return item.created_by_name || item.user_name || "User";
}

function isAssignmentEntry(item) {
  const text = `${item.type || ""} ${item.description || ""}`.toLowerCase();
  return text.includes("assigned") || text.includes("owner") || text.includes("handoff");
}

export default function LeadAssignmentFlow({ activity = [], lead, renderWhen }) {
  const items = activity.filter(isAssignmentEntry).slice(0, 6);

  return (
    <div className="mt-4 rounded-[24px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <strong className="block text-sm text-[#0f172a]">Lead Flow / Assignment History</strong>
          <p className="mt-1 text-xs font-medium text-[#64748b]">Current owner stays primary; previous handoffs remain visible.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0c605d]">
          Current: {lead?.assigned_to_name || "Unassigned"}
        </span>
      </div>

      {items.length ? (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div className="rounded-[18px] border border-[#e2e8f0] bg-white px-4 py-3" key={item.activity_id || `${item.created_at}-${index}`}>
              <div className="flex flex-wrap justify-between gap-2">
                <strong className="text-xs text-[#0f172a]">{formatActor(item)}</strong>
                <span className="text-xs font-semibold text-[#94a3b8]">{renderWhen(item.created_at, true)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-[#475569]">{item.description || "Lead owner updated."}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-[18px] border border-dashed border-[#e2e8f0] bg-white px-4 py-5 text-center text-sm text-[#64748b]">
          No assignment handoff has been recorded yet.
        </p>
      )}
    </div>
  );
}
