export function CustomizationDebug({ customization, enabledStatuses }) {
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs shadow-lg z-50">
      <p className="font-bold text-amber-900 mb-2">🔍 Customization Debug</p>
      <div className="space-y-1 text-amber-800">
        <p>Loaded: {customization ? '✅' : '❌'}</p>
        <p>Enabled Statuses ({enabledStatuses.length}):</p>
        <div className="ml-2 text-[10px] font-mono">
          {enabledStatuses.map(s => (
            <div key={s}>• {s}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
