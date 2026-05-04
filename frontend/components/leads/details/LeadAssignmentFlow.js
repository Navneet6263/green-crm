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
    <div className="mt-4 rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <strong className="block text-sm text-[#060710]">Lead Flow / Assignment History</strong>
          <p className="mt-1 text-xs font-medium text-[#7c6d55]">Current owner stays primary; previous handoffs remain visible.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#7a6230]">
          Current: {lead?.assigned_to_name || "Unassigned"}
        </span>
      </div>

      {items.length ? (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div className="rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3" key={item.activity_id || `${item.created_at}-${index}`}>
              <div className="flex flex-wrap justify-between gap-2">
                <strong className="text-xs text-[#060710]">{formatActor(item)}</strong>
                <span className="text-xs font-semibold text-[#8f816a]">{renderWhen(item.created_at, true)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-[#5f533f]">{item.description || "Lead owner updated."}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-[18px] border border-dashed border-[#ddd0bb] bg-white px-4 py-5 text-center text-sm text-[#7a6b57]">
          No assignment handoff has been recorded yet.
        </p>
      )}
    </div>
  );
}
