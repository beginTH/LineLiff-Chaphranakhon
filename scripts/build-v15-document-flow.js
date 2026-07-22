const fs = require('fs');
const path = require('path');

const input = path.resolve('outputs/n8n_workflow_chaphranakhon_production_credit_bundle_v14_dynamic_sheet_id.json');
const output = path.resolve('outputs/n8n_workflow_chaphranakhon_production_credit_bundle_v15_document_flow.json');
const workflow = JSON.parse(fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, ''));

const uid = (() => { let value = 0; return () => `v15-${++value}`; })();
const node = (name) => {
  const found = workflow.nodes.find((item) => item.name === name);
  if (!found) throw new Error(`Missing node: ${name}`);
  return found;
};
const clone = (sourceName, name, position) => {
  const value = JSON.parse(JSON.stringify(node(sourceName)));
  value.id = uid(); value.name = name; value.position = position;
  workflow.nodes.push(value);
  return value;
};
const add = (value) => { value.id = value.id || uid(); workflow.nodes.push(value); return value; };
const link = (from, to) => { workflow.connections[from] = { main: [[{ node: to, type: 'main', index: 0 }]] }; };

// Persist order origin with the existing JSON column: no new Orders column is needed.
node('Build Order Row').parameters.jsCode = node('Build Order Row').parameters.jsCode.replace(
  "isNewAddress: Boolean(body.isNewAddress),",
  "isNewAddress: Boolean(body.isNewAddress),\n      orderSource: 'LINE_LIFF',\n      orderSourceLabel: 'สั่งซื้อผ่าน LINE LIFF',"
);

// Thai LINE messages were previously saved with the wrong text encoding.
node('Build Branch LINE Message').parameters.jsCode = `const payload = $node['Aggregate Delivery Tax Invoice PDFs'].json;
const money = (value) => Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const links = payload.pdfUrls.map((url, index) => 'เอกสารหน้า ' + (index + 1) + ': ' + url).join('\\n');
return [{ json: { to: payload.branchUid, text: [
  'คำสั่งซื้อได้รับการอนุมัติแล้ว',
  'เลขที่: ' + payload.orderId,
  'สาขา: ' + payload.branchName,
  'ยอดรวมสุทธิ: ฿' + money(payload.totalAmount),
  'ใบส่งของ/ใบกำกับภาษี PDF (' + payload.pageCount + ' หน้า):', links
].join('\\n') } }];`;

// The delivery/tax invoice must not overwrite the internally generated PO link.
node('Update PDF URL').parameters.columns.value = {
  Order_ID: "={{ $node['Aggregate Delivery Tax Invoice PDFs'].json.orderId }}",
  PO_PDF_File_ID: "={{ $node['Aggregate Delivery Tax Invoice PDFs'].json.poPdfFileId || '' }}",
  PO_PDF_URL: "={{ $node['Aggregate Delivery Tax Invoice PDFs'].json.poPdfUrl || '' }}",
};

const dbId = '1aKwY4KOo8uGCRrHASD539Habt5Obam8meacRO-ir0Ks';
const docsSchema = [
  'Document_ID','Order_ID','Document_Type','File_ID','File_URL','Created_At','Created_By_UID','Created_By_Name','Status','Note'
];
const docsAppend = (name, source, position) => add({
  name, type: 'n8n-nodes-base.googleSheets', typeVersion: 4, position,
  parameters: { operation: 'append', documentId: { __rl: true, value: dbId, mode: 'list', cachedResultName: 'Chaphranakhon_DB' }, sheetName: { __rl: true, value: 'Documents', mode: 'name' }, columns: { mappingMode: 'defineBelow', value: {
    Document_ID: `={{ $node['${source}'].json.documentId }}`,
    Order_ID: `={{ $node['${source}'].json.orderId }}`,
    Document_Type: `={{ $node['${source}'].json.documentType }}`,
    File_ID: `={{ $node['${source}'].json.pdfFileId }}`,
    File_URL: `={{ $node['${source}'].json.pdfUrl }}`,
    Created_At: `={{ $node['${source}'].json.createdAt }}`,
    Created_By_UID: `={{ $node['${source}'].json.createdByUid || '' }}`,
    Created_By_Name: `={{ $node['${source}'].json.createdByName || '' }}`,
    Status: 'Created', Note: `={{ $node['${source}'].json.note || '' }}`
  }, matchingColumns: [], schema: docsSchema.map((id) => ({ id, displayName: id, required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true })), attemptToConvertTypes: false, convertFieldsToString: false }, options: {} },
  alwaysOutputData: true, credentials: JSON.parse(JSON.stringify(node('Update PDF URL').credentials)),
});

function addDocumentPipeline(prefix, payloadFrom, templateFileId, folderId, sheetTitle, filePrefix, y, continuation) {
  const build = add({ name: `Build ${prefix} Payload`, type: 'n8n-nodes-base.code', typeVersion: 2, position: [29504, y], parameters: { jsCode: `
function parse(v){ try { return v ? JSON.parse(v) : {}; } catch { return {}; } }
function val(o, keys, fallback=''){ for (const k of keys) if (o?.[k] !== undefined && o[k] !== null && String(o[k]).trim() !== '') return o[k]; return fallback; }
function thaiDate(v){ const d = v ? new Date(v) : new Date(); return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',year:'numeric'}).format(Number.isNaN(d.getTime()) ? new Date() : d); }
const rows = $input.all().map(i => i.json);
const base = ${payloadFrom};
const row = rows.find(i => String(i.Order_ID || '') === String(base.orderId || base.Order_ID || ''));
if (!row) throw new Error('Order not found while creating ${prefix}');
const delivery = parse(row.Delivery_Address), details = parse(row.Order_Details);
const items = (details.orderItems || []).filter(i => Number(val(i,['quantity','Quantity','qty'],0)) > 0);
const buyer = val(details,['buyerName','displayName','contactName'], '');
const branch = val(delivery,['label','branchName'], buyer);
const address = val(delivery,['text','address'], '');
const contact = val(delivery,['contactName','contact'], buyer);
const tel = val(delivery,['tel','phone','mobile'], '');
const subtotal = Number(base.subtotal ?? row.Subtotal ?? items.reduce((s,i)=>s+Number(i.lineTotal||0),0));
const discount = Number(base.discount ?? row.Discount ?? 0), shipping = Number(base.shippingCost ?? row.Shipping_Cost ?? 0), otherFee = Number(base.otherFee ?? row.Other_Fee ?? 0), vat = Number(base.vatAmount ?? row.VAT_Amount ?? 0), total = Number(base.totalAmount ?? row.Total_Amount ?? subtotal);
const filled = Array.from({length:20}, (_,i) => items[i] || null);
const values = [
  {range:'${sheetTitle}!D14',values:[[buyer]]},{range:'${sheetTitle}!D15',values:[[branch]]},{range:'${sheetTitle}!D16',values:[[address]]},{range:'${sheetTitle}!D17',values:[[contact]]},{range:'${sheetTitle}!G17',values:[[tel ? 'Tel. '+tel : 'Tel.']]},{range:'${sheetTitle}!J15',values:[[base.orderId || base.Order_ID]]},{range:'${sheetTitle}!J17',values:[[thaiDate(base.createdAt || base.approvedAt || row.Timestamp)]]},{range:'${sheetTitle}!D18',values:[['ช่องทางการสั่งซื้อ: LINE LIFF | ' + (details.note || '')]},
  {range:'${sheetTitle}!B22:B41',values:filled.map((i,n)=>[i?n+1:''])},{range:'${sheetTitle}!C22:C41',values:filled.map(i=>[i?val(i,['productId','Product_ID','id']):''])},{range:'${sheetTitle}!E22:E41',values:filled.map(i=>[i?val(i,['productName','Product_Name','name']):''])},{range:'${sheetTitle}!G22:G41',values:filled.map(i=>[i?Number(val(i,['quantity','Quantity','qty'],0)):''])},{range:'${sheetTitle}!H22:H41',values:filled.map(i=>[i?val(i,['unit','Unit','UOM']):''])},{range:'${sheetTitle}!I22:I41',values:filled.map(i=>[i?Number(val(i,['pricePerUnit','Price','price'],0)):''])},{range:'${sheetTitle}!J22:J41',values:filled.map(i=>[i?Number(i.lineTotal ?? Number(val(i,['quantity','Quantity','qty'],0))*Number(val(i,['pricePerUnit','Price','price'],0))):''])},
  {range:'${sheetTitle}!J42',values:[[vat]]},{range:'${sheetTitle}!J43',values:[[shipping+otherFee]]},{range:'${sheetTitle}!J45',values:[[total]]}
];
return [{json:{ orderId: base.orderId || base.Order_ID, branchUid: base.branchUid || row.LINE_UID || '', branchName: branch, fileName:'${filePrefix}-'+(base.orderId || base.Order_ID)+'.pdf', copiedSheetName:'${filePrefix}_'+(base.orderId || base.Order_ID), templateFileId:'${templateFileId}', folderId:'${folderId}', valuesBatchUpdate:{valueInputOption:'USER_ENTERED',data:values}, documentType:'${prefix}', documentId:'${prefix}-'+(base.orderId || base.Order_ID), createdAt:new Date().toISOString(), createdByUid:base.adminUid || '', createdByName:base.adminName || '', note:details.note || ''}}];` } });
  const copy = clone('Copy Delivery Tax Invoice Template', `Copy ${prefix} Template`, [29760, y]);
  const merge = clone('Merge Delivery Tax Invoice Template', `Merge ${prefix} Template`, [30016, y]);
  merge.parameters.jsCode = `const payload = $('Build ${prefix} Payload').item.json; return { json: { ...payload, spreadsheetId: $json.id, copiedFileId: $json.id } };`;
  const meta = clone('Get Copied Delivery Tax Invoice Metadata', `Get Copied ${prefix} Metadata`, [30272, y]);
  const attach = clone('Attach Delivery Tax Invoice Sheet ID', `Attach ${prefix} Sheet ID`, [30528, y]);
  attach.parameters.jsCode = `const payload = $node['Merge ${prefix} Template'].json; const sheets = Array.isArray($json.sheets) ? $json.sheets : []; const sheet = sheets.find(i => i.properties?.title === '${sheetTitle}') || sheets[0]; if (!Number.isInteger(sheet?.properties?.sheetId)) throw new Error('No usable sheetId for ${prefix}'); return [{json:{...payload, documentSheetId:sheet.properties.sheetId}}];`;
  const fill = clone('Fill Delivery Tax Invoice Template', `Fill ${prefix} Template`, [30784, y]);
  const restore = clone('Restore Delivery Tax Invoice Payload', `Restore ${prefix} Payload`, [31040, y]);
  restore.parameters.jsCode = `return { json: $node['Attach ${prefix} Sheet ID'].json, binary: $binary };`;
  const exportPdf = clone('Export Delivery Tax Invoice PDF', `Export ${prefix} PDF`, [31296, y]);
  exportPdf.parameters.url = `={{ 'https://docs.google.com/spreadsheets/d/' + $json.copiedFileId + '/export?format=pdf&size=A4&portrait=true&scale=1&sheetnames=false&printtitle=false&pagenumbers=false&gridlines=false&fzr=false&top_margin=0&bottom_margin=0&left_margin=0&right_margin=0&gid=' + $json.documentSheetId }}`;
  const upload = clone('Upload Delivery Tax Invoice PDF', `Upload ${prefix} PDF`, [31552, y]);
  upload.parameters.name = `={{ $('Restore ${prefix} Payload').item.json.fileName }}`;
  upload.parameters.folderId.value = `https://drive.google.com/drive/folders/${folderId}`;
  const url = clone('Build PDF URL', `Build ${prefix} PDF URL`, [31808, y]);
  url.parameters.jsCode = `const payload = $('Restore ${prefix} Payload').item.json; const fileId = $json.id || payload.copiedFileId; return {json:{...payload,pdfFileId:fileId,pdfUrl:'https://drive.google.com/file/d/'+fileId+'/view?usp=drivesdk},binary:$binary};`;
  const log = docsAppend(`Log ${prefix} Document`, `Build ${prefix} PDF URL`, [32064, y]);
  link(continuation, `Build ${prefix} Payload`); link(`Build ${prefix} Payload`, `Copy ${prefix} Template`); link(`Copy ${prefix} Template`, `Merge ${prefix} Template`); link(`Merge ${prefix} Template`, `Get Copied ${prefix} Metadata`); link(`Get Copied ${prefix} Metadata`, `Attach ${prefix} Sheet ID`); link(`Attach ${prefix} Sheet ID`, `Fill ${prefix} Template`); link(`Fill ${prefix} Template`, `Restore ${prefix} Payload`); link(`Restore ${prefix} Payload`, `Export ${prefix} PDF`); link(`Export ${prefix} PDF`, `Upload ${prefix} PDF`); link(`Upload ${prefix} PDF`, `Build ${prefix} PDF URL`); link(`Build ${prefix} PDF URL`, `Log ${prefix} Document`);
  return { build, log };
}

// PO: created immediately after an order is safely saved, but is sent only to admins.
const po = addDocumentPipeline('Purchase Order', "$node['Build Order Row'].json", '1cYR0UlHe8WyTTA8X2iC9M703lN1i0sa1OgeUG0VfpdI', '1mnFGZrSUFsEA9NkohmNYwXKJf6OEqrhj', 'Purchase Order', 'PO', 8848, 'Save New Order');
link('Log Purchase Order Document', 'Read Admins For Notify');

// Keep PO URL in Orders, then notification can be sent to the admin only.
const updatePo = clone('Update Payment Proof Status', 'Update Purchase Order URL', [32320, 8848]);
updatePo.parameters.columns.value = { Order_ID: "={{ $node['Build Purchase Order PDF URL'].json.orderId }}", PO_PDF_File_ID: "={{ $node['Build Purchase Order PDF URL'].json.pdfFileId }}", PO_PDF_URL: "={{ $node['Build Purchase Order PDF URL'].json.pdfUrl }}" };
updatePo.parameters.columns.matchingColumns = ['Order_ID'];
link('Build Purchase Order PDF URL', 'Update Purchase Order URL'); link('Update Purchase Order URL', 'Log Purchase Order Document');

// Receipt: intentionally requires an authenticated admin call after payment proof has been reviewed.
add({ name: 'POST /admin-verify-payment', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [28736, 10624], parameters: { httpMethod: 'POST', path: 'admin-verify-payment', responseMode: 'responseNode', options: {} } });
const readAdmins = clone('Read Admins For Approve', 'Read Admins For Payment Verify', [28992,10624]);
const auth = clone('Authorize Admin Approval', 'Authorize Payment Verification', [29248,10624]);
auth.parameters.jsCode = `const body = $node['POST /admin-verify-payment'].json.body || $node['POST /admin-verify-payment'].json; const admins = $input.all().map(i=>i.json); const admin = admins.find(i => String(i.LINE_UID || i.Line_UID || '').trim() === String(body.adminUid || body.lineUid || '').trim() && String(i.Status || '').trim().toLowerCase() === 'active'); if (!admin) throw new Error('Only an active admin may verify payment'); return [{json:{...body,adminUid:body.adminUid || body.lineUid,adminName:body.adminName || admin.Display_Name || admin.Admin_ID || '',verifiedAt:new Date().toISOString()}}];`;
const readOrders = clone('Read Orders For Payment Proof', 'Read Orders For Payment Verify', [29504,10624]);
const verify = add({ name:'Validate Payment Verification', type:'n8n-nodes-base.code', typeVersion:2, position:[29760,10624], parameters:{jsCode:`const request = $node['Authorize Payment Verification'].json; const order = $input.all().map(i=>i.json).find(i=>String(i.Order_ID||'')===String(request.orderId||'')); if (!order) throw new Error('Order not found'); if (String(order.Payment_Status||'').toLowerCase() !== 'submitted') throw new Error('Payment proof has not been submitted'); return [{json:{...request,orderId:order.Order_ID,branchUid:order.LINE_UID,totalAmount:Number(order.Total_Amount||0),subtotal:Number(order.Subtotal||0),shippingCost:Number(order.Shipping_Cost||0),discount:Number(order.Discount||0),otherFee:Number(order.Other_Fee||0),vatAmount:Number(order.VAT_Amount||0)}}];`}});
const updatePayment = clone('Update Payment Proof Status', 'Update Payment Verification Status', [30016,10624]);
updatePayment.parameters.columns.value = { Order_ID: '={{ $json.orderId }}', Payment_Status: 'Verified', Payment_Verified_At: '={{ $json.verifiedAt }}', Payment_Verified_By: '={{ $json.adminName }}', Payment_Verified_By_UID: '={{ $json.adminUid }}' };
updatePayment.parameters.columns.matchingColumns = ['Order_ID'];
const receipt = addDocumentPipeline('Receipt', "$node['Validate Payment Verification'].json", '1d4w34axNs8QQhqaZQzSQTD7sZZgQxW-KHvvSVa_TEpU', '1Bd3_454lB4Exaerlps02h2RVRP8Qry6P', 'Receipt', 'RC', 10880, 'Update Payment Verification Status');
const receiptMsg = add({ name:'Build Receipt LINE Message', type:'n8n-nodes-base.code', typeVersion:2, position:[32320,10880], parameters:{jsCode:`const doc = $node['Build Receipt PDF URL'].json; const money = Number(doc.totalAmount || 0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}); return [{json:{to:doc.branchUid,text:['ยืนยันรับชำระเงินเรียบร้อย','เลขที่คำสั่งซื้อ: '+doc.orderId,'ยอดชำระ: ฿'+money,'ดาวน์โหลดใบเสร็จรับเงิน: '+doc.pdfUrl].join('\\n')}}];`}});
const notifyReceipt = clone('Notify Branch LINE', 'Notify Branch Receipt LINE', [32576,10880]);
const response = clone('Respond Payment Proof', 'Payment Verification Response', [32832,10880]);
response.parameters.respondWith = 'json'; response.parameters.responseBody = '={{ { success: true, message: "Payment verified and receipt created", orderId: $node["Build Receipt PDF URL"].json.orderId, receiptUrl: $node["Build Receipt PDF URL"].json.pdfUrl } }}';
link('Log Receipt Document', 'Build Receipt LINE Message'); link('Build Receipt LINE Message', 'Notify Branch Receipt LINE'); link('Notify Branch Receipt LINE', 'Payment Verification Response');
link('POST /admin-verify-payment', 'Read Admins For Payment Verify'); link('Read Admins For Payment Verify', 'Authorize Payment Verification'); link('Authorize Payment Verification', 'Read Orders For Payment Verify'); link('Read Orders For Payment Verify', 'Validate Payment Verification'); link('Validate Payment Verification', 'Update Payment Verification Status');

workflow.name = 'Chaphranakhon Production Credit Bundle V15 Document Flow';
workflow.active = false;
fs.writeFileSync(output, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log(`Created ${output} with ${workflow.nodes.length} nodes`);
