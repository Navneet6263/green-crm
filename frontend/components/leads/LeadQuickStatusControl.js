"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "../../lib/api";
import { LEAD_STATUS_ORDER, getLeadStatusLabel } from "../../lib/leadStatus";
import LeadStatusUpdateDialog from "./LeadStatusUpdateDialog";
import { buildStatusActivityDescription } from "./LeadStatusUpdateUtils";
const SELECT_CLASS =
  "min-h-[38px] rounded-full border border-[#eadfcd] bg-white px-3 py-2 text-xs font-semibold text-[#5d503c] outline-none transition focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";

export default function LeadQuickStatusControl({
  assigneeOptions = [],
  disabled = false,
  lead,
  token,
  onUpdated,
  hideLabel = false,
  className = "",
  selectClassName = "",
}) {
  const currentStatus = String(lead?.status || "new").toLowerCase();
  const [nextStatus, setNextStatus] = useState(currentStatus);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNextStatus(currentStatus);
    setDialogOpen(false);
    setError("");
  }, [lead?.lead_id, currentStatus]);

  function cancelDialog() {
    setNextStatus(currentStatus);
    setDialogOpen(false);
    setError("");
  }

  async function createNextFollowUp(followUp, note) {
    if (!followUp.required) {
      return null;
    }

    const due = `${followUp.date} ${followUp.time}:00`;
    const title = `${getLeadStatusLabel(nextStatus)} follow-up`;
    await apiRequest("/tasks", {
      method: "POST",
      token,
      body: {
        assigned_to: followUp.assignee || lead.assigned_to || undefined,
        company_id: lead.company_id || undefined,
        due_date: due,
        priority: lead.priority || "medium",
        related_id: lead.lead_id,
        related_to: "lead",
        team_id: lead.team_id || undefined,
        title,
        type: followUp.mode,
        notes: note,
      },
    });

    return { due, title };
  }

  async function saveStatusUpdate({ demo = {}, followUp, isDemoStatus = false, note }) {
    if (!token || !lead?.lead_id || saving || nextStatus === currentStatus) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updatedLead = await apiRequest(`/leads/${lead.lead_id}`, {
        method: "PATCH",
        token,
        body: {
          assigned_to: isDemoStatus ? demo.assignee : undefined,
          change_note: isDemoStatus ? buildStatusActivityDescription({ assigneeOptions, currentStatus, demo, lead, nextStatus, note }) : note,
          requirements: isDemoStatus ? demo.requirement.trim() : undefined,
          status: nextStatus,
        },
      });
      const demoFollowUp = isDemoStatus ? { assignee: demo.assignee, date: demo.date, mode: "meeting", required: true, time: demo.time } : followUp;
      const description = buildStatusActivityDescription({ assigneeOptions, currentStatus, demo, followUp: demoFollowUp, lead, nextStatus, note });
      const scheduled = await createNextFollowUp(demoFollowUp, description);

      await apiRequest(`/leads/${lead.lead_id}/activity`, {
        method: "POST",
        token,
        body: { description, type: scheduled ? "task" : "updated" },
      });

      setDialogOpen(false);
      setNextStatus(String(updatedLead.status || nextStatus).toLowerCase());
      if (onUpdated) {
        await onUpdated(updatedLead, { activityDescription: description, note, scheduled });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`relative min-w-0 ${className}`.trim()}>
      <div className="flex flex-wrap items-center gap-2">
        {!hideLabel ? <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9a886d]">Status</span> : null}
        <select
          className={`${SELECT_CLASS} ${selectClassName}`.trim()}
          value={nextStatus}
          onChange={(event) => {
            const value = event.target.value;
            setNextStatus(value);
            setError("");
            if (value !== currentStatus) setDialogOpen(true);
          }}
          disabled={disabled || saving}
        >
          {LEAD_STATUS_ORDER.map((status) => <option key={status} value={status}>{getLeadStatusLabel(status)}</option>)}
        </select>
      </div>

      {dialogOpen ? (
        <LeadStatusUpdateDialog
          assigneeOptions={assigneeOptions}
          currentStatus={currentStatus}
          disabled={disabled}
          error={error}
          lead={lead}
          nextStatus={nextStatus}
          onCancel={cancelDialog}
          onSave={saveStatusUpdate}
          saving={saving}
          setNextStatus={setNextStatus}
        />
      ) : null}
    </div>
  );
}
