// Shared look for every GreenCRM Excel report: title block, teal header with a gold rule,
// banded rows, coloured status cells, filters, frozen header, totals and print setup.
const IST_OFFSET_MS = 330 * 60 * 1000;
const TEAL = 'FF0C605D';
const GOLD = 'FFE8BD00';
const LINE = 'FFD9E2DF';
const ZEBRA = 'FFF7F9F8';
const GROUP = 'FFEAF3F1';

const TONES = {
  ok: { fill: 'FFDCEFE6', font: 'FF17775A' },
  warn: { fill: 'FFFBEFD9', font: 'FF8F5000' },
  danger: { fill: 'FFFAE6E4', font: 'FFB3261E' },
  info: { fill: 'FFE3EBF8', font: 'FF2155A3' },
  violet: { fill: 'FFEFE7FB', font: 'FF6B3FA0' },
  neutral: { fill: 'FFEEF2F1', font: 'FF56665E' },
};
const FORMATS = {
  date: 'dd-mmm-yyyy',
  time: 'hh:mm AM/PM',
  datetime: 'dd-mmm-yyyy hh:mm AM/PM',
  int: '#,##0',
  decimal: '#,##0.0',
  pct: '0%',
  // Indian digit grouping: ₹1,00,000 and ₹1,00,00,000.
  inr: '[>=10000000]"₹"##\\,##\\,##\\,##0;[>=100000]"₹"##\\,##\\,##0;"₹"#,##0',
};
const NUMERIC = ['int', 'decimal', 'pct', 'inr'];

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thin = { style: 'thin', color: { argb: LINE } };
const box = { top: thin, left: thin, bottom: thin, right: thin };
const columnLetter = (n) => { let s = ''; for (let i = n; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };

// ExcelJS writes dates as UTC; shift so cells show Indian time.
const ist = (value) => (value ? new Date(new Date(value).getTime() + IST_OFFSET_MS) : null);
const istDay = (value) => { const d = ist(value); return d ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) : null; };
const istTime = (value) => { const d = ist(value); return d ? new Date(Date.UTC(1899, 11, 30, d.getUTCHours(), d.getUTCMinutes())) : null; };
const label = (value) => String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const generatedAt = () => new Date(Date.now() + IST_OFFSET_MS).toISOString().replace('T', ' ').slice(0, 16);

/** Colour for a lead/task status cell. */
function statusTone(value) {
  const s = String(value || '').toLowerCase();
  if (!s) return null;
  if (/(won|done|complete|approved|onboard|connected|interested)/.test(s)) return 'ok';
  if (/(lost|reject|cancel|overdue|not interested|disapprove|urgent)/.test(s)) return 'danger';
  if (/(demo|proposal|negotiat|trial)/.test(s)) return 'violet';
  if (/(new|pending|hold|not answered|busy|call back|high)/.test(s)) return 'warn';
  return 'info';
}

function cellValue(column, row) {
  const raw = column.value(row);
  if (raw === null || raw === undefined || raw === '') return null;
  if (raw instanceof Date) return raw;
  if (NUMERIC.includes(column.format)) return Number(raw);
  return String(raw);
}

// Widths follow the content (header and the longest of the first 400 values), within 8–60.
function layoutColumns(columns, rows) {
  const sample = rows.slice(0, 400);
  return columns.map((column) => {
    if (column.width && column.fixedWidth) return { width: column.width, wrap: Boolean(column.wrap) };
    const longest = sample.reduce((max, row) => {
      const value = cellValue(column, row);
      const text = value instanceof Date ? (column.format === 'time' ? 'hh:mm AM' : 'dd-mmm-yyyy hh:mm') : value === null ? '' : String(value);
      return Math.max(max, ...text.split(/\r?\n/).map((line) => line.length));
    }, 0);
    const numeric = NUMERIC.includes(column.format);
    const natural = Math.max(Math.min(column.header.length + 2, 22), longest + 2, numeric ? 9 : 8);
    const width = Math.min(column.maxWidth || 60, natural);
    return { width, wrap: Boolean(column.wrap) || (!numeric && longest + 2 > width) };
  });
}

function titleRows(ws, lines, width) {
  lines.forEach((text, i) => {
    ws.mergeCells(i + 1, 1, i + 1, Math.max(width, 2));
    const cell = ws.getCell(i + 1, 1);
    cell.value = text;
    cell.font = i === 0 ? { bold: true, size: 15, color: { argb: TEAL } } : { size: 10, color: { argb: 'FF56665E' } };
  });
  ws.getRow(1).height = 24;
}

/**
 * Adds one table sheet.
 * sheet: { name, title?, columns: [{ key, header, value(row), format?, tone?(row), total?, wrap? }], rows, groupBy?(row) => label, note?, tabColor? }
 */
function addDataSheet(workbook, sheet, meta) {
  const ws = workbook.addWorksheet(sheet.name.slice(0, 31), { properties: { tabColor: { argb: sheet.tabColor || TEAL } }, views: [{ showGridLines: false }] });
  const columns = sheet.columns;
  const lines = [sheet.title || meta.title, ...(meta.lines || [])];
  titleRows(ws, lines, Math.min(columns.length, 12));
  const headerRow = lines.length + 2;
  const layout = layoutColumns(columns, sheet.rows);
  layout.forEach(({ width }, i) => { ws.getColumn(i + 1).width = width; });

  const header = ws.getRow(headerRow);
  columns.forEach((column, i) => {
    const cell = header.getCell(i + 1);
    cell.value = column.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = fill(TEAL);
    cell.alignment = { vertical: 'middle', horizontal: NUMERIC.includes(column.format) ? 'right' : 'left', wrapText: true };
    cell.border = { ...box, bottom: { style: 'medium', color: { argb: GOLD } } };
  });
  header.height = Math.max(22, 15 * Math.max(...columns.map((c, i) => Math.ceil((c.header.length + 1) / Math.max(1, layout[i].width - 1)))) + 6);

  // Optional grouping: a shaded label row before each group, with the group's row count.
  const items = [];
  if (sheet.groupBy) {
    const groups = new Map();
    for (const row of sheet.rows) {
      const key = sheet.groupBy(row) || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    for (const [key, list] of groups) {
      items.push({ __group: `${key} (${list.length})` });
      items.push(...list);
    }
  } else {
    items.push(...sheet.rows);
  }

  let band = 0;
  items.forEach((row, index) => {
    const r = ws.getRow(headerRow + 1 + index);
    if (row.__group) {
      band = 0;
      columns.forEach((_, i) => {
        const cell = r.getCell(i + 1);
        cell.value = i === 0 ? row.__group : null;
        cell.fill = fill(GROUP);
        cell.font = { bold: true, color: { argb: TEAL } };
        cell.border = box;
      });
      return;
    }
    const zebra = band++ % 2 === 1;
    columns.forEach((column, i) => {
      const cell = r.getCell(i + 1);
      cell.value = cellValue(column, row);
      cell.border = box;
      cell.alignment = { vertical: 'top', wrapText: layout[i].wrap, horizontal: NUMERIC.includes(column.format) ? 'right' : 'left' };
      if (FORMATS[column.format]) cell.numFmt = FORMATS[column.format];
      const toneKey = column.tone ? column.tone(row) : null;
      const tone = toneKey && cell.value !== null ? TONES[toneKey] : null;
      if (tone) { cell.fill = fill(tone.fill); cell.font = { bold: true, color: { argb: tone.font } }; } else if (zebra) cell.fill = fill(ZEBRA);
      if (column.bold && !tone) cell.font = { bold: true };
      if (column.link) {
        const href = column.link(row);
        if (href && cell.value) { cell.value = { text: String(cell.value), hyperlink: href }; cell.font = { color: { argb: 'FF157672' }, underline: true }; }
      }
    });
  });

  let lastRow = headerRow + items.length;
  if (!sheet.rows.length) {
    lastRow += 1;
    ws.mergeCells(lastRow, 1, lastRow, Math.max(columns.length, 1));
    Object.assign(ws.getCell(lastRow, 1), { value: sheet.empty || 'Nothing in this period.', font: { italic: true, color: { argb: 'FF64748B' } } });
  } else if (columns.some((c) => c.total)) {
    lastRow += 1;
    const totals = ws.getRow(lastRow);
    columns.forEach((column, i) => {
      const cell = totals.getCell(i + 1);
      if (i === 0) cell.value = 'Total';
      else if (column.total) cell.value = { formula: `SUBTOTAL(9,${columnLetter(i + 1)}${headerRow + 1}:${columnLetter(i + 1)}${lastRow - 1})` };
      if (FORMATS[column.format]) cell.numFmt = FORMATS[column.format];
      cell.font = { bold: true };
      cell.fill = fill('FFFBF3D6');
      cell.border = { ...box, top: { style: 'double', color: { argb: TEAL } } };
      cell.alignment = { horizontal: NUMERIC.includes(column.format) ? 'right' : 'left' };
    });
  }

  if (sheet.rows.length) ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow + items.length, column: columns.length } };
  ws.views = [{ state: 'frozen', ySplit: headerRow, xSplit: sheet.freezeColumns || 0, showGridLines: false }];
  ws.pageSetup = { orientation: columns.length > 5 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `${headerRow}:${headerRow}`,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
  ws.headerFooter = { oddFooter: `&L${String(meta.title || '').replace(/&/g, '&&')}&RPage &P of &N` };
  if (sheet.note) {
    const r = lastRow + 2;
    ws.mergeCells(r, 1, r, Math.max(columns.length, 2));
    Object.assign(ws.getCell(r, 1), { value: sheet.note, font: { italic: true, size: 9, color: { argb: 'FF56665E' } } });
  }
  return ws;
}

/** Summary sheet: title block, then coloured sections of label / value / note lines and small tables. */
function summaryWriter(workbook, meta, name = 'Summary') {
  const ws = workbook.addWorksheet(name, { properties: { tabColor: { argb: GOLD } }, views: [{ showGridLines: false }] });
  ws.getColumn(1).width = 36; ws.getColumn(2).width = 16; ws.getColumn(3).width = 16; ws.getColumn(4).width = 40;
  const lines = [meta.title, ...(meta.lines || [])];
  titleRows(ws, lines, 4);
  let row = lines.length + 1;
  const section = (text) => {
    row += 2;
    const r = ws.getRow(row);
    r.getCell(1).value = text;
    [1, 2, 3, 4].forEach((c) => { r.getCell(c).fill = fill(TEAL); r.getCell(c).font = { bold: true, color: { argb: 'FFFFFFFF' } }; });
    r.getCell(1).border = { bottom: { style: 'medium', color: { argb: GOLD } } };
  };
  const line = (name, value, note = '', format = 'int') => {
    row += 1;
    const r = ws.getRow(row);
    r.getCell(1).value = name;
    r.getCell(2).value = value;
    r.getCell(2).numFmt = FORMATS[format] || FORMATS.int;
    r.getCell(2).font = { bold: true };
    r.getCell(4).value = note || null;
    r.getCell(4).font = { size: 9, color: { argb: 'FF64748B' } };
    [1, 2, 3, 4].forEach((c) => { r.getCell(c).border = { bottom: thin }; });
  };
  const table = (headers, rows, formats = []) => {
    row += 1;
    const head = ws.getRow(row);
    headers.forEach((h, i) => { const cell = head.getCell(i + 1); cell.value = h; cell.font = { bold: true, color: { argb: TEAL } }; cell.fill = fill(GROUP); });
    rows.forEach((values, index) => {
      row += 1;
      const r = ws.getRow(row);
      values.forEach((v, i) => { const cell = r.getCell(i + 1); cell.value = v; if (formats[i]) cell.numFmt = FORMATS[formats[i]]; cell.border = { bottom: thin }; if (index % 2) cell.fill = fill(ZEBRA); });
    });
    if (!rows.length) { row += 1; Object.assign(ws.getCell(row, 1), { value: 'Nothing in this period.', font: { italic: true, color: { argb: 'FF64748B' } } }); }
  };
  return { ws, section, line, table };
}

/**
 * Picks sheets and columns from ?sheets=a,b&a=col1,col2. Columns marked `optional` start switched off.
 * catalog: [{ key, label, columns?: [{ key, header, optional? }] }]
 */
function resolveLayout(catalog, query, defaults) {
  const list = (value) => (value ? String(value).split(',').map((s) => s.trim()).filter(Boolean) : null);
  const chosen = list(query.sheets) || defaults || catalog.map((s) => s.key);
  const known = new Map(catalog.map((s) => [s.key, s]));
  const unknown = chosen.filter((key) => !known.has(key));
  if (unknown.length) {
    const AppError = require('../../utils/appError');
    throw new AppError(`Unknown report sheet: ${unknown.join(', ')}.`, 400);
  }
  return [...new Set(chosen)].map((key) => {
    const sheet = known.get(key);
    if (!sheet.columns || !sheet.columns.length) return { sheet, columns: [] };
    const keys = list(query[`cols_${key}`]);
    const byKey = new Map(sheet.columns.map((c) => [c.key, c]));
    const columns = keys ? keys.filter((k) => byKey.has(k)).map((k) => byKey.get(k)) : sheet.columns.filter((c) => !c.optional);
    return { sheet, columns: columns.length ? columns : sheet.columns.filter((c) => !c.optional) };
  });
}

/** What the page shows in the column picker. */
const catalogFor = (catalog) => catalog.map((sheet) => ({
  key: sheet.key,
  label: sheet.label,
  description: sheet.description || '',
  options: sheet.options || [],
  columns: (sheet.columns || []).map((c) => ({ key: c.key, label: c.header, selected: !c.optional })),
}));

module.exports = { addDataSheet, summaryWriter, resolveLayout, catalogFor, statusTone, ist, istDay, istTime, label, generatedAt, FORMATS, TEAL, GOLD };
