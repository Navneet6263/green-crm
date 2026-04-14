"use client";

export function AlertError({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-medium text-rose-700">
      <span className="min-w-0 flex-1">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto shrink-0 rounded-full p-1 text-rose-400 transition hover:bg-rose-100 hover:text-rose-600"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </button>
      ) : null}
    </div>
  );
}

export function AlertSuccess({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-700">
      <span className="min-w-0 flex-1">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto shrink-0 rounded-full p-1 text-emerald-400 transition hover:bg-emerald-100 hover:text-emerald-600"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </button>
      ) : null}
    </div>
  );
}

export function AlertInfo({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[#eadfcd] bg-white px-3 py-2 text-[13px] font-medium text-[#6f614c]">
      <span className="min-w-0 flex-1">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto shrink-0 rounded-full p-1 text-[#9c8e76] transition hover:bg-[#f6efe2] hover:text-[#5d503c]"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </button>
      ) : null}
    </div>
  );
}
