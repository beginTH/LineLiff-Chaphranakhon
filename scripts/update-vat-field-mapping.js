const fs = require('fs');
const path = require('path');

const inputPath = path.resolve('n8n_workflow_chaphranakhon_fixed.json');
const outputPath = path.resolve('outputs', 'n8n_workflow_chaphranakhon_vat_fields_fixed.json');
const workflow = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const node = workflow.nodes.find((item) => item.name === 'Build VAT PDF Payload');

if (!node) throw new Error('Build VAT PDF Payload node not found');

node.parameters.jsCode = `function parseJson(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function pickFirst(source, keys, fallback = '') {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return fallback;
}

function formatThaiDate(value) {
  const date = value ? new Date(value) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(validDate).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return parts.day + '/' + parts.month + '/' + parts.year;
}

const approval = $node['Build Approval Row'].json;
const rows = $input.all().map(item => item.json);
const row = rows.find(item => String(item.Order_ID || '').trim() === String(approval.Order_ID || '').trim());
if (!row) throw new Error('Order not found for PDF: ' + approval.Order_ID);

const delivery = parseJson(row.Delivery_Address, {});
const details = parseJson(row.Order_Details, {});
const items = Array.isArray(details.orderItems) ? details.orderItems : [];

const buyerName = pickFirst(details, ['buyerName', 'displayName', 'contactName'], pickFirst(row, ['Display_Name'], ''));
const branchName = pickFirst(delivery, ['label', 'Address_Label', 'branchName'], pickFirst(details, ['branchName'], ''));
const addressText = pickFirst(delivery, ['text', 'address', 'Address'], '');
const contactName = pickFirst(delivery, ['contactName', 'contact', 'Contact_Name'], pickFirst(details, ['contactName'], buyerName));
const contactTel = String(pickFirst(delivery, ['tel', 'Tel', 'TEL', 'phone', 'Phone', 'mobile'], pickFirst(row, ['Tel', 'Phone'], ''))).trim();
const approvedDate = formatThaiDate(approval.Approved_At || row.Approved_At || row.Timestamp);

const subtotal = Number(row.Subtotal || 0);
const shippingCost = Number(approval.Shipping_Cost || 0);
const discount = Number(approval.Discount || 0);
const otherFee = Number(approval.Other_Fee || 0);
// Shipping and other fees are VAT-inclusive bases per the requested business rule.
const amountBeforeVat = Math.max(0, subtotal - discount + shippingCost + otherFee);
const vatAmount = Number((amountBeforeVat * 0.07).toFixed(2));
const totalAmount = Number((amountBeforeVat + vatAmount).toFixed(2));

const values = [
  { range: 'Form VAT!D14', values: [[buyerName]] },
  { range: 'Form VAT!D15', values: [[branchName]] },
  { range: 'Form VAT!D16', values: [[addressText]] },
  { range: 'Form VAT!D17', values: [[contactName]] },
  { range: 'Form VAT!G17', values: [[contactTel ? ('Tel. ' + contactTel) : 'Tel.']] },
  { range: 'Form VAT!J15', values: [[approval.Order_ID]] },
  { range: 'Form VAT!J17', values: [[approvedDate]] },
  { range: 'Form VAT!D18', values: [[details.note || '']] },
];

const rowCount = 17;
const paddedItems = Array.from({ length: rowCount }, (_, index) => items[index] || null);
values.push({ range: 'Form VAT!B22:B38', values: paddedItems.map((item, index) => [item ? index + 1 : '']) });
values.push({ range: 'Form VAT!C22:C38', values: paddedItems.map(item => [item ? pickFirst(item, ['productId', 'Product_ID', 'id']) : '']) });
values.push({ range: 'Form VAT!E22:E38', values: paddedItems.map(item => [item ? pickFirst(item, ['productName', 'Product_Name', 'name']) : '']) });
values.push({ range: 'Form VAT!G22:G38', values: paddedItems.map(item => [item ? Number(pickFirst(item, ['quantity', 'Quantity', 'qty'], 0)) : '']) });
values.push({ range: 'Form VAT!H22:H38', values: paddedItems.map(item => [item ? pickFirst(item, ['unit', 'Unit', 'UOM']) : '']) });
values.push({ range: 'Form VAT!I22:I38', values: paddedItems.map(item => [item ? Number(pickFirst(item, ['pricePerUnit', 'Price', 'price'], 0)) : '']) });
values.push({ range: 'Form VAT!J22:J38', values: paddedItems.map(item => {
  if (!item) return [''];
  const quantity = Number(pickFirst(item, ['quantity', 'Quantity', 'qty'], 0));
  const price = Number(pickFirst(item, ['pricePerUnit', 'Price', 'price'], 0));
  return [Number(pickFirst(item, ['lineTotal', 'Line_Total', 'total'], quantity * price))];
}) });

values.push({ range: 'Form VAT!J39', values: [[subtotal]] });
values.push({ range: 'Form VAT!J40', values: [[discount]] });
values.push({ range: 'Form VAT!J41', values: [[amountBeforeVat]] });
values.push({ range: 'Form VAT!J42', values: [[vatAmount]] });
values.push({ range: 'Form VAT!J43', values: [[shippingCost + otherFee]] });
values.push({ range: 'Form VAT!J45', values: [[totalAmount]] });

return [{ json: {
  orderId: approval.Order_ID,
  branchUid: approval.Branch_UID || row.LINE_UID || '',
  branchName: branchName || buyerName || row.LINE_UID || '',
  subtotal, shippingCost, discount, otherFee, vatAmount, totalAmount,
  fileName: approval.Order_ID + '.pdf',
  copiedSheetName: 'VAT_' + approval.Order_ID,
  templateFileId: '1TaNIehtqTua1rWetnuIu6MIU7QPt60Bl',
  folderId: '1mnFGZrSUFsEA9NkohmNYwXKJf6OEqrhj',
  valuesBatchUpdate: { valueInputOption: 'USER_ENTERED', data: values },
} }];`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log(outputPath);
