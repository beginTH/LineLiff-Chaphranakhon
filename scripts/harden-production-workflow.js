const fs = require('fs');
const path = require('path');

const input = path.resolve('outputs/n8n_workflow_chaphranakhon_production_credit_bundle_v12.json');
const output = path.resolve('outputs/n8n_workflow_chaphranakhon_production_credit_bundle_v13_hardened.json');
const workflow = JSON.parse(fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, ''));

const findNode = (name) => {
  const node = workflow.nodes.find((item) => item.name === name);
  if (!node) throw new Error(`Missing node: ${name}`);
  return node;
};

const replaceOutgoing = (from, target) => {
  if (!workflow.connections[from]?.main?.[0]?.[0]) throw new Error(`Missing connection from: ${from}`);
  workflow.connections[from].main[0][0].node = target;
};

const addNode = (node) => {
  if (workflow.nodes.some((item) => item.name === node.name)) throw new Error(`Duplicate node: ${node.name}`);
  workflow.nodes.push(node);
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const readOrders = clone(findNode('Read Orders For Delivery Tax Invoice'));
readOrders.id = 'b6f5a8ac-9d6f-4ebd-a929-64796a2d7e02';
readOrders.name = 'Read Orders For Approval';
readOrders.position = [29760, 9488];
addNode(readOrders);

addNode({
  id: '4df783a5-37b4-4589-a38e-25d362730e84',
  name: 'Validate Pending Approval',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [30016, 9488],
  parameters: {
    jsCode: `function parseJson(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
function text(value) { return String(value ?? '').trim(); }
function number(value, label, { min = 0, integer = false } = {}) {
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || (integer && !Number.isInteger(result))) {
    throw new Error(label + ' is invalid');
  }
  return result;
}

const authorized = $node['Authorize Admin Approval'].json;
const requestedOrderId = text(authorized.orderId);
if (!requestedOrderId) throw new Error('Missing orderId');

const row = $input.all().map(item => item.json)
  .find(item => text(item.Order_ID) === requestedOrderId);
if (!row) throw new Error('Order not found: ' + requestedOrderId);

const status = text(row.Status || 'Pending').toLowerCase();
if (status !== 'pending') {
  const approvedBy = text(row.Approved_By);
  const approvedAt = text(row.Approved_At);
  throw new Error('Order is no longer pending (status: ' + (row.Status || '-') + ')' +
    (approvedBy ? ', approved by ' + approvedBy : '') +
    (approvedAt ? ' at ' + approvedAt : ''));
}

const details = parseJson(row.Order_Details, {});
const storedItems = Array.isArray(details.orderItems) ? details.orderItems : [];
if (!storedItems.length) throw new Error('The stored order has no items');

const sourceItems = Array.isArray(authorized.adjustedOrderItems) ? authorized.adjustedOrderItems : [];
if (sourceItems.length !== storedItems.length) throw new Error('Adjusted item count does not match the stored order');

const submittedById = new Map();
for (const item of sourceItems) {
  const id = text(item.productId || item.Product_ID);
  if (!id || submittedById.has(id)) throw new Error('Adjusted items contain a missing or duplicate product ID');
  submittedById.set(id, item);
}

const adjustedOrderItems = storedItems.map((stored) => {
  const productId = text(stored.productId || stored.Product_ID);
  const submitted = submittedById.get(productId);
  if (!submitted) throw new Error('Adjusted items do not match the stored order');
  const originalQuantity = number(stored.originalQuantity ?? stored.quantity ?? stored.Quantity, 'Stored quantity for ' + productId, { integer: true });
  const quantity = number(submitted.quantity, 'Approved quantity for ' + productId, { integer: true });
  if (quantity > originalQuantity) throw new Error('Approved quantity exceeds ordered quantity for ' + productId);
  const pricePerUnit = number(stored.pricePerUnit ?? stored.Price ?? stored.price, 'Stored price for ' + productId);
  return {
    productId,
    productName: text(stored.productName || stored.Product_Name || stored.name),
    unit: text(stored.unit || stored.Unit),
    originalQuantity,
    quantity,
    pricePerUnit,
    lineTotal: Number((quantity * pricePerUnit).toFixed(2)),
  };
});

const hasReduction = adjustedOrderItems.some(item => item.quantity < item.originalQuantity);
const adjustmentReason = text(authorized.adjustmentReason);
if (hasReduction && !adjustmentReason) throw new Error('Adjustment reason is required when reducing quantities');

const subtotal = Number(adjustedOrderItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
const shippingCost = number(authorized.shippingCost || 0, 'Shipping cost');
const discount = number(authorized.discount || 0, 'Discount');
const otherFee = number(authorized.otherFee || 0, 'Other fee');
if (discount > subtotal) throw new Error('Discount cannot exceed the adjusted subtotal');

return [{ json: {
  ...authorized,
  orderId: row.Order_ID,
  branchUid: text(row.LINE_UID),
  branchDisplayName: text(details.displayName || row.LINE_UID),
  orderDetails: details,
  orderNote: text(details.note),
  approvalHistory: parseJson(row.Approval_History, []),
  adjustedOrderItems,
  adjustmentReason,
  shippingCost,
  discount,
  otherFee,
  approvedAt: new Date().toISOString(),
} }];`,
  },
});

workflow.connections['Read Orders For Approval'] = {
  main: [[{ node: 'Validate Pending Approval', type: 'main', index: 0 }]],
};
workflow.connections['Validate Pending Approval'] = {
  main: [[{ node: 'Build Approval Row', type: 'main', index: 0 }]],
};
replaceOutgoing('Authorize Admin Approval', 'Read Orders For Approval');

findNode('Authorize Admin Approval').parameters.jsCode = `function norm(value) {
  return String(value || '').trim().toLowerCase();
}
function canApprove(role) {
  return ['owner', 'approver', 'approve'].includes(norm(role));
}
const request = $node['POST /admin-approve'].json;
const body = request.body || request;
const adminUid = String(body.adminUid || '').trim();
if (!adminUid) throw new Error('Missing adminUid. Please open approve page in LINE LIFF and login as admin.');
const admin = $input.all().map(item => item.json)
  .find(row => String(row.LINE_UID || row.lineUid || '').trim() === adminUid);
if (!admin) throw new Error('This LINE user is not listed in Admins sheet: ' + adminUid);
if (norm(admin.Status) !== 'active') throw new Error('This admin is inactive: ' + (admin.Display_Name || adminUid));
if (!canApprove(admin.Role)) throw new Error('This admin role cannot approve orders: ' + (admin.Role || ''));
return [{ json: { ...body, adminUid, authorizedAdmin: admin } }];`;

findNode('Build Approval Row').parameters.jsCode = `const body = $json.body || $json;
const items = Array.isArray(body.adjustedOrderItems) ? body.adjustedOrderItems : [];
if (!items.length) throw new Error('No validated order items to approve');
const subtotal = Number(items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0).toFixed(2));
const shippingCost = Number(body.shippingCost || 0);
const discount = Number(body.discount || 0);
const otherFee = Number(body.otherFee || 0);
const amountBeforeVat = Math.max(0, subtotal - discount);
const vatAmount = Number((amountBeforeVat * 0.07).toFixed(2));
const totalAmount = Number((amountBeforeVat + vatAmount + shippingCost + otherFee).toFixed(2));
const admin = body.authorizedAdmin || {};
const approvedAt = body.approvedAt || new Date().toISOString();
const adminUid = body.adminUid || '';
const adminName = admin.Display_Name || admin.Admin_ID || adminUid;
const previous = Array.isArray(body.approvalHistory) ? body.approvalHistory : [];
const history = [...previous, {
  action: 'APPROVED', adminUid, adminName, adminRole: admin.Role || '', approvedAt,
  adjustmentReason: body.adjustmentReason || '', adminNote: body.adminNote || '',
  items: items.map(item => ({ productId: item.productId, originalQuantity: item.originalQuantity, approvedQuantity: item.quantity })),
}];
const originalDetails = body.orderDetails && typeof body.orderDetails === 'object' ? body.orderDetails : {};
return [{ json: {
  Order_ID: body.orderId, Branch_UID: body.branchUid || '',
  Order_Details: JSON.stringify({ ...originalDetails, orderItems: items, note: body.orderNote || '' }),
  Subtotal: subtotal, Shipping_Cost: shippingCost, Discount: discount, Other_Fee: otherFee,
  VAT_Amount: vatAmount, Total_Amount: totalAmount, Status: 'Approved', Credit_Terms_Days: 7,
  Credit_Due_Date: new Date(new Date(approvedAt).getTime() + 7 * 86400000).toISOString(),
  Payment_Status: 'Credit Pending', Admin_Note: body.adminNote || '', Adjustment_Reason: body.adjustmentReason || '',
  Approved_By_UID: adminUid, Approved_By: adminName, Approved_At: approvedAt, Approval_History: JSON.stringify(history),
} }];`;

findNode('Approve Response').parameters.jsCode = `const a = $node['Build Approval Row'].json;
const p = $node['Aggregate Delivery Tax Invoice PDFs'].json;
const n = $node['Summarize Admin Approval Notify'].json;
return [{ json: {
  success: true, orderId: a.Order_ID, status: a.Status, subtotal: a.Subtotal,
  shippingCost: a.Shipping_Cost, discount: a.Discount, otherFee: a.Other_Fee,
  vatAmount: a.VAT_Amount, totalAmount: a.Total_Amount, adjustmentReason: a.Adjustment_Reason,
  approvalHistory: JSON.parse(a.Approval_History || '[]'), pdfUrl: p.pdfUrl, pdfUrls: p.pdfUrls,
  pageCount: p.pageCount, adminNotification: n,
} }];`;

workflow.name = 'Chaphranakhon Production Credit Bundle V13 Hardened';
workflow.active = false;
fs.writeFileSync(output, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log(`Created ${output} with ${workflow.nodes.length} nodes`);
