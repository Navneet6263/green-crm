"use client";

export default function RecentUpdatesFeed({
  notes = [],
  loading,
  onNavigate,
  pagination = {},
  page = 1,
  setPage,
  limit = 20,
  setLimit
}) {
  const formatDate = (dateStr) => {
    if (!dateStr) return { date: "", time: "" };
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
      time: date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
  };

  const parseContent = (raw) => {
    if (!raw) return { metaPills: [], noteText: "" };
    let text = String(raw).trim();

    const noteMatch = text.match(/(?:Note|Notes|Comment|Remarks|Remark):\s*(.+)/i);
    let noteText = "";
    if (noteMatch && noteMatch[1]) {
      noteText = noteMatch[1].replace(/(?:Next follow-up|Mode|Calling status|Follow-up Status):\s*.*$/i, "").trim();
    }

    const respMatch = text.match(/Customer response:\s*([^Note:\n\r]+)/i);
    let responseVal = "";
    if (respMatch && respMatch[1]) {
      responseVal = respMatch[1].replace(/(?:Next follow-up|Mode|Calling status|Status changed):\s*.*$/i, "").trim();
    }

    const modeMatch = text.match(/Mode:\s*([^\s]+)/i);
    let modeVal = modeMatch ? modeMatch[1] : "";

    const metaPills = [];
    if (responseVal) metaPills.push(`Customer Response: ${responseVal}`);
    if (modeVal) metaPills.push(`Mode: ${modeVal}`);

    return { metaPills, noteText: noteText || responseVal || text.replace(/^Status changed:\s*/i, "") };
  };

  if (loading) {
    return (
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0"></div>
            <div className="flex-1 space-y-2.5">
              <div className="h-4 bg-slate-100 rounded w-1/3"></div>
              <div className="h-12 bg-slate-50 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-100">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-400">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-800">No activity updates found</h3>
        <p className="mt-1 text-xs text-slate-500">Try adjusting your filters or date range.</p>
      </div>
    );
  }

  const total = pagination.total || notes.length;
  const totalPages = pagination.totalPages || Math.ceil(total / limit) || 1;

  return (
    <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col min-h-[500px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Activity Feed</h2>
          <p className="text-xs text-slate-500 mt-0.5">Clean point-wise notes & team updates.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Show</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      {/* Clean Straight Timeline List */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 flex-1">
        {notes.map((note) => {
          const isLead = note.note_type === "lead";
          const { date, time } = formatDate(note.created_at);
          const initials = getInitials(note.created_by_name);
          const { metaPills, noteText } = parseContent(note.content);

          return (
            <div key={`${note.note_type}-${note.id}`} className="relative flex gap-4 group">
              {/* Node Icon on Timeline */}
              <div className={`absolute -left-6 top-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white shadow-sm ring-4 ring-white ${isLead ? "bg-indigo-600" : "bg-emerald-600"}`}>
                {initials}
              </div>

              {/* Feed Card */}
              <div className="flex-1 rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-indigo-100">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${isLead ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {note.note_type}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      {note.entity_name || "Unnamed"}
                      {note.entity_company_name && (
                        <span className="text-slate-500 font-normal"> ({note.entity_company_name})</span>
                      )}
                    </h4>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    {date} • {time}
                  </span>
                </div>

                {/* Sub details: phone, email, product */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-2.5">
                  {note.phone && (
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      📞 {note.phone}
                    </span>
                  )}
                  {note.email && (
                    <span className="flex items-center gap-1">
                      ✉️ {note.email}
                    </span>
                  )}
                  {note.product_name && (
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 border border-indigo-100">
                      {note.product_name}
                    </span>
                  )}
                </div>

                {/* Muted Call Metadata Pills if present */}
                {metaPills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    {metaPills.map((pill, pIdx) => (
                      <span key={pIdx} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200/60">
                        {pill}
                      </span>
                    ))}
                  </div>
                )}

                {/* HIGHLIGHTED NOTE CONTENT */}
                <div className="rounded-xl border-l-4 border-indigo-600 bg-slate-900 p-3.5 shadow-sm text-white">
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] font-black uppercase tracking-wider text-amber-400">
                    <span>📝 Note / Remark ({note.created_by_name || "User"}):</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white leading-relaxed whitespace-pre-wrap">
                    {noteText}
                  </p>
                </div>

                {/* Footer bar */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-50 text-xs">
                  <span className="text-slate-500 font-medium">
                    Updated by <strong className="text-slate-800">{note.created_by_name}</strong> ({note.created_by_role || "User"})
                  </span>
                  <button
                    onClick={() => onNavigate(note)}
                    className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 text-[11px]"
                  >
                    View Profile &rarr;
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Bar */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <span className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-800">{(page - 1) * limit + 1}</strong> to{" "}
          <strong className="text-slate-800">{Math.min(page * limit, total)}</strong> of{" "}
          <strong className="text-slate-800">{total}</strong> records
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            ← Prev
          </button>
          
          <span className="px-3 py-1 text-xs font-extrabold text-indigo-600">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
