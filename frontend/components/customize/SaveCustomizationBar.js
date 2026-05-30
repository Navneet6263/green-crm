export default function SaveCustomizationBar({ saving, onSave }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#eadfcd] bg-white/95 backdrop-blur-sm shadow-lg">
      <div className="mx-auto max-w-[1400px] px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-[#746853]">
            Changes will apply to all new leads and forms
          </p>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-[16px] bg-[#7c6d55] px-6 py-3 text-sm font-semibold text-white hover:bg-[#6f614c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save Customization"}
          </button>
        </div>
      </div>
    </div>
  );
}
