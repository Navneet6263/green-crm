"use client";

export default function RecentUpdatesFeed({ notes, loading, onNavigate }) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-28 animate-pulse rounded-2xl border border-slate-100 bg-white/50 p-6 shadow-sm" />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-900">No updates found</h3>
        <p className="mt-1 text-sm text-slate-500">No activities match your current filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      {notes.map((note) => (
        <div
          key={`${note.note_type}-${note.id}`}
          className="group relative flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center"
        >
          {/* Visual Accent Line */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl transition-all duration-300 ${
              note.note_type === "lead" ? "bg-indigo-500 group-hover:bg-indigo-600" : "bg-emerald-500 group-hover:bg-emerald-600"
            }`}
          />

          <div className="min-w-0 flex-1 pl-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="truncate text-sm font-semibold text-slate-900">
                {note.entity_name || "Unnamed"}
              </span>
              {note.entity_company_name && (
                <span className="hidden truncate text-xs text-slate-400 sm:inline">
                  • {note.entity_company_name}
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                note.note_type === "lead" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
              }`}>
                {note.note_type}
              </span>
              {note.product_name && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {note.product_name}
                </span>
              )}
            </div>
            
            {/* Note Content */}
            <p className="mt-2 text-sm text-slate-600 line-clamp-2">
              {note.content}
            </p>
            
            {/* Meta details */}
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-slate-500">{note.created_by_name}</span>
              <span>•</span>
              <span>{formatDate(note.created_at)}</span>
            </div>
          </div>

          {/* View Details Button */}
          <button
            onClick={() => onNavigate(note)}
            className="flex items-center justify-center gap-1 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600 sm:self-center"
          >
            View Details
            <svg className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
