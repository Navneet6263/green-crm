// frontend/components/leads/LeadTransferModal.jsx
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function LeadTransferModal({ transfer, totalPending, onAcknowledge }) {
  const [responseNote, setResponseNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!responseNote.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onAcknowledge(transfer.id, responseNote.trim());
      setResponseNote("");
    } catch (error) {
      alert("Failed to acknowledge transfer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 flex flex-col gap-6">
        
        {/* Top Badges */}
        <div className="flex items-center justify-between">
          <div className="mx-auto flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
              📋 Action Required
            </span>
          </div>
          {totalPending > 1 && (
            <span className="absolute right-8 top-8 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              1 of {totalPending} pending
            </span>
          )}
        </div>

        {/* Section 1 - Transfer Info */}
        <div className="text-center space-y-1.5">
          <p className="text-sm font-medium text-slate-500">
            A lead has been shared with you for review:
          </p>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {transfer.lead_name}
          </h2>
          <p className="text-sm font-semibold text-slate-600">
            Shared by <span className="text-slate-800 font-bold">{transfer.from_user_name}</span>
          </p>
          <p className="text-xs font-semibold text-slate-400">
            {formatDate(transfer.created_at)}
          </p>
        </div>

        <hr className="border-slate-100" />

        {/* Section 2 - Transfer Note */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Their Note
          </label>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-sm leading-relaxed text-amber-900 font-semibold max-h-36 overflow-y-auto">
            {transfer.transfer_note || <span className="italic text-amber-500">No notes provided.</span>}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Section 3 - Response Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Your Response <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea
              rows={3}
              value={responseNote}
              onChange={(e) => setResponseNote(e.target.value)}
              placeholder="I have reviewed this lead. I will follow up by..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 placeholder-slate-400 outline-none focus:border-green-400 resize-none transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!responseNote.trim() || submitting}
            className="w-full rounded-2xl bg-green-500 hover:bg-green-600 text-white py-4 px-6 font-bold text-base transition flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(34,197,94,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="h-5 w-5 animate-spin text-white" />}
            I have reviewed this — I will follow up ✓
          </button>
        </form>

      </div>
    </div>
  );
}
