import React, { useState } from 'react';
import { apiRequest } from '../lib/api';

export default function TaskActionDrawer({ task, session, onClose, onSuccess }) {
  const [qualityTier, setQualityTier] = useState('Standard');
  const [notes, setNotes] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [fullTask, setFullTask] = useState(task);
  const [loadingDocs, setLoadingDocs] = useState(false);

  React.useEffect(() => {
    let isMounted = true;
    const fetchFullTask = async () => {
      if (!session?.token || !task?.lead_id) return;
      setLoadingDocs(true);
      try {
        const data = await apiRequest(`/leads/${task.lead_id}`, { token: session.token });
        if (isMounted) {
          setFullTask(data);
        }
      } catch (err) {
        console.error("Failed to load full task details:", err);
      } finally {
        if (isMounted) setLoadingDocs(false);
      }
    };
    fetchFullTask();
    return () => { isMounted = false; };
  }, [task?.lead_id, session]);

  const handleFileSelection = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session || submitting) return;

    if (selectedFiles.length === 0 && !externalLink.trim()) {
      alert("Please upload at least one deliverable file or provide an external link.");
      return;
    }
    
    setSubmitting(true);
    
    try {
      const uploadedFiles = [];
      for (const file of selectedFiles) {
        const uploadResponse = await apiRequest(`/workflow/${fullTask.lead_id}/upload`, {
          method: "POST",
          token: session.token,
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
      
      await apiRequest(`/workflow/${fullTask.lead_id}/submit`, {
        method: "POST",
        token: session.token,
        body: { 
          completedFiles: uploadedFiles, 
          quality: qualityTier, 
          expertNotes: notes, 
          expertLink: externalLink.trim() 
        },
      });

      alert('Task successfully updated and submitted for review!');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Failed to submit work: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const taskTitle = fullTask.requirements 
    ? (task.requirements.length > 60 ? task.requirements.slice(0, 60) + "..." : task.requirements) 
    : `Task for ${fullTask.company_name || fullTask.contact_person || "Unnamed"}`;

  const calculateDeadline = (dateStr) => {
    if (!dateStr) return { text: 'No Deadline', overdue: false };
    const diffTime = new Date(dateStr) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} days`, overdue: true };
    if (diffDays === 0) return { text: 'Due today', overdue: false };
    return { text: `${diffDays} days left`, overdue: false };
  };

  const deadline = calculateDeadline(fullTask.follow_up_date);
  
  // Parse previous submissions
  let previousSubmissions = [];
  try {
    previousSubmissions = typeof fullTask.completed_files === "string" 
      ? JSON.parse(fullTask.completed_files) 
      : (fullTask.completed_files || []);
  } catch (e) {
    previousSubmissions = [];
  }

  return (
    <div className="w-[480px] flex flex-col bg-white h-full shrink-0 shadow-[-4px_0_15px_rgba(0,0,0,0.03)] border-l border-gray-200">
      
      {/* Drawer Header */}
      <div className="p-6 border-b border-gray-200 flex flex-col gap-3 sticky top-0 bg-white z-20">
        <div className="flex justify-between items-start">
          <h2 className="text-xl font-semibold text-gray-900 leading-snug pr-4">{taskTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full p-1.5 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${String(fullTask.priority).toLowerCase() === 'high' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            {fullTask.priority || "Medium"}
          </span>
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${fullTask.workflow_status === 'revisions_needed' ? 'bg-[#FDF3E1] text-[#9A6A24]' : 'bg-blue-50 text-blue-700'}`}>
            {fullTask.workflow_status === 'revisions_needed' ? 'Revision needed' : 'Expert working'}
          </span>
        </div>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        
        {/* Admin Feedback (Conditional) */}
        {fullTask.workflow_status === 'revisions_needed' && fullTask.admin_comments && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-3">Admin feedback</h3>
            <div className="bg-[#FDF8F3] border border-[#F3E5CB] rounded-xl p-4 flex gap-3">
              <svg className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-amber-900 leading-relaxed">{fullTask.admin_comments}</p>
            </div>
          </div>
        )}

        {/* Requirements */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-3">Requirements</h3>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{fullTask.requirements || "No details provided."}</p>
        </div>

        {/* Deadline */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-3">Deadline</h3>
          <div className={`flex items-center gap-2 text-sm font-medium ${deadline.overdue ? 'text-red-700' : 'text-gray-800'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{fullTask.follow_up_date ? new Date(fullTask.follow_up_date).toLocaleDateString() : "No Deadline"} {deadline.overdue && '— Overdue'}</span>
          </div>
        </div>

        {/* Requirement Files */}
        {fullTask.documents && fullTask.documents.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-3">Requirement files {loadingDocs ? <span className="text-[10px] text-gray-400 normal-case ml-2">(Loading documents...)</span> : null}</h3>
            <div className="space-y-2">
              {fullTask.documents.map((doc, idx) => (
                <div key={idx} className="flex justify-between items-center bg-[#F8F9FA] border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-gray-800 font-medium truncate max-w-[200px]">{doc.file_name}</span>
                  </div>
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous Submissions */}
        {previousSubmissions && previousSubmissions.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-3">Your previous submission</h3>
            <div className="space-y-2">
              {previousSubmissions.map((file, idx) => {
                const href = file.url && /^https?:\/\//i.test(file.url) ? file.url : `${file.url || "#"}`;
                return (
                  <div key={idx} className="flex justify-between items-center bg-[#FDF6E9] border border-[#F3E5CB] rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-amber-900 font-medium truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <a href={href} target="_blank" rel="noreferrer" className="text-amber-800 text-sm font-semibold hover:text-amber-950 transition-colors">
                      View
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload & Form Section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-3">Upload revised work</h3>
          
          <label className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-100 transition-colors cursor-pointer mb-6 relative">
            <input type="file" multiple onChange={handleFileSelection} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-gray-700">Drop files or click to browse</p>
            <p className="text-xs text-gray-500 mt-1">PDF, DOC, XLS, ZIP, MP3, MP4</p>
            {selectedFiles.length > 0 && (
              <p className="text-xs text-blue-600 mt-2 font-medium">Selected: {selectedFiles.map(f => f.name).join(", ")}</p>
            )}
          </label>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quality Tier</label>
              <select 
                value={qualityTier}
                onChange={(e) => setQualityTier(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Basic">Basic</option>
                <option value="Standard">Standard</option>
                <option value="Premium">Premium</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">External Link</label>
              <input 
                type="url" 
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes for Admin</label>
              <textarea 
                rows="3" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Add any contextual notes here..."
              ></textarea>
            </div>
            
            <div className="pt-4 pb-2">
              <button 
                type="submit" 
                disabled={submitting}
                className={`w-full py-3.5 bg-white border-2 border-gray-900 rounded-xl text-gray-900 text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submitting ? 'Submitting...' : 'Submit revised work'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
