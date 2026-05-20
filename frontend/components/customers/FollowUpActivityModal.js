"use client";

import { useState } from "react";
import DashboardIcon from "../dashboard/icons";

const C = {
  input: "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50",
  kicker: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
};

const ACTIVITY_TYPES = [
  { value: "call", label: "Phone Call", icon: "phone", color: "emerald" },
  { value: "email", label: "Email", icon: "mail", color: "blue" },
  { value: "meeting", label: "Meeting", icon: "calendar", color: "purple" },
  { value: "whatsapp", label: "WhatsApp", icon: "message", color: "green" },
  { value: "other", label: "Other", icon: "documents", color: "slate" },
];

export default function FollowUpActivityModal({ isOpen, onClose, onSave, saving = false }) {
  const [activityType, setActivityType] = useState("call");
  const [remarks, setRemarks] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!remarks.trim()) return;
    await onSave({ activityType, remarks: remarks.trim() });
    setActivityType("call");
    setRemarks("");
  };

  const handleClose = () => {
    setActivityType("call");
    setRemarks("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Add Follow-up Activity</h2>
            <p className="mt-0.5 text-sm text-slate-500">Record your interaction with the customer</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            disabled={saving}
          >
            <span className="text-xl font-bold">×</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Activity Type Selection */}
          <div className="space-y-2">
            <label className={C.kicker}>Activity Type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ACTIVITY_TYPES.map((type) => {
                const isSelected = activityType === type.value;
                const colorMap = {
                  emerald: isSelected ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200",
                  blue: isSelected ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200",
                  purple: isSelected ? "border-purple-400 bg-purple-50 text-purple-700" : "border-slate-200 bg-white text-slate-600 hover:border-purple-200",
                  green: isSelected ? "border-green-400 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-600 hover:border-green-200",
                  slate: isSelected ? "border-slate-400 bg-slate-50 text-slate-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                };
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setActivityType(type.value)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${colorMap[type.color]}`}
                    disabled={saving}
                  >
                    <DashboardIcon name={type.icon} className="h-4 w-4" />
                    <span className="truncate">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <label className={C.kicker} htmlFor="remarks">
              Remarks
            </label>
            <textarea
              id="remarks"
              className={`${C.input} min-h-[140px] resize-y`}
              rows={5}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="What was discussed? Any action items or next steps..."
              disabled={saving}
              required
            />
            <p className="text-xs text-slate-400">
              Be specific about outcomes, commitments, or concerns raised
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-xl border border-emerald-300 bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              disabled={!remarks.trim() || saving}
            >
              {saving ? "Saving..." : "Save Activity"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
