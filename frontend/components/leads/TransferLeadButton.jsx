// frontend/components/leads/TransferLeadButton.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowRightLeft, X, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";

const INPUT = "w-full rounded-[16px] border border-[#eadfcd] bg-white px-3 py-2.5 text-sm text-[#060710] outline-none focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const LABEL = "text-[10px] font-black uppercase tracking-[0.22em] text-[#9a886d]";
const PRIMARY = "inline-flex min-h-[40px] items-center justify-center rounded-[16px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2 text-sm font-semibold text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST = "inline-flex min-h-[40px] items-center justify-center rounded-[16px] border border-[#eadfcd] bg-white px-4 py-2 text-sm font-semibold text-[#5d503c]";

export default function TransferLeadButton({ leadId, leadName }) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(null); // null, 'reasons', 'select'
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const searchTimeoutRef = useRef(null);

  const session = loadSession();
  const token = session?.token;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounced user search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await apiRequest(`/users/search?q=${encodeURIComponent(searchQuery)}`, {
          token,
        });
        setUsers(response || []);
      } catch (error) {
        console.error("Failed to search users:", error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, token]);

  const handleOpen = () => {
    setStep("reasons");
    setSearchQuery("");
    setSelectedUser(null);
    setNote("");
  };

  const handleClose = () => {
    setStep(null);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!selectedUser || !note.trim()) return;

    setSubmitting(true);
    try {
      await apiRequest(`/leads/${leadId}/transfer`, {
        method: "POST",
        token,
        body: {
          toUserId: selectedUser.id,
          note: note.trim(),
        },
      });
      toast.success("Lead transferred successfully!");
      handleClose();
    } catch (error) {
      toast.error(error.message || "Failed to transfer lead");
    } finally {
      setSubmitting(false);
    }
  };

  const dialog = step ? (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#060710]/35 p-3 sm:items-center backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-[#eadfcd] bg-white p-5 shadow-[0_30px_80px_rgba(6,7,16,0.22)]">
        
        {/* STEP 2 - Reasons Modal */}
        {step === "reasons" && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#060710]">Transfer Lead</h2>
                <p className="mt-1 text-sm text-[#7a6b57]">Review verification checklist before initiating a lead transfer.</p>
              </div>
              <button className={GHOST} type="button" onClick={handleClose}>Close</button>
            </div>

            <div className="mt-5 rounded-[18px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-3 text-sm font-bold text-[#060710]">
              Lead to Transfer: <span className="font-extrabold text-[#b45309]">{leadName}</span>
            </div>

            <div className="mt-4 space-y-3">
              <span className={LABEL}>Checklist of Verification Reasons</span>
              <div className="grid gap-2">
                {[
                  "Called multiple times, no response from customer",
                  "Customer declined the offer for now",
                  "Wrong number or unable to reach",
                  "Another team member can follow up better"
                ].map((reason, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-[16px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-semibold text-[#5d503c]">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#f3dfab] text-[#060710] font-bold text-xs">
                      ✓
                    </div>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] p-4 text-xs leading-relaxed text-[#7a6b57] font-semibold flex gap-3">
              <span className="text-sm shrink-0">ℹ️</span>
              <span>
                This transfer is fully safe. Lead assignment, status, history, and metrics remain untouched. Only a descriptive note will be added to the lead activity logs.
              </span>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button className={GHOST} type="button" onClick={handleClose}>Cancel</button>
              <button className={PRIMARY} type="button" onClick={() => setStep("select")}>Understood, proceed &rarr;</button>
            </div>
          </div>
        )}

        {/* STEP 3 - Select Person + Note */}
        {step === "select" && (
          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#060710]">Who should review this lead?</h2>
                <p className="mt-1 text-sm text-[#7a6b57]">Select recipient member and add transfer notes.</p>
              </div>
              <button className={GHOST} type="button" onClick={handleClose}>Close</button>
            </div>

            {/* Selected Recipient Pill */}
            {selectedUser ? (
              <div className="mt-5 space-y-2">
                <span className={LABEL}>Assigned Recipient</span>
                <div className="flex items-center justify-between rounded-[16px] border border-[#d7b258] bg-[#fffaf1] px-4 py-3 text-sm font-bold text-[#060710]">
                  <div>
                    <span className="block font-bold">{selectedUser.name}</span>
                    <span className="block text-xs font-semibold text-[#9a886d] capitalize mt-0.5">{selectedUser.role}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="rounded-full p-1 text-[#5d503c] hover:bg-[#eadfcd] transition duration-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-2 relative">
                <label className={LABEL}>Search Recipient</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className={INPUT}
                  autoFocus
                />
                
                {/* Search Results Dropdown */}
                {(searching || searchQuery.trim()) && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-[16px] border border-[#eadfcd] bg-white py-1.5 shadow-lg">
                    {searching ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-[#9a886d]">
                        <Loader2 className="h-4 w-4 animate-spin text-[#d7b258]" />
                        Searching team members...
                      </div>
                    ) : users.length > 0 ? (
                      users.map((u) => (
                        <button
                          key={u.user_id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(u);
                            setSearchQuery("");
                          }}
                          className="flex w-full items-start justify-between px-4 py-2.5 text-left text-sm hover:bg-[#fffaf1] transition"
                        >
                          <div>
                            <span className="block font-bold text-[#060710]">{u.name}</span>
                            <span className="block text-xs font-medium text-[#7a6b57] mt-0.5">{u.email}</span>
                          </div>
                          <span className="rounded-full bg-white border border-[#eadfcd] px-2.5 py-0.5 text-[10px] font-bold text-[#5d503c] uppercase mt-0.5">
                            {u.role}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="py-4 text-center text-xs font-bold text-[#9a886d]">No users found</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Transfer Note Textarea */}
            <label className="mt-4 block space-y-2">
              <span className={LABEL}>Transfer Note *</span>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Called 3 times, spoke once, customer had budget concerns..."
                className={`${INPUT} min-h-[132px] resize-y`}
                required
              />
            </label>

            {/* Form Buttons */}
            <div className="mt-5 flex justify-end gap-2">
              <button className={GHOST} type="button" onClick={() => setStep("reasons")} disabled={submitting}>Back</button>
              <button
                type="submit"
                disabled={!selectedUser || !note.trim() || submitting}
                className={PRIMARY}
              >
                {submitting ? "Transferring..." : "Transfer Lead"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  ) : null;

  return (
    <>
      {/* Step 1 - Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex min-h-[32px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 mb-2 shadow-sm"
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Transfer Lead
      </button>

      {/* Render Portal under document.body to ensure backdrop blur works globally */}
      {step && mounted ? createPortal(dialog, document.body) : null}
    </>
  );
}
