const fs = require('fs');

const [file, templateFileId, folderId] = process.argv.slice(2);

if (!file || !templateFileId || !folderId) {
  throw new Error('Usage: node update-vat-ids.js <workflow.json> <templateFileId> <folderId>');
}

const workflow = JSON.parse(fs.readFileSync(file, 'utf8'));
const buildPayload = workflow.nodes.find((node) => node.name === 'Build VAT PDF Payload');

if (!buildPayload?.parameters?.jsCode) {
  throw new Error('Build VAT PDF Payload node not found or has no jsCode');
}

buildPayload.parameters.jsCode = buildPayload.parameters.jsCode
  .replace(
    /templateFileId: '[^']*'/,
    `templateFileId: '${templateFileId}'`,
  )
  .replace(
    /folderId: '[^']*'/,
    `folderId: '${folderId}'`,
  );

fs.writeFileSync(file, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
console.log(`Updated VAT IDs in ${file}`);
