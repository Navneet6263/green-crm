// file: frontend/components/customers/CustomerServiceHistory.js
"use client";

import { useState } from "react";
import DashboardIcon from "../dashboard/icons";

export default function CustomerServiceHistory({
  customer,
  prevLeads = [],
  relatedTasks = [],
  onSubmitTask,
}) {
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskType, setTaskType] = useState("call");
  const [taskNotes, setTaskNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    onSubmitTask({
      title: taskTitle,
      type: taskType,
      due_date: taskDueDate,
      notes: taskNotes,
    }).finally(() => {
      setSubmitting(false);
      setTaskTitle("");
      setTaskDueDate("");
      setTaskNotes("");
      setTaskFormOpen(false);
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px] xl:items-start">
      {/* Left Column: Leads & Tasks list */}
      <div className="space-y-5">
        {/* Linked Leads */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pipeline</p>
          <h2 className="mt-1 mb-4 text-lg font-bold text-slate-900">Linked Leads History</h2>
          
          {prevLeads.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {prevLeads.map((lead) => (
                <div key={lead.lead_id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{lead.product_name || "Lead"}</p>
                    <p className="text-slate-400">Created: {new Date(lead.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold uppercase tracking-wider text-[10px] text-slate-600">
                      {lead.status}
                    </span>
                    <span className="font-bold text-slate-700">₹{Number(lead.estimated_value || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-4">No previous leads found.</p>
          )}
        </div>

        {/* Linked Tasks */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Execution</p>
          <h2 className="mt-1 mb-4 text-lg font-bold text-slate-900">Related Tasks</h2>
          
          {relatedTasks.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {relatedTasks.map((task) => (
                <div key={task.task_id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{task.title} ({task.type})</p>
                    <p className="text-slate-400">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    task.status === "completed" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-4">No related tasks found.</p>
          )}
        </div>
      </div>

      {/* Right Column: Create New Task Pre-filled */}
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Task Desk</p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900">Task Actions</h2>
            </div>
            {!taskFormOpen && (
              <button
                onClick={() => setTaskFormOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-bold text-white transition"
              >
                Create New Task
              </button>
            )}
          </div>

          {taskFormOpen ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-400"
                  placeholder="Task title..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-400"
                  >
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="email">Email</option>
                    <option value="todo">To-Do</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Due Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes</label>
                <textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-400"
                  rows="3"
                  placeholder="Additional task details..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 text-xs transition"
                >
                  {submitting ? "Creating..." : "Save Task"}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFormOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-slate-400 italic">Click the button to schedule a new task for {customer.company_name || customer.name}.</p>
          )}
        </div>
      </div>
    </div>
  );
}
