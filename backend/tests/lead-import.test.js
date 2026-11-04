const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { parseImportFile, buildImportTemplate } = require('../services/leads/leadImport');

async function xlsx(rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');
  rows.forEach((row) => ws.addRow(row));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test('reads an Excel sheet into text, including numbers, dates and links', async () => {
  const buffer = await xlsx([
    ['Company', 'Mobile', 'Follow up', 'Mail'],
    ['Kapoor Steels', 9810012345, new Date(Date.UTC(2026, 11, 15, 11, 0)), { text: 'a@b.in', hyperlink: 'mailto:a@b.in' }],
    ['', '', '', ''],
    ['Orbit', '98100 22222', new Date(Date.UTC(2026, 11, 16)), ''],
  ]);
  const { headers, rows } = await parseImportFile(buffer, 'leads.xlsx');
  assert.deepEqual(headers, ['Company', 'Mobile', 'Follow up', 'Mail']);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], ['Kapoor Steels', '9810012345', '2026-12-15 11:00', 'a@b.in']);
  assert.equal(rows[1][2], '2026-12-16');
});

test('reads CSV with quotes, commas and a byte order mark', async () => {
  const csv = '﻿Company,Phone,Note\n"Kapoor, Steels",9810012345,"said ""yes"""\r\nOrbit,98100,\n';
  const { headers, rows } = await parseImportFile(Buffer.from(csv), 'leads.csv');
  assert.deepEqual(headers, ['Company', 'Phone', 'Note']);
  assert.deepEqual(rows[0], ['Kapoor, Steels', '9810012345', 'said "yes"']);
  assert.deepEqual(rows[1], ['Orbit', '98100', '']);
});

test('gives a clear message for files it cannot use', async () => {
  await assert.rejects(() => parseImportFile(Buffer.from('x'), 'old.xls'), /Save As/);
  await assert.rejects(() => parseImportFile(Buffer.from('x'), 'photo.png'), /Excel \(.xlsx\) or CSV/);
  await assert.rejects(() => parseImportFile(Buffer.from('not a zip'), 'broken.xlsx'), /could not be read/);
  await assert.rejects(() => parseImportFile(Buffer.from('Company\n'), 'one.csv'), /at least one lead/);
  await assert.rejects(() => parseImportFile(Buffer.alloc(0), 'e.csv'), /empty/);
  const tooMany = `Company\n${'A\n'.repeat(5001)}`;
  await assert.rejects(() => parseImportFile(Buffer.from(tooMany), 'big.csv'), /up to 5,000/);
});

test('the template can be read back by the importer', async () => {
  const { headers, rows } = await parseImportFile(Buffer.from(await buildImportTemplate()), 'template.xlsx');
  assert.equal(headers[0], 'Company');
  assert.ok(headers.includes('Advance received'));
  assert.equal(rows[0][0], 'Kapoor Steels');
});

test('bulk upload reports exactly which rows saved and which did not', async () => {
  const leadService = require('../services/leadService');
  const result = await leadService.bulkUpload({ companyId: 'C1', userId: 'A1', role: 'admin' }, {
    partial: true,
    rows: [{ contact_person: 'A', company_name: '', phone: '9', product_id: 'P1', __row_number: 2 }],
  });
  assert.equal(result.imported, 0);
  assert.equal(result.failed, 1);
  assert.equal(result.aborted, false);
  assert.equal(result.errors[0].row, 2);
  await assert.rejects(() => leadService.bulkUpload({ companyId: 'C1', userId: 'S1', role: 'sales' }, { rows: [{}] }), /cannot bulk import/);
  await assert.rejects(() => leadService.checkBulkImport({ companyId: 'C1', userId: 'S1', role: 'sales' }, { rows: [{}] }), /cannot bulk import/);
});
