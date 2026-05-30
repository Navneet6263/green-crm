export function AlertBanner({ error, message, messageTone }) {
  if (!error && !message) return null;

  return (
    <>
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}
      {message && (
        <div 
          className={`rounded-2xl px-4 py-3 text-sm font-medium ${
            messageTone === "warning" 
              ? "border border-amber-200 bg-amber-50 text-amber-800" 
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </div>
      )}
    </>
  );
}
