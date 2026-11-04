const ExcelJS = require('exceljs');
const AppError = require('../../utils/appError');
const kit = require('../reports/sheetKit');

const MAX_ROWS = 5000;
const MAX_COLUMNS = 60;

function cellText(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    // Excel dates carry wall-clock time, so read them without a timezone change.
    const iso = value.toISOString();
    return iso.slice(11, 16) === '00:00' ? iso.slice(0, 10) : `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
  }
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('').trim();
    if (value.text !== undefined) return cellText(value.text);
    if (value.result !== undefined) return cellText(value.result);
    if (value.hyperlink) return String(value.hyperlink).replace(/^mailto:|^tel:/i, '');
    return '';
  }
  return String(value).trim();
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^﻿/, '');
  const delimiter = (source.split('\n')[0].match(/\t/g) || []).length > (source.split('\n')[0].match(/,/g) || []).length ? '\t' : ',';
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { cell += '"'; i += 1; } else if (char === '"') quoted = false; else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(cell.trim()); cell = ''; } else if (char === '\n') { row.push(cell.trim()); rows.push(row); row = []; cell = ''; } else if (char !== '\r') cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

function toTable(rows) {
  const filled = rows.filter((row) => row.some((cell) => cell !== ''));
  if (filled.length < 2) throw new AppError('The file needs a heading row and at least one lead.', 400);
  if (filled.length - 1 > MAX_ROWS) throw new AppError(`A file can have up to ${MAX_ROWS.toLocaleString('en-IN')} leads. Split it into smaller files.`, 400);
  const width = Math.min(MAX_COLUMNS, Math.max(...filled.map((row) => row.length)));
  const headers = Array.from({ length: width }, (_, i) => String(filled[0][i] || '').trim() || `Column ${i + 1}`);
  return { headers, rows: filled.slice(1).map((row) => Array.from({ length: width }, (_, i) => row[i] || '')) };
}

/** Reads the first sheet of an .xlsx file, or a .csv file, into headers and rows of text. */
async function parseImportFile(buffer, fileName) {
  const name = String(fileName || '').toLowerCase();
  if (!buffer || !buffer.length) throw new AppError('The file is empty.', 400);
  if (name.endsWith('.xls')) throw new AppError('Old .xls files cannot be read. In Excel use Save As and choose .xlsx.', 400);
  if (name.endsWith('.csv') || name.endsWith('.txt') || name.endsWith('.tsv')) return { sheet: fileName, ...toTable(parseCsvRows(buffer.toString('utf8'))) };
  if (!name.endsWith('.xlsx')) throw new AppError('Upload an Excel (.xlsx) or CSV file.', 400);

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch (_error) {
    throw new AppError('This file could not be read. Open it in Excel, save it as .xlsx and try again.', 400);
  }
  const sheet = workbook.worksheets.find((ws) => ws.actualRowCount > 0);
  if (!sheet) throw new AppError('The file has no data.', 400);
  if (sheet.rowCount > MAX_ROWS + 50) throw new AppError(`A file can have up to ${MAX_ROWS.toLocaleString('en-IN')} leads. Split it into smaller files.`, 400);
  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells = [];
    for (let i = 1; i <= Math.min(row.cellCount, MAX_COLUMNS); i += 1) cells.push(cellText(row.getCell(i).value));
    rows.push(cells);
  });
  return { sheet: sheet.name, ...toTable(rows) };
}

const TEMPLATE_COLUMNS = [
  ['Company', 'Kapoor Steels', 28, 'Required'],
  ['Contact person', 'Rajesh Kapoor', 22, 'Required (or the company name is used)'],
  ['Phone', '9810012345', 16, 'Phone or email is required'],
  ['Email', 'rajesh@kapoorsteels.in', 28, 'Phone or email is required'],
  ['Product', 'Your product name', 22, 'Or choose one product for the whole file while uploading'],
  ['Owner', 'Rahul Sharma', 20, 'Name or email. Leave blank to choose while uploading'],
  ['Source', 'Website', 14, 'Optional'],
  ['Priority', 'Medium', 10, 'Low, Medium, High or Urgent'],
  ['Lead value', 50000, 12, 'Number only'],
  ['Advance received', 10000, 14, 'Number only'],
  ['Follow-up date', '2026-12-15 11:00', 18, 'For example 15/12/2026 or 2026-12-15 11:00'],
  ['Requirement', 'CRM for 20 sales reps', 30, 'Optional'],
  ['Industry', 'Manufacturing', 16, 'Optional'],
  ['Employees', '50-100', 11, 'Optional'],
  ['City', 'Noida', 14, 'Optional'],
  ['State', 'Uttar Pradesh', 16, 'Optional'],
];

async function buildImportTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GreenCRM';
  const ws = workbook.addWorksheet('Leads', { views: [{ state: 'frozen', ySplit: 1, showGridLines: true }], properties: { tabColor: { argb: kit.TEAL } } });
  ws.columns = TEMPLATE_COLUMNS.map(([header, , width]) => ({ header, width }));
  ws.addRow(TEMPLATE_COLUMNS.map(([, example]) => example));
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kit.TEAL } };
    cell.alignment = { vertical: 'middle' };
  });
  ws.getRow(1).height = 22;
  ws.getRow(2).font = { italic: true, color: { argb: 'FF64748B' } };
  const help = workbook.addWorksheet('How to fill', { views: [{ showGridLines: false }] });
  help.columns = [{ width: 22 }, { width: 70 }];
  help.addRow(['GreenCRM lead upload']).font = { bold: true, size: 14, color: { argb: kit.TEAL } };
  help.addRow(['Delete the example row, then add your leads on the Leads sheet. Column order does not matter.']);
  help.addRow([]);
  TEMPLATE_COLUMNS.forEach(([header, , , note]) => { help.addRow([header, note]).getCell(1).font = { bold: true }; });
  return workbook.xlsx.writeBuffer();
}

module.exports = { parseImportFile, buildImportTemplate, MAX_ROWS };
