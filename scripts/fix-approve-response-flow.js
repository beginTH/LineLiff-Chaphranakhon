const fs = require('fs');

const file = process.argv[2];
if (!file) {
  throw new Error('Usage: node fix-approve-response-flow.js <workflow.json>');
}

const workflow = JSON.parse(fs.readFileSync(file, 'utf8'));

const updatePdfUrl = workflow.nodes.find((node) => node.name === 'Update PDF URL');
if (!updatePdfUrl) {
  throw new Error('Update PDF URL node not found');
}
updatePdfUrl.alwaysOutputData = true;

const buildVatPdfPayload = workflow.nodes.find((node) => node.name === 'Build VAT PDF Payload');
if (!buildVatPdfPayload?.parameters?.jsCode) {
  throw new Error('Build VAT PDF Payload node not found or has no jsCode');
}

buildVatPdfPayload.parameters.jsCode = buildVatPdfPayload.parameters.jsCode.replace(
  'fileName: `PO_${approval.Order_ID}.pdf`,',
  'fileName: `${approval.Order_ID}.pdf`,',
);

fs.writeFileSync(file, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
console.log(`Fixed approve response flow in ${file}`);
