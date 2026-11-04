// The Monday summary: once a week, from 09:00 IST on Monday, each active person gets one email with their
// new leads, what is due this week and what is overdue, and a button to open the CRM.
// Only people who proved their email with the login code in the last month get it; never deactivated
// accounts, people with nothing to show, or addresses that are made up or bounce.
const { query } = require("../../db/connection");
const { OPEN_PIPELINE_STATUSES } = require("../../constants/lead");
const { escapeHtml, getFrontendUrl } = require("../emailService");
const { button, sendBranded } = require("../mail/brandedEmail");
const { VERIFIED_SQL } = require("../auth/loginOtp");

const IST = 330 * 60000;
const DAY = 86400000;
const SEND_HOUR = 9;
const OPEN_LEAD = `l.status IN (${OPEN_PIPELINE_STATUSES.map((s) => `'${s}'`).join(", ")})`;
const OPEN_TASK = "t.status NOT IN ('done', 'completed', 'closed', 'cancelled')";

/** The Monday (IST) of the week `now` falls in, as "YYYY-MM-DD", and whether it is time to send. */
function weekWindow(now = new Date()) {
  const ist = new Date(now.getTime() + IST);
  const day = ist.getUTCDay(); // 0 Sunday … 1 Monday
  const monday = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - ((day + 6) % 7)));
  const weekStart = monday.toISOString().slice(0, 10);
  const todayStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST);
  return { weekStart, todayStart, isSendTime: day === 1 && ist.getUTCHours() >= SEND_HOUR };
}

/** Counts for everyone who has something, one row per person. */
async function loadCounts(now, todayStart) {
  const weekEnd = new Date(todayStart.getTime() + 7 * DAY);
  const [rows] = await query(`
    SELECT u.user_id, u.company_id, u.name, u.email,
      (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.user_id AND l.company_id = u.company_id AND l.is_active = 1 AND l.status = 'new') AS new_leads,
      (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.user_id AND l.company_id = u.company_id AND l.is_active = 1 AND ${OPEN_LEAD} AND l.follow_up_date >= ? AND l.follow_up_date < ?) AS week_followups,
      (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.user_id AND t.company_id = u.company_id AND ${OPEN_TASK} AND t.due_date >= ? AND t.due_date < ?) AS week_tasks,
      (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.user_id AND l.company_id = u.company_id AND l.is_active = 1 AND ${OPEN_LEAD} AND l.follow_up_date < ?) AS overdue_followups,
      (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.user_id AND t.company_id = u.company_id AND ${OPEN_TASK} AND t.due_date < ?) AS overdue_tasks
    FROM users u
    JOIN companies c ON c.company_id = u.company_id AND c.status <> 'suspended'
    WHERE u.is_active = 1 AND u.email IS NOT NULL AND u.email <> '' AND ${VERIFIED_SQL("u")}`,
  [todayStart, weekEnd, now, weekEnd, todayStart, now]);
  return rows
    .map((r) => ({ ...r, newLeads: Number(r.new_leads) || 0, weekFollowUps: Number(r.week_followups) || 0, weekTasks: Number(r.week_tasks) || 0, overdueFollowUps: Number(r.overdue_followups) || 0, overdueTasks: Number(r.overdue_tasks) || 0 }))
    .filter((r) => r.newLeads + r.weekFollowUps + r.weekTasks + r.overdueFollowUps + r.overdueTasks > 0);
}

function tile(label, value, detail, color) {
  return `<td width="33%" style="padding:4px"><div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;border-top:3px solid ${color}">
<div style="font-size:12px;color:#64748b">${escapeHtml(label)}</div><div style="font-size:26px;font-weight:bold;color:#0f172a;margin-top:2px">${value}</div>
<div style="font-size:11px;color:#94a3b8;margin-top:2px">${escapeHtml(detail)}</div></div></td>`;
}

const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function buildEmail(r) {
  const week = r.weekFollowUps + r.weekTasks;
  const overdue = r.overdueFollowUps + r.overdueTasks;
  const split = (followUps, tasks) => `${count(followUps, "follow-up")} · ${count(tasks, "task")}`;
  const first = String(r.name || "").split(" ")[0];
  const body = `<p style="margin:0 0 14px;font-size:14px;color:#334155">Good Morning ${escapeHtml(first)}, here is your week in GreenCRM.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${tile("New leads", r.newLeads, "Not contacted yet", "#3b6fd8")}
${tile("Pending this week", week, split(r.weekFollowUps, r.weekTasks), "#b98300")}
${tile("Overdue", overdue, split(r.overdueFollowUps, r.overdueTasks), "#d9467c")}
</tr></table>
${overdue ? `<p style="margin:14px 0 0;font-size:13px;color:#475569">Start with the overdue ones: a quick call or a new date keeps the lead warm.</p>` : ""}`;
  const home = getFrontendUrl();
  return {
    subject: `Your week: ${r.newLeads} new, ${week} pending, ${overdue} overdue`,
    heading: "Your week in GreenCRM",
    preheader: `${r.newLeads} new · ${week} pending · ${overdue} overdue`,
    body,
    buttons: button("Open CRM", `${home}/dashboard`) + button("My tasks", `${home}/tasks`, "secondary"),
    text: `Your week in GreenCRM\n\nNew leads: ${r.newLeads}\nPending this week: ${week} (${r.weekFollowUps} follow-ups, ${r.weekTasks} tasks)\nOverdue: ${overdue} (${r.overdueFollowUps} follow-ups, ${r.overdueTasks} tasks)\n\nOpen CRM: ${home}/dashboard`,
  };
}

/** Takes this week's slot for a person; false when someone already took it (so two servers never both send). */
async function claim(userId, weekStart) {
  const [rows] = await query(
    `INSERT INTO weekly_digest_log (user_id, week_start) OUTPUT INSERTED.user_id
     SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM weekly_digest_log WHERE user_id = ? AND week_start = ?)`,
    [userId, weekStart, userId, weekStart]
  );
  return rows.length > 0;
}

/** Sends this week's summaries if it is Monday after 09:00 IST. Safe to call every few minutes. */
async function sendDue(now = new Date(), deps = {}) {
  const { weekStart, todayStart, isSendTime } = weekWindow(now);
  if (!isSendTime) return { sent: 0, skipped: 0 };
  const send = deps.sendBranded || sendBranded;
  const people = await (deps.loadCounts || loadCounts)(now, todayStart);
  let sent = 0;
  let skipped = 0;
  for (const person of people) {
    if (!(await (deps.claim || claim)(person.user_id, weekStart))) continue;
    const result = await send(person.company_id, { to: person.email, ...buildEmail(person) }).catch((e) => ({ skipped: e.message }));
    if (result.sent) sent += 1;
    else skipped += 1;
  }
  return { sent, skipped };
}

module.exports = { buildEmail, sendDue, weekWindow };
