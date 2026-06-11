"use client";

export default function RecentUpdatesFeed({ notes, loading, onNavigate }) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex gap-4 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-slate-100 shrink-0"></div>
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-slate-100 rounded w-1/4"></div>
              <div className="h-16 bg-slate-50 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex-1 rounded-2xl bg-white p-16 text-center shadow-sm border border-slate-100">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-300">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800">No activity found</h3>
        <p className="mt-1 text-slate-500">Try adjusting your date range or filter settings.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-2xl bg-white p-4 sm:p-8 shadow-sm border border-slate-100">
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Activity Report</h2>
          <p className="text-xs text-slate-500 mt-1">Detailed timeline of recent notes and updates.</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 border border-indigo-100">
          {notes.length} {notes.length === 1 ? "Record" : "Records"}
        </span>
      </div>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-100 before:via-slate-200 before:to-transparent">
        {notes.map((note) => {
          const isLead = note.note_type === "lead";
          const { date, time } = formatDate(note.created_at);

          return (
            <div key={`${note.note_type}-${note.id}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <div className={`flex h-full w-full items-center justify-center rounded-full text-xs font-black text-white shadow-inner ${isLead ? 'bg-gradient-to-br from-indigo-500 to-indigo-600' : 'bg-gradient-to-br from-emerald-500 to-emerald-600'}`}>
                  {getInitials(note.created_by_name)}
                </div>
              </div>

              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-5 rounded-2xl border border-slate-100 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 relative group-hover:-translate-y-1">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider ${isLead ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {note.note_type}
                      </span>
                      <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 border border-slate-100">
                        {date} • {time}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {note.entity_name || "Unnamed"} 
                      {note.entity_company_name && <span className="text-slate-500 font-medium"> ({note.entity_company_name})</span>}
                    </h4>
                    {note.product_name && (
                      <div className="text-xs font-semibold text-indigo-600 mt-0.5">{note.product_name}</div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-slate-200"></div>
                    <p className="text-sm text-slate-600 pl-3 leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {getInitials(note.created_by_name)}
                      </div>
                      <span className="text-xs font-medium text-slate-600">{note.created_by_name} <span className="text-slate-400">({note.created_by_role})</span></span>
                    </div>
                    <button onClick={() => onNavigate(note)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                      View Profile <span aria-hidden="true">&rarr;</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
