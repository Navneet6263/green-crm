const AppError = require("../../utils/appError");
const { sendNudge } = require("../nudges/nudgeService");
const T = require("../nudges/nudgeTemplates");
const { buildPersonExcel, getPersonReport } = require("./personReport");

const count = (v) => Number(v || 0).toLocaleString("en-IN");
const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

/** Admin email about one person: their numbers, overdue follow-ups and, if asked, the Excel report attached. */
async function emailPersonReport(auth, body = {}) {
  if (!body.about_user_id) throw new AppError("Choose the person this email is about.", 400);
  const period = body.period === "all" || !body.from ? { period: "all" } : { from: body.from, to: body.to };
  const report = await getPersonReport(auth, body.about_user_id, period);
  const k = report.widgets.kpis?.data;
  const numbers = k ? [
    ["Total leads", count(k.now.total)], ["Won", count(k.cohort.won), "#047857"], ["Open now", count(k.now.open_leads)],
    ["Follow-ups overdue", count(k.now.overdue), k.now.overdue ? "#be123c" : null], ["Tasks overdue", count(k.tasks.overdue), k.tasks.overdue ? "#be123c" : null],
    ["Updates written", count(report.activity.updates)],
  ] : [];
  const attachments = [];
  if (body.attach_report) {
    const excel = await buildPersonExcel(auth, report.person.user_id, period);
    attachments.push({ filename: excel.filename, content: Buffer.from(excel.buffer), contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  const toUserIds = Array.isArray(body.to_user_ids) && body.to_user_ids.length ? body.to_user_ids : [report.person.user_id];
  return sendNudge(auth, { ...body, kind: "person", to_user_ids: toUserIds }, {
    aboutUser: report.person,
    blocks: [T.personCard(report.person, numbers), T.overdueTable(report.overdue.items)],
    facts: [
      ...numbers.map(([label, value]) => `${label}: ${value}`),
      k?.now?.pipeline_value ? `Open pipeline: ${money(k.now.pipeline_value)}` : "",
      report.overdue.total ? `Overdue follow-ups: ${report.overdue.items.slice(0, 10).map((l) => l.company_name || l.contact_person).join(", ")}` : "",
    ].filter(Boolean),
    attachments,
  });
}

module.exports = { emailPersonReport };
