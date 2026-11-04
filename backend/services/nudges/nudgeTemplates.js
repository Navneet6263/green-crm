const { escapeHtml } = require("../emailService");

const IST = "Asia/Kolkata";
const dateText = (value) => (value ? new Date(value).toLocaleString("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "");
const money = (value) => (Number(value) ? `₹${Number(value).toLocaleString("en-IN")}` : "");
const titleize = (value) => String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const daysLate = (value) => {
  if (!value) return 0;
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  return days > 0 ? days : 0;
};
// Notes are saved with section headings; the email only needs the readable part.
const cleanNote = (value) => String(value || "").split(/\n\s*Changes:\s*\n/i)[0].replace(/\s+/g, " ").trim().slice(0, 280);

function row(label, value, tone = "#0f172a") {
  if (!value) return "";
  return `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:140px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;color:${tone};font-size:14px;font-weight:600;">${escapeHtml(value)}</td></tr>`;
}

/** The lead's key facts, so the email makes sense without opening the CRM. */
function leadCard(lead) {
  const late = daysLate(lead.follow_up_date);
  const followUp = lead.follow_up_date ? `${dateText(lead.follow_up_date)}${late ? ` · ${late} day${late === 1 ? "" : "s"} overdue` : ""}` : "Not set";
  return `
    <div style="margin:18px 0;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
      <div style="background:#f8fafc;padding:12px 16px;border-bottom:1px solid #e2e8f0;">
        <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Lead ${escapeHtml(lead.lead_id)}</div>
        <div style="font-size:17px;color:#0f172a;font-weight:700;margin-top:2px;">${escapeHtml(lead.company_name || lead.contact_person || "Lead")}</div>
      </div>
      <div style="padding:6px 16px;">
        <table style="width:100%;border-collapse:collapse;">
          ${row("Contact", [lead.contact_person, lead.phone].filter(Boolean).join(" · "))}
          ${row("Status", titleize(lead.status))}
          ${row("Follow-up", followUp, late ? "#be123c" : "#0f172a")}
          ${row("Owner", lead.assigned_to_name || "Unassigned")}
          ${row("Value", money(lead.estimated_value))}
          ${row("Last update", cleanNote(lead.latest_note))}
        </table>
      </div>
    </div>`;
}

/** A person's numbers for the report email. */
function personCard(person, numbers) {
  const cells = numbers.map(([label, value, tone]) => `
    <td style="padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#ffffff;">
      <div style="font-size:12px;color:#64748b;">${escapeHtml(label)}</div>
      <div style="font-size:20px;font-weight:700;color:${tone || "#0f172a"};margin-top:2px;">${escapeHtml(value)}</div>
    </td>`);
  const rows = [];
  for (let i = 0; i < cells.length; i += 3) rows.push(`<tr>${cells.slice(i, i + 3).join("")}</tr>`);
  return `
    <div style="margin:18px 0;">
      <div style="font-size:17px;color:#0f172a;font-weight:700;">${escapeHtml(person.name)}</div>
      <div style="font-size:13px;color:#64748b;">${escapeHtml([titleize(person.role), person.teams].filter(Boolean).join(" · "))}</div>
      <table style="width:100%;border-collapse:separate;border-spacing:6px;margin-top:8px;">${rows.join("")}</table>
    </div>`;
}

function overdueTable(leads) {
  if (!leads?.length) return "";
  const body = leads.slice(0, 15).map((l) => `
    <tr>
      <td style="padding:7px 8px;border-top:1px solid #f1f5f9;font-size:13px;color:#0f172a;">${escapeHtml(l.company_name || l.contact_person)}</td>
      <td style="padding:7px 8px;border-top:1px solid #f1f5f9;font-size:13px;color:#be123c;white-space:nowrap;">${escapeHtml(dateText(l.follow_up_date))}</td>
    </tr>`).join("");
  return `
    <div style="margin:14px 0 4px;font-size:13px;font-weight:700;color:#0f172a;">Overdue follow-ups</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;">${body}</table>`;
}

/**
 * The whole email. `blocks` are already-safe HTML pieces (cards, tables); `message` is the admin's own text.
 */
function buildEmailHtml({ heading, greeting, message, blocks = [], screenshotCid, linkUrl, linkLabel = "Open in GreenCRM", senderName, refCode }) {
  const paragraphs = escapeHtml(message || "").split(/\n{2,}/).map((p) => `<p style="margin:0 0 12px;">${p.replace(/\n/g, "<br />")}</p>`).join("");
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f3f5f4;padding:24px 12px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:28px;">
      <div style="display:inline-block;padding:5px 11px;border-radius:999px;background:#fff4cc;color:#7a5b00;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(heading)}</div>
      <div style="margin-top:16px;color:#334155;font-size:15px;line-height:1.7;">
        ${greeting ? `<p style="margin:0 0 12px;">${escapeHtml(greeting)}</p>` : ""}
        ${paragraphs}
      </div>
      ${blocks.join("")}
      ${screenshotCid ? `<div style="margin:18px 0;"><div style="font-size:12px;color:#64748b;margin-bottom:6px;">Screenshot</div><img src="cid:${screenshotCid}" alt="Screenshot from GreenCRM" style="max-width:100%;border:1px solid #e2e8f0;border-radius:10px;" /></div>` : ""}
      ${linkUrl ? `<a href="${escapeHtml(linkUrl)}" style="display:inline-block;margin-top:8px;padding:12px 20px;border-radius:10px;background:#0c605d;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">${escapeHtml(linkLabel)}</a>
      <p style="margin:10px 0 0;color:#94a3b8;font-size:12px;">The link opens straight after you log in.</p>` : ""}
      <p style="margin:22px 0 0;padding-top:14px;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:12px;">Sent by ${escapeHtml(senderName)} from GreenCRM · Reply to this email to answer · Ref ${escapeHtml(refCode)}</p>
    </div>
  </div>`;
}

function buildEmailText({ greeting, message, facts = [], linkUrl, senderName, refCode }) {
  return [greeting, "", message, "", ...facts, "", linkUrl ? `Open in GreenCRM: ${linkUrl}` : "", "", `Sent by ${senderName} from GreenCRM · Ref ${refCode}`]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "").join("\n").trim();
}

function leadFacts(lead) {
  const late = daysLate(lead.follow_up_date);
  return [
    `Lead: ${lead.company_name || lead.contact_person} (${lead.lead_id})`,
    `Status: ${titleize(lead.status)}`,
    lead.follow_up_date ? `Follow-up: ${dateText(lead.follow_up_date)}${late ? ` (${late} days overdue)` : ""}` : "",
    `Owner: ${lead.assigned_to_name || "Unassigned"}`,
  ].filter(Boolean);
}

module.exports = { buildEmailHtml, buildEmailText, cleanNote, dateText, daysLate, leadCard, leadFacts, overdueTable, personCard, titleize };
