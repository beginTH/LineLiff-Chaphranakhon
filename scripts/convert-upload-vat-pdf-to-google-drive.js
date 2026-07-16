const fs = require('fs');

const file = process.argv[2];
if (!file) {
  throw new Error('Usage: node convert-upload-vat-pdf-to-google-drive.js <workflow.json>');
}

const workflow = JSON.parse(fs.readFileSync(file, 'utf8'));
const node = workflow.nodes.find((item) => item.name === 'Upload VAT PDF');

if (!node) {
  throw new Error('Upload VAT PDF node not found');
}

node.type = 'n8n-nodes-base.googleDrive';
node.typeVersion = 3;
node.parameters = {
  name: "={{ $node['Restore VAT Payload'].json.fileName }}",
  driveId: {
    __rl: true,
    value: 'My Drive',
    mode: 'list',
    cachedResultName: 'My Drive',
    cachedResultUrl: 'https://drive.google.com/drive/my-drive',
  },
  folderId: {
    __rl: true,
    value: "={{ 'https://drive.google.com/drive/folders/' + $node['Restore VAT Payload'].json.folderId }}",
    mode: 'url',
  },
  options: {},
};

node.credentials = {
  googleDriveOAuth2Api: {
    id: 'QFxTIh9zRRzFm0DM',
    name: 'Google account DevCharphranakhon',
  },
};

fs.writeFileSync(file, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
console.log(`Converted Upload VAT PDF to Google Drive node in ${file}`);
