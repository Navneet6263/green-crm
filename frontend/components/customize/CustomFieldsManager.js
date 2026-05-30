import { useState } from "react";
import DashboardIcon from "../dashboard/icons";

export default function CustomFieldsManager({ customFields, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newField, setNewField] = useState({ name: "", type: "text", required: false });

  const addField = () => {
    if (!newField.name.trim()) return;

    const field = {
      id: `cf_${Date.now()}`,
      name: newField.name.trim(),
      type: newField.type,
      required: newField.required,
      options: newField.type === "select" ? [] : undefined,
    };

    onChange([...customFields, field]);
    setNewField({ name: "", type: "text", required: false });
  };

  const removeField = (fieldId) => {
    onChange(customFields.filter((f) => f.id !== fieldId));
  };

  return (
    <div className="rounded-[24px] border border-[#eadfcd] bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#fffaf1] transition-colors"
      >
        <div>
          <h3 className="text-lg font-semibold text-[#060710]">Custom Fields</h3>
          <p className="mt-1 text-xs text-[#8f816a]">
            Add custom fields to capture additional lead information
          </p>
        </div>
        <div className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
          <DashboardIcon name="chevron-down" className="h-5 w-5 text-[#7c6d55]" />
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-[#eadfcd]/50">
          <div className="pt-4 space-y-4">
            {/* Existing Custom Fields */}
            {customFields.length > 0 && (
              <div className="space-y-2">
                {customFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between gap-4 rounded-[16px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#060710]">{field.name}</p>
                      <p className="text-xs text-[#8f816a]">
                        Type: {field.type} {field.required && "• Required"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeField(field.id)}
                      className="text-rose-600 hover:text-rose-700"
                    >
                      <DashboardIcon name="edit" className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Field */}
            <div className="rounded-[18px] border border-[#eadfcd] bg-[#fffaf1] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8f816a] mb-3">
                Add New Field
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Field Name"
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  className="rounded-[12px] border border-[#eadfcd] bg-white px-3 py-2 text-sm text-[#060710] focus:border-[#7c6d55] focus:outline-none focus:ring-1 focus:ring-[#7c6d55]"
                />
                <select
                  value={newField.type}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                  className="rounded-[12px] border border-[#eadfcd] bg-white px-3 py-2 text-sm text-[#060710] focus:border-[#7c6d55] focus:outline-none focus:ring-1 focus:ring-[#7c6d55]"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="date">Date</option>
                  <option value="select">Dropdown</option>
                </select>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newField.required}
                    onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-[#7c6d55] text-[#7c6d55] focus:ring-[#7c6d55]"
                  />
                  <span className="text-xs text-[#8f816a]">Required</span>
                </label>
                <button
                  type="button"
                  onClick={addField}
                  disabled={!newField.name.trim()}
                  className="rounded-[12px] bg-[#7c6d55] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6f614c] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
