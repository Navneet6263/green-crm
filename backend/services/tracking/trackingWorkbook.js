const ExcelJS = require("exceljs");
const { IST_OFFSET_MS } = require("./teamTrackingService");

const TEAL = "FF0C605D";
const GOLD = "FFE8BD00";
const CREAM = "FFFBF9F3";
const RED_FILL = "FFFDE2E2";
const DATE_FMT = "dd-mmm-yyyy";
const TIME_FMT = "hh:mm AM/PM";
const DATETIME_FMT = "dd-mmm-yyyy hh:mm AM/PM";

// ExcelJS writes dates as UTC; shift so cells show Indian time.
const ist = (value) => (value ? new Date(new Date(value).getTime() + IST_OFFSET_MS) : null);
const istDateOnly = (date) => new Date(`${date}T00:00:00.000Z`);
const mapLink = (lat, lng) => (lat === null || lat === undefined ? null
  : { text: "Open map ↗", hyperlink: `https://www.google.com/maps?q=${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}` });

function addTableSheet(workbook, name, columns, rows, { startRow = 1, tabColor = TEAL } = {}) {
  const ws = workbook.addWorksheet(name, { properties: { tabColor: { argb: tabColor } } });
  ws.columns = columns.map((c) => ({ key: c.key, width: c.width || 14 }));
  const header = ws.getRow(startRow);
  columns.forEach((c, i) => { header.getCell(i + 1).value = c.header; });
  styleHeader(header);
  rows.forEach((row, index) => {
    const r = ws.getRow(startRow + 1 + index);
    columns.forEach((c, i) => {
      const cell = r.getCell(i + 1);
      cell.value = row[c.key] ?? null;
      if (c.numFmt) cell.numFmt = c.numFmt;
      if (c.link && cell.value) cell.font = { color: { argb: "FF157672" }, underline: true };
    });
    if (index % 2 === 1) r.eachCell({ includeEmpty: true }, (cell) => { cell.fill = solid(CREAM); });
  });
  ws.views = [{ state: "frozen", ySplit: startRow }];
  if (rows.length) ws.autoFilter = { from: { row: startRow, column: 1 }, to: { row: startRow + rows.length, column: columns.length } };
  return ws;
}

const solid = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

function styleHeader(row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = solid(TEAL);
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: GOLD } } };
  });
}

function highlightMocked(ws, column, fromRow, toRow) {
  if (toRow < fromRow) return;
  ws.addConditionalFormatting({
    ref: `${column}${fromRow}:${column}${toRow}`,
    rules: [{ type: "cellIs", operator: "greaterThan", formulae: [0], style: { fill: solid(RED_FILL), font: { color: { argb: "FFB91C1C" }, bold: true } } }],
  });
}

function dataBar(ws, column, fromRow, toRow) {
  if (toRow < fromRow) return;
  ws.addConditionalFormatting({
    ref: `${column}${fromRow}:${column}${toRow}`,
    rules: [{ type: "dataBar", minLength: 0, maxLength: 100, cfvo: [{ type: "min" }, { type: "max" }], color: { argb: "FF45ACA6" } }],
  });
}

function titleBlock(ws, lines, width) {
  ws.mergeCells(1, 1, 1, width);
  const title = ws.getCell(1, 1);
  title.value = lines[0];
  title.font = { size: 18, bold: true, color: { argb: TEAL } };
  lines.slice(1).forEach((text, i) => {
    ws.mergeCells(i + 2, 1, i + 2, width);
    const cell = ws.getCell(i + 2, 1);
    cell.value = text;
    cell.font = { color: { argb: "FF475569" } };
  });
}

const DAILY_COLUMNS = [
  { header: "Date", key: "date", width: 13, numFmt: DATE_FMT },
  { header: "Day", key: "weekday", width: 8 },
  { header: "First start", key: "first_start", width: 12, numFmt: TIME_FMT },
  { header: "Last stop", key: "last_stop", width: 12, numFmt: TIME_FMT },
  { header: "Field time", key: "field_time", width: 11, numFmt: "[h]:mm" },
  { header: "Distance (km)", key: "km", width: 13, numFmt: "0.00" },
  { header: "Visits", key: "visits", width: 9 },
  { header: "Trips", key: "trips", width: 8 },
  { header: "GPS points", key: "fixes", width: 11 },
  { header: "Rejected points", key: "rejected", width: 12 },
  { header: "Mocked GPS", key: "mocked", width: 11 },
  { header: "Punch in", key: "punch_in", width: 12, numFmt: TIME_FMT },
  { header: "Punch out", key: "punch_out", width: 12, numFmt: TIME_FMT },
  { header: "Calls", key: "calls", width: 8 },
  { header: "Lead updates", key: "lead_updates", width: 12 },
];

const toDailyRow = (d) => ({
  ...d,
  date: istDateOnly(d.date),
  weekday: istDateOnly(d.date).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }),
  first_start: ist(d.first_start),
  last_stop: ist(d.last_stop),
  field_time: d.minutes / 1440,
  punch_in: ist(d.punch_in),
  punch_out: ist(d.punch_out),
});

function letter(index) { return String.fromCharCode(64 + index); }

function addDailySummary(workbook, sheetName, header, days) {
  const width = DAILY_COLUMNS.length;
  const kpiRow = header.length + 2;
  const tableStart = kpiRow + 3;
  const ws = addTableSheet(workbook, sheetName, DAILY_COLUMNS, days.map(toDailyRow), { startRow: tableStart });
  titleBlock(ws, header, width);

  const first = tableStart + 1;
  const last = tableStart + days.length;
  const totalRow = ws.getRow(last + 1);
  totalRow.getCell(1).value = "Total";
  const sumCols = ["field_time", "km", "visits", "trips", "fixes", "rejected", "mocked", "calls", "lead_updates"];
  DAILY_COLUMNS.forEach((c, i) => {
    if (!sumCols.includes(c.key)) return;
    const col = letter(i + 1);
    const cell = totalRow.getCell(i + 1);
    cell.value = { formula: `SUM(${col}${first}:${col}${last})` };
    if (c.numFmt) cell.numFmt = c.numFmt;
  });
  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true };
    cell.fill = solid("FFEFFAF9");
    cell.border = { top: { style: "medium", color: { argb: TEAL } } };
  });

  // KPI tiles referencing the totals row, so edits in the table flow through.
  const col = (key) => letter(DAILY_COLUMNS.findIndex((c) => c.key === key) + 1);
  const kpis = [
    ["Total distance (km)", `${col("km")}${last + 1}`, "0.00"],
    ["Client visits", `${col("visits")}${last + 1}`, "0"],
    ["Field time", `${col("field_time")}${last + 1}`, "[h]:mm"],
    ["Days on field", `COUNTIF(${col("trips")}${first}:${col("trips")}${last},">0")`, "0"],
    ["Avg km / field day", `IFERROR(${col("km")}${last + 1}/COUNTIF(${col("trips")}${first}:${col("trips")}${last},">0"),0)`, "0.00"],
    ["Calls", `${col("calls")}${last + 1}`, "0"],
    ["Lead updates", `${col("lead_updates")}${last + 1}`, "0"],
    ["Mocked GPS points", `${col("mocked")}${last + 1}`, "0"],
  ];
  kpis.forEach(([label, formula, fmt], i) => {
    const c = i * 2 + 1;
    ws.mergeCells(kpiRow, c, kpiRow, c + 1);
    ws.mergeCells(kpiRow + 1, c, kpiRow + 1, c + 1);
    const l = ws.getCell(kpiRow, c);
    l.value = label;
    l.font = { size: 9, bold: true, color: { argb: "FF64748B" } };
    l.fill = solid(CREAM);
    const v = ws.getCell(kpiRow + 1, c);
    v.value = { formula };
    v.numFmt = fmt;
    v.font = { size: 16, bold: true, color: { argb: label.startsWith("Mocked") ? "FFB91C1C" : TEAL } };
    v.fill = solid(CREAM);
    v.alignment = { horizontal: "left" };
  });

  dataBar(ws, col("km"), first, last);
  dataBar(ws, col("visits"), first, last);
  highlightMocked(ws, col("mocked"), first, last);
  ws.views = [{ state: "frozen", ySplit: tableStart }];
  return ws;
}

const VISIT_COLUMNS = [
  { header: "#", key: "number", width: 6 },
  { header: "Date & time", key: "at", width: 22, numFmt: DATETIME_FMT },
  { header: "Place", key: "label", width: 32 },
  { header: "Latitude", key: "latitude", width: 12, numFmt: "0.000000" },
  { header: "Longitude", key: "longitude", width: 12, numFmt: "0.000000" },
  { header: "GPS accuracy (m)", key: "accuracy", width: 14, numFmt: "0" },
  { header: "Mocked", key: "mocked_text", width: 9 },
  { header: "Map", key: "map", width: 12, link: true },
];

const toVisitRow = (v) => ({ ...v, at: ist(v.at), mocked_text: v.mocked ? "Yes" : "No", map: mapLink(v.latitude, v.longitude) });

function markMockedText(ws, column, rows) {
  if (!rows) return;
  ws.addConditionalFormatting({
    ref: `${column}2:${column}${rows + 1}`,
    rules: [{ type: "containsText", operator: "containsText", text: "Yes", style: { fill: solid(RED_FILL), font: { color: { argb: "FFB91C1C" }, bold: true } } }],
  });
}

async function buildEmployeeWorkbook(report, generatedBy) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GreenCRM";
  workbook.created = new Date();
  const { user } = report;
  const header = [
    "GreenCRM · Field Report",
    `Employee: ${user.name}${user.phone ? ` · ${user.phone}` : ""}${user.email ? ` · ${user.email}` : ""}`,
    `Period: ${report.fromDate} to ${report.toDate} (IST) · Generated by ${generatedBy} on ${ist(new Date()).toISOString().slice(0, 16).replace("T", " ")} IST`,
  ];
  if (report.truncated) header.push("Note: route points were capped at 60,000 for this range; shorten the range for the full detail.");
  addDailySummary(workbook, "Summary", header, report.days);

  const visits = report.visits.map(toVisitRow);
  const visitSheet = addTableSheet(workbook, "Visits", VISIT_COLUMNS, visits, { tabColor: GOLD });
  markMockedText(visitSheet, "G", visits.length);

  addTableSheet(workbook, "Trips", [
    { header: "Date", key: "date", width: 13, numFmt: DATE_FMT },
    { header: "Started", key: "started_at", width: 22, numFmt: DATETIME_FMT },
    { header: "Stopped", key: "stopped_at", width: 22, numFmt: DATETIME_FMT },
    { header: "Status", key: "status", width: 14 },
    { header: "Duration", key: "duration", width: 10, numFmt: "[h]:mm" },
    { header: "Distance (km)", key: "km", width: 13, numFmt: "0.00" },
    { header: "Visits", key: "visits", width: 8 },
    { header: "GPS points", key: "fixes", width: 11 },
    { header: "Rejected", key: "rejected", width: 10 },
    { header: "Signal gaps", key: "gaps", width: 11 },
    { header: "Mocked GPS", key: "mocked", width: 11 },
  ], report.trips.map((t) => ({
    ...t,
    date: istDateOnly(t.date),
    started_at: ist(t.started_at),
    stopped_at: ist(t.stopped_at),
    status: t.stopped_at ? "Completed" : t.active ? "Running" : "Not stopped",
    duration: t.minutes / 1440,
  })));

  const points = report.points.map((p) => ({
    at: ist(p.captured_at),
    kind: p.kind === "reach" ? "Visit" : p.kind === "point" ? "GPS" : p.kind,
    latitude: Number(p.latitude), longitude: Number(p.longitude),
    accuracy: p.accuracy === null ? null : Number(p.accuracy),
    mocked_text: p.mocked ? "Yes" : "No",
    map: mapLink(p.latitude, p.longitude),
  }));
  const pointSheet = addTableSheet(workbook, "Route points", [
    { header: "Date & time", key: "at", width: 22, numFmt: DATETIME_FMT },
    { header: "Type", key: "kind", width: 8 },
    { header: "Latitude", key: "latitude", width: 12, numFmt: "0.000000" },
    { header: "Longitude", key: "longitude", width: 12, numFmt: "0.000000" },
    { header: "GPS accuracy (m)", key: "accuracy", width: 14, numFmt: "0" },
    { header: "Mocked", key: "mocked_text", width: 9 },
    { header: "Map", key: "map", width: 12, link: true },
  ], points);
  markMockedText(pointSheet, "F", points.length);

  addTableSheet(workbook, "Attendance", [
    { header: "Date & time", key: "at", width: 22, numFmt: DATETIME_FMT },
    { header: "Type", key: "type", width: 12 },
    { header: "Location", key: "location", width: 40 },
    { header: "IP address", key: "ip_address", width: 18 },
  ], report.attendance.map((a) => ({ ...a, at: ist(a.created_at), type: a.event_type === "punch_in" ? "Punch in" : "Punch out" })));

  addTableSheet(workbook, "Lead activity", [
    { header: "Date & time", key: "at", width: 22, numFmt: DATETIME_FMT },
    { header: "Lead", key: "company_name", width: 28 },
    { header: "Contact", key: "contact_person", width: 22 },
    { header: "Activity", key: "type", width: 16 },
    { header: "Details", key: "description", width: 50 },
    { header: "Lead status", key: "status", width: 14 },
  ], report.activity.map((a) => ({ ...a, at: ist(a.created_at) })));

  addTableSheet(workbook, "Calls", [
    { header: "Date & time", key: "at", width: 22, numFmt: DATETIME_FMT },
    { header: "Lead", key: "company_name", width: 28 },
    { header: "Contact", key: "contact_person", width: 22 },
    { header: "Number", key: "to_number", width: 16 },
    { header: "Status", key: "status", width: 14 },
    { header: "Duration", key: "duration", width: 10, numFmt: "[mm]:ss" },
  ], report.calls.map((c) => ({ ...c, at: ist(c.created_at), duration: c.duration_seconds ? c.duration_seconds / 86400 : null })));

  return workbook.xlsx.writeBuffer();
}

async function buildTeamWorkbook(report, generatedBy) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GreenCRM";
  workbook.created = new Date();
  const header = [
    "GreenCRM · Team Field Report",
    `Period: ${report.fromDate} to ${report.toDate} (IST) · ${report.employees.length} employees`,
    `Generated by ${generatedBy} on ${ist(new Date()).toISOString().slice(0, 16).replace("T", " ")} IST`,
  ];

  const summaryRows = report.employees.map(({ user, days }) => {
    const sum = (key) => days.reduce((t, d) => t + (d[key] || 0), 0);
    const fieldDays = days.filter((d) => d.trips > 0).length;
    const km = Math.round(sum("km") * 100) / 100;
    return {
      name: user.name, phone: user.phone, field_days: fieldDays, km,
      avg_km: fieldDays ? Math.round((km / fieldDays) * 100) / 100 : 0,
      visits: sum("visits"), field_time: sum("minutes") / 1440,
      calls: sum("calls"), lead_updates: sum("lead_updates"), mocked: sum("mocked"),
    };
  });
  const startRow = header.length + 2;
  const columns = [
    { header: "Employee", key: "name", width: 24 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Days on field", key: "field_days", width: 12 },
    { header: "Distance (km)", key: "km", width: 13, numFmt: "0.00" },
    { header: "Avg km / field day", key: "avg_km", width: 15, numFmt: "0.00" },
    { header: "Visits", key: "visits", width: 9 },
    { header: "Field time", key: "field_time", width: 11, numFmt: "[h]:mm" },
    { header: "Calls", key: "calls", width: 8 },
    { header: "Lead updates", key: "lead_updates", width: 12 },
    { header: "Mocked GPS", key: "mocked", width: 11 },
  ];
  const ws = addTableSheet(workbook, "Team summary", columns, summaryRows, { startRow });
  titleBlock(ws, header, columns.length);
  const first = startRow + 1;
  const last = startRow + summaryRows.length;
  if (summaryRows.length) {
    const total = ws.getRow(last + 1);
    total.getCell(1).value = "Total";
    ["D", "F", "G", "H", "I", "J"].forEach((c) => {
      const cell = total.getCell(c);
      cell.value = { formula: `SUM(${c}${first}:${c}${last})` };
      cell.numFmt = c === "D" ? "0.00" : c === "G" ? "[h]:mm" : "0";
    });
    total.eachCell({ includeEmpty: true }, (cell) => { cell.font = { bold: true }; cell.fill = solid("FFEFFAF9"); });
  }
  dataBar(ws, "D", first, last);
  dataBar(ws, "F", first, last);
  highlightMocked(ws, "J", first, last);
  ws.views = [{ state: "frozen", ySplit: startRow }];

  const daily = report.employees.flatMap(({ user, days }) => days.map((d) => ({ employee: user.name, ...toDailyRow(d) })));
  const dailySheet = addTableSheet(workbook, "Daily", [{ header: "Employee", key: "employee", width: 22 }, ...DAILY_COLUMNS], daily, { tabColor: GOLD });
  dataBar(dailySheet, "G", 2, daily.length + 1);
  highlightMocked(dailySheet, "L", 2, daily.length + 1);

  const visits = report.employees.flatMap(({ user, visits: list }) => list.map((v) => ({ employee: user.name, ...toVisitRow(v) })));
  const visitSheet = addTableSheet(workbook, "Visits", [{ header: "Employee", key: "employee", width: 22 }, ...VISIT_COLUMNS], visits);
  markMockedText(visitSheet, "H", visits.length);

  return workbook.xlsx.writeBuffer();
}

module.exports = { buildEmployeeWorkbook, buildTeamWorkbook };
