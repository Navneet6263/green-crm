"use client";

import { formatWorkflowOwnerIdentity } from "../../../lib/workflowOwners";
import { LEAD_KICKER_CLASS } from "../shared/leadPageConstants";
import { formatLeadDate, formatLeadMoney, titleizeLeadValue } from "../shared/leadPageFormatters";

export default function LeadMetaGrid({ lead, teamBadgeLabel }) {
  const items = [
    { label: "Owner", value: lead.assigned_to_name || "Unassigned" },
    { label: "Team", value: teamBadgeLabel(lead) || "Auto team" },
    { label: "Source", value: titleizeLeadValue(lead.lead_source || "website") },
    { label: "Follow Up", value: formatLeadDate(lead.follow_up_date, true) },
    { label: "Estimated Value", value: formatLeadMoney(lead.estimated_value) },
    { label: "Payment Advance", value: formatLeadMoney(lead.advance_received) },
    { label: "Remaining Payment", value: formatLeadMoney(lead.remaining_payment ?? (Number(lead.estimated_value || 0) - Number(lead.advance_received || 0))) },
    { label: "Units", value: lead.number_of_units ?? "--" },
    { label: "Created", value: formatLeadDate(lead.created_at, true) },
    { label: "Workflow", value: titleizeLeadValue(lead.workflow_stage || "sales") },
    { label: "Legal Owner", value: formatWorkflowOwnerIdentity(lead.legal_owner_name, lead.assigned_to_legal) },
    { label: "Finance Owner", value: formatWorkflowOwnerIdentity(lead.finance_owner_name, lead.assigned_to_finance) },
    { label: "Created By", value: lead.created_by_name || "Unknown" },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
          <p className={LEAD_KICKER_CLASS}>{item.label}</p>
          <p className="mt-3 text-sm font-semibold text-[#060710]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
