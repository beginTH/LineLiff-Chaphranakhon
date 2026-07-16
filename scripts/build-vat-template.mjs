import fs from 'node:fs/promises';
import path from 'node:path';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const outputDir = path.resolve('outputs', 'vat-template');
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const sheet = workbook.worksheets.add('Form VAT');
sheet.showGridLines = false;

const brandRed = '#B11226';
const darkText = '#1F2933';
const mutedText = '#6B7280';
const paleRed = '#FDECEF';
const paleGray = '#F8FAFC';
const lineGray = '#CBD5E1';
const softGold = '#FFF7E6';

function setValues(range, values) {
  sheet.getRange(range).values = values;
}

function format(range, config) {
  sheet.getRange(range).format = config;
}

function merge(range) {
  sheet.getRange(range).merge();
}

const widths = {
  A: 2,
  B: 7,
  C: 18,
  D: 16,
  E: 36,
  F: 11,
  G: 13,
  H: 19,
  I: 2,
};

Object.entries(widths).forEach(([column, width]) => {
  sheet.getRange(`${column}:${column}`).format.columnWidth = width;
});

for (let row = 1; row <= 48; row += 1) {
  sheet.getRange(`${row}:${row}`).format.rowHeight = row === 1 ? 10 : 22;
}
sheet.getRange('2:7').format.rowHeight = 24;
sheet.getRange('22:36').format.rowHeight = 34;
sheet.getRange('43:43').format.rowHeight = 32;

merge('B2:D7');
setValues('B2', [['ชาพระนคร']]);
format('B2:D7', {
  fill: brandRed,
  font: { color: '#FFFFFF', bold: true, size: 20 },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
  borders: { preset: 'outside', style: 'medium', color: brandRed },
});

merge('E2:H3');
setValues('E2', [['ใบสั่งซื้อ / ใบกำกับภาษี']]);
format('E2:H3', {
  font: { bold: true, size: 18, color: brandRed },
  horizontalAlignment: 'right',
  verticalAlignment: 'center',
  wrapText: true,
});

merge('E4:H4');
setValues('E4', [['CHA PHRA NAKHON - PURCHASE ORDER / VAT FORM']]);
format('E4:H4', {
  font: { bold: true, size: 9, color: mutedText },
  horizontalAlignment: 'right',
  wrapText: true,
});

merge('B10:H10');
setValues('B10', [['ข้อมูลผู้ซื้อ / สาขา']]);
format('B10:H10', {
  fill: paleRed,
  font: { bold: true, color: brandRed, size: 12 },
  horizontalAlignment: 'left',
  borders: { preset: 'outside', style: 'thin', color: lineGray },
});

setValues('B12:H19', [
  ['', '', '', '', '', '', ''],
  ['', '', '', '', '', '', ''],
  ['', '', '', '', '', '', ''],
  ['ชื่อผู้สั่งซื้อ', '', '', '', '', '', ''],
  ['ชื่อสาขา / จุดจัดส่ง', '', '', '', '', 'เลขที่ :', ''],
  ['ที่อยู่จัดส่ง', '', '', '', '', '', ''],
  ['ผู้ติดต่อ', '', '', '', '', 'วันที่ :', ''],
  ['หมายเหตุ', '', '', '', '', '', ''],
]);

['C12:H12', 'C15:F15', 'C16:F16', 'C17:F17', 'C18:F18', 'C19:F19'].forEach(merge);
format('B12:H12', {
  fill: paleGray,
  font: { italic: true, color: mutedText, size: 9 },
  horizontalAlignment: 'left',
  borders: { preset: 'all', style: 'thin', color: lineGray },
});
format('B15:B19', {
  fill: paleGray,
  font: { bold: true, color: mutedText },
  horizontalAlignment: 'left',
  verticalAlignment: 'center',
  borders: { preset: 'all', style: 'thin', color: lineGray },
});
format('G16:G18', {
  fill: paleGray,
  font: { bold: true, color: mutedText },
  horizontalAlignment: 'right',
  verticalAlignment: 'center',
  borders: { preset: 'all', style: 'thin', color: lineGray },
});
format('C15:F19', {
  font: { color: darkText },
  wrapText: true,
  verticalAlignment: 'center',
  borders: { preset: 'all', style: 'thin', color: lineGray },
});
format('H16:H18', {
  fill: paleGray,
  font: { bold: true, color: brandRed, size: 9 },
  horizontalAlignment: 'left',
  wrapText: true,
  borders: { preset: 'all', style: 'thin', color: lineGray },
});

setValues('C15:C19', [[''], [''], [''], [''], ['']]);
setValues('H16:H18', [[''], [''], ['']]);

merge('B20:H20');
setValues('B20', [['รายการสินค้า']]);
format('B20:H20', {
  fill: brandRed,
  font: { bold: true, color: '#FFFFFF', size: 12 },
  horizontalAlignment: 'left',
  borders: { preset: 'outside', style: 'medium', color: brandRed },
});

setValues('B21:H21', [['ลำดับ', 'รหัสเอกสาร', 'รหัสสินค้า', 'รายการ', 'จำนวน', 'หน่วย', 'จำนวนเงิน']]);
format('B21:H21', {
  fill: '#7F1D1D',
  font: { bold: true, color: '#FFFFFF' },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
  borders: { preset: 'all', style: 'thin', color: '#7F1D1D' },
});

const blankRows = Array.from({ length: 15 }, () => ['', '', '', '', '', '', '']);
setValues('B22:H36', blankRows);
format('B22:H36', {
  font: { color: darkText },
  verticalAlignment: 'center',
  borders: {
    insideHorizontal: { style: 'thin', color: '#E5E7EB' },
    insideVertical: { style: 'thin', color: '#E5E7EB' },
    left: { style: 'thin', color: lineGray },
    right: { style: 'thin', color: lineGray },
    bottom: { style: 'thin', color: lineGray },
  },
});
format('B22:B36', { horizontalAlignment: 'center' });
format('C22:D36', { horizontalAlignment: 'left', wrapText: true });
format('E22:E36', { horizontalAlignment: 'left', wrapText: true });
format('F22:F36', { horizontalAlignment: 'center' });
format('G22:H36', { horizontalAlignment: 'right', numberFormat: '#,##0.00' });

setValues('G37:H43', [
  ['ค่าวัตถุดิบรวม', ''],
  ['ส่วนลด', ''],
  ['ยอดก่อน VAT', ''],
  ['VAT 7%', ''],
  ['ค่าขนส่ง / ค่าใช้จ่ายอื่น', ''],
  ['', ''],
  ['ยอดรวมทั้งสิ้น', ''],
]);
format('G37:G43', {
  font: { bold: true, color: darkText },
  horizontalAlignment: 'right',
  verticalAlignment: 'center',
  borders: { preset: 'all', style: 'thin', color: lineGray },
});
format('H37:H43', {
  horizontalAlignment: 'right',
  verticalAlignment: 'center',
  numberFormat: '#,##0.00',
  borders: { preset: 'all', style: 'thin', color: lineGray },
});
format('G43:H43', {
  fill: softGold,
  font: { bold: true, color: brandRed, size: 13 },
  borders: { preset: 'outside', style: 'medium', color: brandRed },
});

merge('B39:F43');
setValues('B39', [['หมายเหตุ\nเอกสารนี้สร้างจากระบบสั่งซื้อวัตถุดิบ ชาพระนคร หลังผู้ดูแลระบบอนุมัติคำสั่งซื้อ']]);
format('B39:F43', {
  fill: paleGray,
  font: { color: mutedText, size: 9 },
  wrapText: true,
  verticalAlignment: 'top',
  borders: { preset: 'outside', style: 'thin', color: lineGray },
});

merge('B46:D46');
merge('F46:H46');
setValues('B45:H46', [
  ['ผู้สั่งซื้อ', '', '', '', 'ผู้อนุมัติ', '', ''],
  ['_________________________', '', '', '', '_________________________', '', ''],
]);
format('B45:H46', {
  font: { color: darkText },
  horizontalAlignment: 'center',
});

format('B2:H46', {
  font: { name: 'Arial' },
});
format('B2:H46', {
  borders: { preset: 'outside', style: 'medium', color: '#E5E7EB' },
});

sheet.freezePanes.freezeRows(21);

const preview = await workbook.render({
  sheetName: 'Form VAT',
  range: 'A1:I48',
  scale: 1,
  format: 'png',
});
await fs.writeFile(
  path.join(outputDir, 'Chaphranakhon_VAT_Template_preview.png'),
  new Uint8Array(await preview.arrayBuffer()),
);

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(path.join(outputDir, 'Chaphranakhon_VAT_Template.xlsx'));

const inspect = await workbook.inspect({
  kind: 'table',
  sheetId: 'Form VAT',
  range: 'B21:H43',
  include: 'values,formulas',
  tableMaxRows: 25,
  tableMaxCols: 8,
});
console.log(inspect.ndjson);
console.log(path.join(outputDir, 'Chaphranakhon_VAT_Template.xlsx'));
