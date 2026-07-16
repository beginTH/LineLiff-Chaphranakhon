const fs = require('fs');

const appPath = 'branch/app.js';
let app = fs.readFileSync(appPath, 'utf8');

const helper = `
function normalizeStatus(status) {
    return String(status || '').trim().toLowerCase();
}

function isProductHidden(status) {
    return ['ยกเลิก', 'cancelled', 'canceled', 'inactive', 'disabled', 'ปิด'].includes(normalizeStatus(status));
}

function isProductAvailable(status) {
    const value = normalizeStatus(status);
    return value === '' || ['พร้อม', 'active', 'available', 'in stock'].includes(value);
}
`;

if (!app.includes('function normalizeStatus(status)')) {
  app = app.replace('\nfunction normalizeProducts(raw) {', `${helper}\nfunction normalizeProducts(raw) {`);
}

app = app.replace(
  /\.filter\(product => \{\s*const status = String\(product\.status \|\| ''\)\.trim\(\)\.toLowerCase\(\);\s*return product\.name && product\.price > 0 && !\[[^\]]+\]\.includes\(status\);\s*\}\);/,
  `.filter(product => {
            return product.name && product.price > 0 && !isProductHidden(product.status);
        });`,
);

app = app.replace(
  /const qty = state\.cart\[p\.id\] \|\| 0;\s*const visual = p\.imageUrl/,
  `const qty = state.cart[p.id] || 0;
        const available = isProductAvailable(p.status);
        const statusBadge = available ? '' : '<span class="product-status-badge">หมด</span>';
        const visual = p.imageUrl`,
);

app = app.replace(
  /<div class="product-card\$\{qty > 0 \? ' in-cart' : ''\}" id="prod-\$\{p\.id\}">/,
  `<div class="product-card\${qty > 0 ? ' in-cart' : ''}\${available ? '' : ' is-unavailable'}" id="prod-\${p.id}">`,
);

app = app.replace(
  /<div class="product-visual">\$\{visual\}<\/div>/,
  `<div class="product-visual">\${visual}\${statusBadge}</div>`,
);

app = app.replace(
  /<button class="qty-btn dec" data-pid="\$\{p\.id\}" aria-label="([^"]*)">([^<]*)<\/button>\s*<span class="qty-value" id="qty-\$\{p\.id\}">\$\{qty\}<\/span>\s*<button class="qty-btn inc" data-pid="\$\{p\.id\}" aria-label="([^"]*)">\+<\/button>/,
  `<button class="qty-btn dec" data-pid="\${p.id}" aria-label="$1" \${available ? '' : 'disabled'}>$2</button>
                    <span class="qty-value" id="qty-\${p.id}">\${qty}</span>
                    <button class="qty-btn inc" data-pid="\${p.id}" aria-label="$3" \${available ? '' : 'disabled'}>+</button>`,
);

app = app.replace(
  /function changeQty\(pid, delta\) \{\s*const cur = state\.cart\[pid\] \|\| 0;/,
  `function changeQty(pid, delta) {
    const product = state.products.find(p => p.id === pid);
    if (!product || !isProductAvailable(product.status)) return;

    const cur = state.cart[pid] || 0;`,
);

fs.writeFileSync(appPath, app, 'utf8');

const workflowPath = process.argv[2];
if (workflowPath) {
  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
  const node = workflow.nodes.find((item) => item.name === 'Format Products Response');
  if (!node?.parameters?.jsCode) {
    throw new Error('Format Products Response node not found');
  }

  let code = node.parameters.jsCode;
  if (!code.includes('function normalizeStatus(status)')) {
    code = code.replace(
      '\nconst products = $input.all()',
      `
function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function isHiddenStatus(status) {
  return ['ยกเลิก', 'cancelled', 'canceled', 'inactive', 'disabled', 'ปิด'].includes(normalizeStatus(status));
}

const products = $input.all()`,
    );
  }
  code = code.replace(
    /\.filter\(\(product\) => \{\s*const status = String\(product\.status \|\| ''\)\.trim\(\)\.toLowerCase\(\);\s*return product\.name && product\.price > 0 && !\[[^\]]+\]\.includes\(status\);\s*\}\);/,
    `.filter((product) => {
    return product.name && product.price > 0 && !isHiddenStatus(product.status);
  });`,
  );
  node.parameters.jsCode = code;
  fs.writeFileSync(workflowPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
}

console.log('Updated product status support');
