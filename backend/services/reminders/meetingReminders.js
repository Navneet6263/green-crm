// Meeting emails: when someone puts a meeting or demo on the calendar they get an email with one-click
// "Create Google Meet" / "Outlook / Teams" links (already filled with the time, client and email), and on the
// day of the meeting, from 08:00 IST, a reminder with the same links. Only meetings saved from now on are tracked,
// and only people who proved their email with the monthly login code get these emails.
const { query } = require("../../db/connection");
const { escapeHtml, getFrontendUrl } = require("../emailService");
const { button, sendBranded } = require("../mail/brandedEmail");
const { VERIFIED_SQL } = require("../auth/loginOtp");

const MEETING_TYPES = new Set(["meeting", "demo"]);
const OPEN = "t.status NOT IN ('done', 'completed', 'closed', 'cancelled')";
const IST = 330 * 60000;
const MINUTES = { meeting: 30, demo: 45 };
const DAY_MAIL_HOUR = 8;

const istDay = (date) => new Date(new Date(date).getTime() + IST).toISOString().slice(0, 10);
const istTime = (date) => new Date(date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const stamp = (date) => new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/**
 * Call after a task is created or changed. Only open meeting and demo tasks are tracked.
 * `moved` (the time changed) sends the "meeting saved" email again with the new time.
 */
async function track(task, { moved = false } = {}) {
  if (!task?.task_id || !MEETING_TYPES.has(String(task.type || "").toLowerCase())) return false;
  if (["done", "completed", "closed", "cancelled"].includes(String(task.status || "").toLowerCase())) return false;
  await query(
    `MERGE meeting_reminders AS t USING (SELECT ? AS task_id) AS s ON t.task_id = s.task_id
     WHEN MATCHED AND ? = 1 THEN UPDATE SET scheduled_sent_at = NULL, day_sent_for = NULL
     WHEN NOT MATCHED THEN INSERT (task_id, company_id) VALUES (?, ?);`,
    [task.task_id, moved ? 1 : 0, task.task_id, task.company_id]
  );
  return true;
}

/** What the calendar links need: title, start/end, the client and where to find them in the CRM. */
function meetingDetails(row) {
  const start = new Date(row.due_date);
  const end = new Date(start.getTime() + (MINUTES[row.type] || 30) * 60000);
  const client = row.client_company || row.client_name || "";
  const title = row.title || `Meeting with ${client || "client"}`;
  const contact = [row.client_name, row.client_company].filter(Boolean).join(", ");
  // The event text is seen by the guest too, so it carries no internal notes or CRM links.
  const description = [title, contact ? `With: ${contact}` : "", row.client_phone ? `Phone: ${row.client_phone}` : "", row.owner_name ? `Host: ${row.owner_name}` : ""].filter(Boolean).join("\n");
  const crmLink = row.related_to === "lead" && row.related_id ? `${getFrontendUrl()}/leads/${encodeURIComponent(row.related_id)}`
    : row.related_to === "customer" && row.related_id ? `${getFrontendUrl()}/customers/${encodeURIComponent(row.related_id)}` : `${getFrontendUrl()}/calendar`;
  return { start, end, title, description, guest: row.client_email || "", contact, crmLink };
}

/** Google Calendar opens with everything filled. Google adds a Meet link when the event is saved (or one click on "Add Google Meet"). */
function googleCalendarLink(m) {
  const p = new URLSearchParams({ action: "TEMPLATE", text: m.title, dates: `${stamp(m.start)}/${stamp(m.end)}`, details: m.description, ctz: "Asia/Kolkata" });
  if (m.guest) p.set("add", m.guest);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Outlook on the web; Microsoft 365 accounts can switch on a Teams meeting in the same window. */
function outlookCalendarLink(m) {
  const p = new URLSearchParams({ path: "/calendar/action/compose", rru: "addevent", subject: m.title, startdt: m.start.toISOString(), enddt: m.end.toISOString(), body: m.description });
  if (m.guest) p.set("to", m.guest);
  return `https://outlook.office.com/calendar/0/deeplink/compose?${p.toString()}`;
}

/** A calendar file for any other calendar app. */
function icsFile(m, uid) {
  const esc = (v) => String(v || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GreenCRM//Meetings//EN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${uid}@greencrm`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(m.start)}`, `DTEND:${stamp(m.end)}`, `SUMMARY:${esc(m.title)}`, `DESCRIPTION:${esc(m.description)}`,
    "BEGIN:VALARM", "TRIGGER:-PT15M", "ACTION:DISPLAY", "DESCRIPTION:Meeting in 15 minutes", "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
  return { filename: "meeting.ics", content: lines.join("\r\n"), contentType: "text/calendar; charset=utf-8; method=PUBLISH" };
}

/** The email for one meeting. kind: "scheduled" (just saved) or "today" (morning of the meeting). */
function buildEmail(row, kind) {
  const m = meetingDetails(row);
  const when = istTime(m.start);
  const who = m.contact || "your client";
  const heading = kind === "today" ? `Today: meeting with ${who}` : `Meeting saved: ${who}`;
  const lead = kind === "today" ? `you have a meeting today at <b>${escapeHtml(when)}</b>.` : `your meeting is on <b>${escapeHtml(when)}</b>.`;
  const rows = [["When", when], ["With", m.contact], ["Phone", row.client_phone], ["Email", m.guest], ["Task", row.title]].filter(([, v]) => v);
  const body = `<p style="margin:0 0 14px;font-size:14px;color:#334155">Hi ${escapeHtml(String(row.owner_name || "").split(" ")[0])}, ${lead}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-radius:10px;font-size:13px">${rows.map(([k, v]) => `<tr><td style="padding:8px 12px;color:#64748b;width:90px;border-bottom:1px solid #f1f5f9">${k}</td><td style="padding:8px 12px;color:#0f172a;font-weight:bold;border-bottom:1px solid #f1f5f9">${escapeHtml(v)}</td></tr>`).join("")}</table>
<p style="margin:14px 0 0;font-size:13px;color:#475569">${m.guest ? `Click <b>Create Google Meet</b>: the time, title and ${escapeHtml(m.guest)} are already filled. Save it and Google sends the invite with the Meet link.` : "Click <b>Create Google Meet</b>: the time and title are already filled. Add the client's email there to send them the invite."}</p>`;
  const buttons = button("Create Google Meet", googleCalendarLink(m)) + button("Outlook / Teams", outlookCalendarLink(m), "secondary") + button("Open in CRM", m.crmLink, "secondary");
  const text = `${heading}\n\nWhen: ${when}\n${m.contact ? `With: ${m.contact}\n` : ""}${m.guest ? `Email: ${m.guest}\n` : ""}\nCreate Google Meet: ${googleCalendarLink(m)}\nOutlook / Teams: ${outlookCalendarLink(m)}\nOpen in CRM: ${m.crmLink}`;
  return { subject: heading, heading, preheader: `${when} · ${who}`, body, buttons, text, attachments: [icsFile(m, row.task_id)] };
}

const SELECT = `
  SELECT TOP 100 r.task_id, r.company_id, r.scheduled_sent_at, r.day_sent_for, t.title, t.type, t.due_date, t.related_to, t.related_id,
    u.name AS owner_name, u.email AS owner_email,
    COALESCE(l.contact_person, cu.name) AS client_name, COALESCE(l.company_name, cu.company_name) AS client_company,
    COALESCE(l.email, cu.email) AS client_email, COALESCE(l.phone, cu.phone) AS client_phone
  FROM meeting_reminders r
  JOIN tasks t ON t.task_id = r.task_id AND t.company_id = r.company_id
  JOIN users u ON u.user_id = t.assigned_to AND u.is_active = 1 AND ${VERIFIED_SQL("u")}
  JOIN companies co ON co.company_id = t.company_id AND co.status <> 'suspended'
  LEFT JOIN leads l ON t.related_to = 'lead' AND l.lead_id = t.related_id AND l.company_id = t.company_id
  LEFT JOIN customers cu ON t.related_to = 'customer' AND cu.customer_id = t.related_id AND cu.company_id = t.company_id
  WHERE ${OPEN} AND t.type IN ('meeting', 'demo') AND t.due_date > ?`;

/** One pass: "meeting saved" emails, then the morning-of reminders. Returns how many were sent. */
async function sendDue(now = new Date(), deps = {}) {
  const send = deps.sendBranded || sendBranded;
  const today = istDay(now);
  const morning = new Date(`${today}T${String(DAY_MAIL_HOUR).padStart(2, "0")}:00:00+05:30`);
  let sent = 0;

  const [fresh] = await query(`${SELECT} AND r.scheduled_sent_at IS NULL`, [now]);
  for (const row of fresh) {
    const result = await send(row.company_id, { to: row.owner_email, ...buildEmail(row, "scheduled") }).catch((e) => ({ skipped: e.message }));
    if (result.sent) sent += 1;
    // A meeting saved for today already got its email, so it does not get a second one this morning.
    const sameDay = istDay(row.due_date) === today;
    await query(`UPDATE meeting_reminders SET scheduled_sent_at = SYSUTCDATETIME()${sameDay ? ", day_sent_for = ?" : ""} WHERE task_id = ?`, sameDay ? [today, row.task_id] : [row.task_id]);
  }

  if (now >= morning) {
    const [dueToday] = await query(`${SELECT} AND t.due_date < ? AND r.scheduled_sent_at IS NOT NULL AND (r.day_sent_for IS NULL OR r.day_sent_for <> ?)`, [now, new Date(`${today}T23:59:59+05:30`), today]);
    for (const row of dueToday) {
      const result = await send(row.company_id, { to: row.owner_email, ...buildEmail(row, "today") }).catch((e) => ({ skipped: e.message }));
      if (result.sent) sent += 1;
      await query("UPDATE meeting_reminders SET day_sent_for = ? WHERE task_id = ?", [today, row.task_id]);
    }
  }
  return { sent };
}

module.exports = { MEETING_TYPES, buildEmail, googleCalendarLink, icsFile, istDay, meetingDetails, outlookCalendarLink, sendDue, track };
