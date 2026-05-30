// file: frontend/app/dashboard/expert/ExpertTaskDrawer.js
"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

export default function ExpertTaskDrawer({ lead, onClose, onSuccess }) {
  const [leadDetail, setLeadDetail] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [expertLink, setExpertLink] = useState("");
  const [quality, setQuality] = useState("Standard");
  const [expertNotes, setExpertNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const session = loadSession();
  const token = session?.token;

  useEffect(() => {
    if (!lead || !token) return;
    setLoadingDetails(true);
    setSuccess(false);
    setError("");
    setSelectedFiles([]);
    setExpertLink("");
    setExpertNotes("");
    setQuality("Standard");
    apiRequest(`/leads/${lead.lead_id}`, { token })
      .then((data) => setLeadDetail(data))
      .catch((err) => setError(err.message || "Failed to load task details"))
      .finally(() => setLoadingDetails(false));
  }, [lead, token]);

  if (!lead) return null;

  function handleFileSelection(e) {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token || submitting) return;
    setSubmitting(true);
    setError("");

    if (selectedFiles.length === 0 && !expertLink.trim()) {
      setError("Please upload at least one deliverable file or provide an external link.");
      setSubmitting(false);
      return;
    }

    try {
      const uploadedFiles = [];
      for (const file of selectedFiles) {
        const uploadResponse = await apiRequest(`/workflow/${lead.lead_id}/upload`, {
          method: "POST",
          token,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "x-file-name": encodeURIComponent(file.name || "document"),
          },
          rawBody: file,
        });
        const doc = uploadResponse?.data || uploadResponse;
        uploadedFiles.push({
          name: doc.file_name || file.name,
          url: doc.file_url || "",
        });
      }

      await apiRequest(`/workflow/${lead.lead_id}/submit`, {
        method: "POST",
        token,
        body: { completedFiles: uploadedFiles, quality, expertNotes, expertLink: expertLink.trim() },
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />
        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="pointer-events-auto w-screen max-w-md border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex h-full flex-col overflow-y-auto p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-900">Task Details</h2>
              <button onClick={onClose} className="rounded-md text-slate-400 hover:text-slate-500 focus:outline-none">
                ✕ Close
              </button>
            </div>

            {loadingDetails ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Loading details...</div>
            ) : (
              <div className="flex-1 space-y-6">
                {error && <div className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
                {success && <div className="rounded-lg bg-green-50 p-3 text-xs font-semibold text-green-700">✓ Submitted successfully!</div>}

                {/* Admin feedback banner — shown only when revisions are needed */}
                {leadDetail?.workflow_status === "revisions_needed" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">⚠️ Admin Feedback</p>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      {leadDetail?.admin_comments || "No specific comments provided. Please review and resubmit."}
                    </p>
                  </div>
                )}

                {/* Previously uploaded files — shown when revisions needed */}
                {leadDetail?.workflow_status === "revisions_needed" && (() => {
                  let prevFiles = [];
                  try {
                    prevFiles = typeof leadDetail.completed_files === "string"
                      ? JSON.parse(leadDetail.completed_files)
                      : (leadDetail.completed_files || []);
                    if (!Array.isArray(prevFiles)) prevFiles = [];
                  } catch (_) { prevFiles = []; }
                  return prevFiles.length > 0 ? (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Your Previous Submission</span>
                      <div className="space-y-1.5">
                        {prevFiles.map((file, idx) => {
                          const href = file.url && /^https?:\/\//i.test(file.url) ? file.url : `${file.url || "#"}`;
                          return (
                            <a
                              key={idx}
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition text-xs"
                            >
                              <span>📎</span>
                              <span className="flex-1 truncate font-semibold text-slate-700">{file.name || "File"}</span>
                              <span className="text-blue-600 font-bold text-[10px] uppercase">View</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description / Requirements</span>
                  <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {leadDetail?.requirements || "No details provided."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</span>
                    <p className="text-xs font-bold text-slate-800 uppercase mt-0.5">{leadDetail?.priority || "Medium"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deadline</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {leadDetail?.follow_up_date ? new Date(leadDetail.follow_up_date).toLocaleDateString() : "No deadline"}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Requirements / Files</span>
                  {leadDetail?.documents?.length ? (
                    <div className="space-y-1.5">
                      {leadDetail.documents.map((doc) => {
                        const ext = String(doc.file_name).split('.').pop().toLowerCase();
                        const icon = ext === 'pdf' ? '📄' : ext === 'zip' ? '📦' : ['mp4', 'mkv'].includes(ext) ? '🎥' : '📁';
                        return (
                          <a
                            key={doc.id}
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-white transition"
                          >
                            <span className="text-lg">{icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-700 truncate">{doc.file_name}</p>
                              <p className="text-[10px] text-slate-400">Download Requirement</p>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No attached documents.</p>
                  )}
                </div>

                {leadDetail?.workflow_status !== "completed" && (
                  <form onSubmit={handleSubmit} className="border-t border-slate-100 pt-5 space-y-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Submit Work</span>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Upload Deliverables</label>
                      <input type="file" multiple onChange={handleFileSelection} className="w-full text-xs" />
                      {selectedFiles.length > 0 && (
                        <div className="mt-2 text-xs text-slate-500">
                          Selected: {selectedFiles.map(f => f.name).join(", ")}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">External Link (optional)</label>
                      <input
                        type="url"
                        value={expertLink}
                        onChange={(e) => setExpertLink(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-400"
                        placeholder="https://example.com/deliverables"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Quality Tier</label>
                      <select value={quality} onChange={(e) => setQuality(e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-lg">
                        <option value="Basic">Basic</option>
                        <option value="Standard">Standard</option>
                        <option value="Premium">Premium</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Expert Notes</label>
                      <textarea
                        value={expertNotes}
                        onChange={(e) => setExpertNotes(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                        rows="3"
                        placeholder="Provide summary of work..."
                      />
                    </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition"
                      >
                        {submitting ? "Submitting..." : "Submit Work"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
