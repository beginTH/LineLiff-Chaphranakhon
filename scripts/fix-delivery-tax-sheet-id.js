const fs = require('fs');
const path = require('path');

const input = path.resolve('outputs/n8n_workflow_chaphranakhon_production_credit_bundle_v13_hardened.json');
const output = path.resolve('outputs/n8n_workflow_chaphranakhon_production_credit_bundle_v14_dynamic_sheet_id.json');
const workflow = JSON.parse(fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, ''));

const node = (name) => {
  const found = workflow.nodes.find((item) => item.name === name);
  if (!found) throw new Error(`Missing node: ${name}`);
  return found;
};

const addNode = (value) => {
  if (workflow.nodes.some((item) => item.name === value.name)) throw new Error(`Duplicate node: ${value.name}`);
  workflow.nodes.push(value);
};

addNode({
  id: 'cce7e29b-fbec-4bb1-897e-3ca673cea041',
  name: 'Get Copied Delivery Tax Invoice Metadata',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [30336, 9616],
  parameters: {
    method: 'GET',
    url: "={{ 'https://sheets.googleapis.com/v4/spreadsheets/' + $json.spreadsheetId + '?fields=sheets.properties(sheetId,title)' }}",
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleOAuth2Api',
    options: {},
  },
  credentials: { googleOAuth2Api: { id: 'ZPODlcDmX45WFVuM', name: 'Google Sheets account 2' } },
});

addNode({
  id: '0ee99cdd-6e3c-4732-a0c0-69e52f207bd9',
  name: 'Attach Delivery Tax Invoice Sheet ID',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [30592, 9616],
  parameters: {
    jsCode: `const payload = $node['Merge Delivery Tax Invoice Template'].json;
const sheets = Array.isArray($json.sheets) ? $json.sheets : [];
const sheet = sheets.find(item => item.properties?.title === 'Delivery Tax Invoice') || sheets[0];
const sheetId = sheet?.properties?.sheetId;
if (!Number.isInteger(sheetId)) {
  throw new Error('Copied Delivery Tax Invoice spreadsheet does not contain a usable sheetId');
}
return [{ json: { ...payload, deliveryTaxInvoiceSheetId: sheetId } }];`,
  },
});

workflow.connections['Merge Delivery Tax Invoice Template'] = {
  main: [[{ node: 'Get Copied Delivery Tax Invoice Metadata', type: 'main', index: 0 }]],
};
workflow.connections['Get Copied Delivery Tax Invoice Metadata'] = {
  main: [[{ node: 'Attach Delivery Tax Invoice Sheet ID', type: 'main', index: 0 }]],
};
workflow.connections['Attach Delivery Tax Invoice Sheet ID'] = {
  main: [[{ node: 'Compact Delivery Tax Invoice Layout', type: 'main', index: 0 }]],
};

const compact = node('Compact Delivery Tax Invoice Layout');
compact.position = [30848, 9616];
compact.parameters.jsonBody = compact.parameters.jsonBody.replaceAll('sheetId: 906132224', 'sheetId: $json.deliveryTaxInvoiceSheetId');

node('Restore Delivery Tax Invoice Payload').parameters.jsCode = `const payload = $node['Attach Delivery Tax Invoice Sheet ID'].json;
return { json: payload, binary: $binary };`;

const exportPdf = node('Export Delivery Tax Invoice PDF');
exportPdf.parameters.url = "={{ 'https://docs.google.com/spreadsheets/d/' + $json.copiedFileId + '/export?format=pdf&size=A4&portrait=true&scale=1&sheetnames=false&printtitle=false&pagenumbers=false&gridlines=false&fzr=false&top_margin=0&bottom_margin=0&left_margin=0&right_margin=0&gid=' + $json.deliveryTaxInvoiceSheetId }}";

workflow.name = 'Chaphranakhon Production Credit Bundle V14 Dynamic Sheet ID';
workflow.active = false;
fs.writeFileSync(output, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log(`Created ${output} with ${workflow.nodes.length} nodes`);
