"use client";

import { useEffect, useRef, useState } from "react";

import { apiRequest } from "../../lib/api";
import { LEAD_STATUS_ORDER, getLeadStatusLabel } from "../../lib/leadStatus";
import LeadStatusUpdateDialog from "./LeadStatusUpdateDialog";
import { buildStatusActivityDescription } from "./LeadStatusUpdateUtils";
const SELECT_CLASS =
  "min-h-[38px] rounded-full border border-[#eadfcd] bg-white px-3 py-2 text-xs font-semibold text-[#5d503c] outline-none transition focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";

export default function LeadQuickStatusControl({
  assigneeOptions = [],
  disabled = false,
  enabledStatuses = [],
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
  const saveLockRef = useRef(false);

  // Use enabled statuses or fall back to all statuses
  const statusOptions = enabledStatuses.length > 0 ? enabledStatuses : LEAD_STATUS_ORDER;

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

  async function createNextFollowUp(followUp, note, statusValue = nextStatus) {
    if (!followUp?.required) {
      return null;
    }

    const due = `${followUp.date} ${followUp.time}:00`;
    const title = `${getLeadStatusLabel(statusValue)} follow-up`;
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

  function saveStatusUpdate({ demo = {}, followUp, isDemoStatus = false, onboardedDate, note }) {
    if (!token || !lead?.lead_id || saveLockRef.current || nextStatus === currentStatus) {
      return;
    }

    const submittedStatus = nextStatus;
    const demoFollowUp = isDemoStatus ? { assignee: demo.assignee, date: demo.date, mode: "meeting", required: true, time: demo.time } : followUp;
    const description = buildStatusActivityDescription({ assigneeOptions, currentStatus, demo, followUp: demoFollowUp, lead, nextStatus: submittedStatus, note });
    const optimisticLead = {
      ...lead,
      assigned_to: isDemoStatus ? demo.assignee : lead.assigned_to,
      requirements: isDemoStatus ? demo.requirement.trim() : lead.requirements,
      onboarded_date: onboardedDate || lead.onboarded_date,
      status: submittedStatus,
    };

    saveLockRef.current = true;
    setSaving(true);
    setError("");
    setDialogOpen(false);
    setNextStatus(submittedStatus);
    onUpdated?.(optimisticLead, { activityDescription: description, note, scheduled: demoFollowUp?.required ? { pending: true } : null });

    (async () => {
      const updatedLead = await apiRequest(`/leads/${lead.lead_id}`, {
        method: "PATCH",
        token,
        body: {
          assigned_to: isDemoStatus ? demo.assignee : undefined,
          change_note: isDemoStatus ? description : note,
          requirements: isDemoStatus ? demo.requirement.trim() : undefined,
          onboarded_date: onboardedDate,
          status: submittedStatus,
        },
      });
      const scheduled = await createNextFollowUp(demoFollowUp, description, submittedStatus);

      await apiRequest(`/leads/${lead.lead_id}/activity`, {
        method: "POST",
        token,
        body: { description, type: scheduled ? "task" : "updated" },
      });

      setNextStatus(String(updatedLead.status || submittedStatus).toLowerCase());
      onUpdated?.(updatedLead, {});
    })().catch((requestError) => {
      setError(requestError.message);
      setDialogOpen(true);
    }).finally(() => {
      saveLockRef.current = false;
      setSaving(false);
    });
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
          {statusOptions.map((status) => <option key={status} value={status}>{getLeadStatusLabel(status)}</option>)}
        </select>
      </div>

      {dialogOpen ? (
        <LeadStatusUpdateDialog
          assigneeOptions={assigneeOptions}
          currentStatus={currentStatus}
          disabled={disabled}
          enabledStatuses={enabledStatuses}
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
