import { useState } from "react";
import DashboardIcon from "../dashboard/icons";

export default function LeadFormFieldsCustomizer({ fields, onChange }) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleField = (fieldKey) => {
    onChange({
      ...fields,
      [fieldKey]: {
        ...fields[fieldKey],
        enabled: !fields[fieldKey].enabled,
      },
    });
  };

  const toggleRequired = (fieldKey) => {
    onChange({
      ...fields,
      [fieldKey]: {
        ...fields[fieldKey],
        required: !fields[fieldKey].required,
      },
    });
  };

  const fieldsList = Object.entries(fields);

  return (
    <div className="rounded-[14px] border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Lead Form Fields</h3>
          <p className="mt-1 text-xs text-slate-500">
            Configure which fields appear in the Add Lead form
          </p>
        </div>
        <div className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
          <DashboardIcon name="chevron-down" className="h-5 w-5 text-brand-700" />
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <div className="pt-4 space-y-2">
            {fieldsList.map(([key, field]) => (
              <div
                key={key}
                className={`flex items-center justify-between gap-4 rounded-[16px] border px-4 py-3 ${
                  field.enabled ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white"
                }`}
              >
                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={() => toggleField(key)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-200"
                  />
                  <span className="text-sm font-medium text-slate-900">{field.label}</span>
                </label>

                {field.enabled && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={() => toggleRequired(key)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-700 focus:ring-brand-200"
                    />
                    <span className="text-xs text-slate-500">Required</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
