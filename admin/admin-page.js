const ADMIN_API_BASE = 'https://n8n.n8n-kokujapan.org';
const ADMIN_LIFF_ID = '2010570929-BJxo68XQ';
const pageView = document.body.dataset.view;
let adminIdToken = '';
let adminProfile = null;
let allItems = [];
let activeStatus = 'all';
let activeBranch = 'all';
let searchTerm = '';

const pageCopy = {
  orders: { title: 'ประวัติ Order', subtitle: 'ติดตามคำสั่งซื้อและสถานะล่าสุด', heading: 'รายการ Order', endpoint: 'admin-orders', search: 'ค้นหาเลขที่ Order ชื่อสาขา หรือ LINE UID' },
  payments: { title: 'รายการชำระเงิน', subtitle: 'ตรวจสอบรายการที่ชำระแล้วและยังไม่ชำระ', heading: 'รายการชำระเงิน', endpoint: 'admin-payments', search: 'ค้นหาเลขที่ Order ชื่อสาขา หรือ LINE UID' },
  products: { title: 'จัดการวัตถุดิบ', subtitle: 'แก้ไขรูป ราคา หน่วย ประเภท และสถานะ', heading: 'รายการวัตถุดิบ', endpoint: 'admin-products', search: 'ค้นหารหัส ชื่อ หรือประเภทสินค้า' },
  users: { title: 'จัดการสมาชิก', subtitle: 'ตรวจสอบข้อมูลสมาชิกและแก้ไข Role', heading: 'สมาชิกในระบบ', endpoint: 'admin-users', search: 'ค้นหาชื่อ LINE UID หรือ Role' },
};
const pageLinks = { orders: 'orders.html', payments: 'payments.html', products: 'inventory.html', users: 'members.html' };
const pageLabels = { orders: 'Order', payments: 'ชำระเงิน', products: 'วัตถุดิบ', users: 'สมาชิก' };
const roles = ['general', 'customer', 'branch', 'owner', 'admin', 'superadmin'];
const productStatuses = ['พร้อม', 'ปิด', 'ยกเลิก'];
const normalizeProductStatus = value => {
  const status = String(value || '').trim().toLowerCase();
  if (['inactive', 'disabled', 'ปิด'].includes(status)) return 'ปิด';
  if (['cancelled', 'canceled', 'ยกเลิก'].includes(status)) return 'ยกเลิก';
  return 'พร้อม';
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const money = value => `฿${Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateTime = value => { const parsed = new Date(value); return !value || Number.isNaN(parsed.getTime()) ? (value ? String(value).replace('T', ' ').replace('.000Z', '') : '—') : parsed.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }); };
const orderAge = value => { const then = new Date(value); if (Number.isNaN(then.getTime())) return 'ไม่ทราบเวลา'; const minutes = Math.max(0, Math.floor((Date.now() - then.getTime()) / 60000)); if (minutes < 60) return `${minutes} นาทีที่แล้ว`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`; return `${Math.floor(hours / 24)} วันที่แล้ว`; };
const statusClass = value => /approved|verified|paid|\bactive\b|\bavailable\b|พร้อม|สำเร็จ|success/i.test(String(value)) ? 'admin-badge--success' : /pending|รอ|submit|review|ยังไม่ชำระ/i.test(String(value)) ? 'admin-badge--warn' : /reject|cancel|inactive|unavailable|ระงับ|ยกเลิก/i.test(String(value)) ? 'admin-badge--danger' : 'admin-badge--neutral';

function authHeaders(extra = {}) {
  if (!adminIdToken) throw new Error('ไม่พบเซสชัน LINE กรุณาเปิดหน้า Admin ใหม่จาก LINE');
  return { ...extra, Authorization: `Bearer ${adminIdToken}` };
}

function setState(kind, title, detail = '', retry = false) {
  const content = document.querySelector('#page-content');
  content.innerHTML = `<div class="admin-state ${kind === 'error' ? 'admin-state--error' : ''}">${kind === 'loading' ? '<div class="admin-spinner" aria-hidden="true"></div>' : ''}<strong>${esc(title)}</strong>${detail ? `<span>${esc(detail)}</span>` : ''}${retry ? '<button class="admin-retry" type="button">ลองใหม่</button>' : ''}</div>`;
  content.querySelector('.admin-retry')?.addEventListener('click', loadPage);
}
function field(label, value, extraClass = '') { return `<div><div class="admin-field-label">${esc(label)}</div><div class="admin-field-value ${extraClass}">${esc(value || '—')}</div></div>`; }
function safeUrl(value) { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
function linkActions(actions = []) { return actions.filter(action => safeUrl(action.url)).map(action => `<a class="admin-record-link" href="${esc(safeUrl(action.url))}" target="_blank" rel="noopener noreferrer">${esc(action.label)} <span aria-hidden="true">↗</span></a>`).join(''); }
function isPendingOrder(item) { return /^(pending|รอดำเนินการ|รออนุมัติ|submit|review)$/i.test(String(item.status || '').trim()); }
function orderApprovalAction(item) {
  if (!isPendingOrder(item) || !item.orderId) return '';
  const url = new URL('index.html', window.location.href);
  url.searchParams.set('orderId', item.orderId);
  return `<a class="admin-record-link admin-record-link--approve" href="${esc(url.href)}">ตรวจสอบและอนุมัติ <span aria-hidden="true">→</span></a>`;
}
function record(title, meta, badge, fields, actions = '', edit = '') { return `<article class="admin-record"><div class="admin-record-top"><div><div class="admin-record-title">${esc(title || '—')}</div>${meta ? `<div class="admin-record-meta">${esc(meta)}</div>` : ''}</div>${badge ? `<span class="admin-badge ${statusClass(badge)}">${esc(statusLabel(badge))}</span>` : ''}</div><div class="admin-fields">${fields.join('')}</div>${actions ? `<div class="admin-record-actions">${actions}</div>` : ''}${edit}</article>`; }
function isUnpaid(item) { const status = String(item.paymentStatus || '').trim().toLowerCase(); return !status || /^(unpaid|not paid|pending payment|pending_payment|ยังไม่ชำระ|รอชำระ|รอการชำระเงิน|-)$/.test(status); }
function itemStatus(item) { if (pageView === 'payments') return isUnpaid(item) ? 'ยังไม่ชำระ' : item.paymentStatus; if (pageView === 'orders') return String(item.status || 'ไม่ระบุ'); return String(pageView === 'products' ? item.status : (item.role || item.friendStatus) || 'ไม่ระบุ'); }
function statusLabel(value) { const status = String(value || '').trim().toLowerCase(); const labels = { pending: 'รอดำเนินการ', submit: 'รอดำเนินการ', submitted: 'รอตรวจสอบการชำระเงิน', review: 'รอดำเนินการ', approved: 'อนุมัติแล้ว', verified: 'ตรวจสอบแล้ว', paid: 'ชำระแล้ว', rejected: 'ปฏิเสธแล้ว', cancelled: 'ยกเลิกแล้ว', unpaid: 'ยังไม่ชำระ' }; return labels[status] || String(value || 'ไม่ระบุ'); }
function itemSearchText(item) { return Object.values(item).filter(value => typeof value !== 'object').join(' ').toLocaleLowerCase('th'); }
function renderSummary(items) {
  const success = items.filter(item => /approved|verified|paid|\bactive\b|\bavailable\b|พร้อม|สำเร็จ|success/i.test(itemStatus(item))).length;
  const pending = items.filter(item => /pending|รอ|submit|review|ยังไม่ชำระ/i.test(itemStatus(item))).length;
  const total = ['orders', 'payments'].includes(pageView) ? items.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0) : null;
  const label = total !== null ? 'มูลค่ารวม' : (pageView === 'products' ? 'พร้อมใช้งาน' : 'Active / Admin');
  return `<section class="admin-summary" aria-label="สรุปข้อมูล"><div class="admin-summary-item"><span>ทั้งหมด</span><strong>${items.length.toLocaleString('th-TH')}</strong></div><div class="admin-summary-item"><span>รอดำเนินการ</span><strong>${pending.toLocaleString('th-TH')}</strong></div><div class="admin-summary-item"><span>${label}</span><strong>${total !== null ? money(total) : success.toLocaleString('th-TH')}</strong></div></section>`;
}
function renderControls(items) {
  const statuses = [...new Set(items.map(itemStatus).filter(Boolean))].filter(status => pageView !== 'payments' || status !== 'ยังไม่ชำระ').slice(0, 9);
  const branches = ['orders', 'payments'].includes(pageView) ? [...new Set(items.map(item => item.branchName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th')) : [];
  return `<section class="admin-tools" aria-label="ค้นหาและกรองข้อมูล"><label class="admin-search"><span aria-hidden="true">⌕</span><span class="sr-only">ค้นหา</span><input id="admin-search" type="search" placeholder="${esc(pageCopy[pageView].search)}" value="${esc(searchTerm)}" autocomplete="off"></label><button class="admin-refresh" id="admin-refresh" type="button" aria-label="โหลดข้อมูลใหม่">↻ <span>รีเฟรช</span></button>${branches.length ? `<label class="admin-select"><span>สาขา</span><select id="admin-branch"><option value="all">ทุกสาขา</option>${branches.map(branch => `<option value="${esc(branch)}" ${activeBranch === branch ? 'selected' : ''}>${esc(branch)}</option>`).join('')}</select></label>` : ''}<div class="admin-filters" id="admin-filters"><button class="${activeStatus === 'all' ? 'is-active' : ''}" data-status="all" type="button">ทั้งหมด</button>${pageView === 'payments' ? `<button class="${activeStatus === '__unpaid__' ? 'is-active' : ''}" data-status="__unpaid__" type="button">ยังไม่ชำระ</button>` : ''}${statuses.map(status => `<button class="${activeStatus === status ? 'is-active' : ''}" data-status="${esc(status)}" type="button">${esc(statusLabel(status))}</button>`).join('')}</div></section>`;
}
function productEditor(item) {
  const audience = String(item.customerType || 'all').toLowerCase() === 'branch_only' ? 'branch_only' : 'all';
  const status = normalizeProductStatus(item.status);
  const preview = item.imageUrl ? `<img class="admin-product-preview" src="${esc(item.imageUrl)}" alt="รูป ${esc(item.name)}">` : '<div class="admin-product-preview admin-product-preview--empty">ยังไม่มีรูป</div>';
  return `<form class="admin-edit-form admin-edit-form--product" data-product-id="${esc(item.productId)}" hidden>
    <label class="admin-image-field">รูปสินค้า<div class="admin-product-image-picker">${preview}<div><input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp"><small>รองรับ JPG, PNG, WebP ไม่เกิน 8 MB ระบบจะย่อรูปก่อนอัปโหลด</small></div></div></label>
    <input name="existingImageUrl" type="hidden" value="${esc(item.imageUrl || '')}">
    <input name="existingImageFileId" type="hidden" value="${esc(item.imageFileId || '')}">
    <label>ราคา<input name="price" type="number" min="0" step="0.01" value="${esc(item.price)}" required></label>
    <label>หน่วย<input name="unit" value="${esc(item.unit)}" required></label>
    <label>กลุ่มที่มองเห็น<select name="customerType"><option value="all" ${audience === 'all' ? 'selected' : ''}>ทุกคน — สาขาและลูกค้าทั่วไป</option><option value="branch_only" ${audience === 'branch_only' ? 'selected' : ''}>เฉพาะสาขา</option></select></label>
    <label>สถานะ<select name="status">${productStatuses.map(option => `<option ${option === status ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
    <div class="admin-form-actions"><button type="button" data-cancel>ยกเลิก</button><button type="submit">บันทึกสินค้า</button></div><p class="admin-form-message" aria-live="polite"></p>
  </form>`;
}
function userEditor(item) {
  return `<form class="admin-edit-form admin-edit-form--member" data-user-id="${esc(item.lineUid)}" hidden>
    <label>Role<select name="role">${roles.map(role => `<option ${role === String(item.role).toLowerCase() ? 'selected' : ''}>${role}</option>`).join('')}</select></label>
    <label>หมายเหตุเกี่ยวกับสมาชิก<textarea name="note" maxlength="1000" rows="3" placeholder="ข้อมูลสำหรับผู้ดูแลเท่านั้น">${esc(item.note || '')}</textarea></label>
    <label>ส่งข้อความถึงสมาชิกคนนี้<textarea name="directMessage" maxlength="2000" rows="3" placeholder="พิมพ์ข้อความ LINE"></textarea></label>
    <div class="admin-form-actions admin-form-actions--member">
      <button type="button" data-cancel>ยกเลิก</button>
      <button type="submit" data-action="note">บันทึกหมายเหตุ</button>
      <button type="submit" data-action="role">บันทึก Role + เปลี่ยน Rich Menu</button>
      <button type="submit" data-action="message">ส่งข้อความ</button>
    </div>
    <p class="admin-form-message" aria-live="polite"></p>
  </form>`;
}
function renderer(item) {
  if (pageView === 'orders') return record(item.orderId, dateTime(item.timestamp), item.status, [field('สาขา', item.branchName), field('ยอดรวม', money(item.totalAmount)), field('สถานะชำระเงิน', statusLabel(item.paymentStatus || 'ยังไม่ชำระ')), field('LINE UID', item.lineUid, 'admin-field-value--uid')], `${orderApprovalAction(item)}${linkActions([{ label: 'เปิดใบสั่งซื้อ', url: item.poUrl }, { label: 'ดูหลักฐาน', url: item.paymentProofUrl }])}`);
  if (pageView === 'payments') return record(item.orderId, `สั่งซื้อ ${orderAge(item.timestamp)} · ${dateTime(item.timestamp)}`, item.paymentStatus || 'ยังไม่ชำระ', [field('สาขา', item.branchName), field('ยอดชำระ', money(item.totalAmount)), field('ส่งหลักฐาน', dateTime(item.submittedAt)), field('สถานะ Order', statusLabel(item.status))], linkActions([{ label: 'ดูหลักฐานชำระเงิน', url: item.proofUrl }]));
  if (pageView === 'products') { const audienceLabel = String(item.customerType).toLowerCase() === 'branch_only' ? 'เฉพาะสาขา' : 'ทุกคน'; return record(item.name, item.productId, item.status, [field('หน่วย', item.unit), field('ราคา', money(item.price)), field('กลุ่มที่มองเห็น', audienceLabel), field('รูปสินค้า', item.imageUrl ? 'อัปโหลดแล้ว' : 'ยังไม่มีรูป')], `<button class="admin-edit-toggle" type="button">แก้ไขวัตถุดิบ</button>`, productEditor(item)); }
  return record(item.displayName, item.lineUid, item.friendStatus, [field('Role', item.role), field('หมายเหตุ', item.note || '—'), field('อัปเดตล่าสุด', dateTime(item.updatedAt)), field('LINE UID', item.lineUid, 'admin-field-value--uid')], `<button class="admin-edit-toggle" type="button">จัดการสมาชิก</button>`, userEditor(item));
}
function bindProductImagePreviews() {
  document.querySelectorAll('.admin-edit-form--product input[type="file"]').forEach(input => input.addEventListener('change', () => {
    const file = input.files?.[0]; if (!file) return;
    const preview = input.closest('.admin-product-image-picker').querySelector('.admin-product-preview');
    if (preview.tagName !== 'IMG') { const image = document.createElement('img'); image.className = 'admin-product-preview'; image.alt = 'ตัวอย่างรูปสินค้า'; preview.replaceWith(image); image.src = URL.createObjectURL(file); }
    else preview.src = URL.createObjectURL(file);
  }));
}
function bindEditors() {
  document.querySelectorAll('.admin-edit-toggle').forEach(button => button.addEventListener('click', () => { const form = button.closest('.admin-record').querySelector('.admin-edit-form'); form.hidden = !form.hidden; if (!form.hidden) form.querySelector('input,select,textarea')?.focus(); }));
  document.querySelectorAll('[data-cancel]').forEach(button => button.addEventListener('click', () => { button.closest('form').hidden = true; }));
  document.querySelectorAll('.admin-edit-form').forEach(form => form.addEventListener('submit', saveEdit)); bindProductImagePreviews();
}
async function postAdmin(pathName, payload) {
  const response = await fetch(`${ADMIN_API_BASE}/webhook/${pathName}`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || `ดำเนินการไม่สำเร็จ (${response.status})`);
  return data;
}
async function compressProductImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('รองรับเฉพาะ JPG, PNG หรือ WebP');
  if (file.size > 8 * 1024 * 1024) throw new Error('ไฟล์ต้นฉบับต้องไม่เกิน 8 MB');
  const bitmap = await createImageBitmap(file);
  const maxSide = 1200; const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.82);
}
async function saveEdit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = event.submitter || form.querySelector('[type="submit"]');
  const action = submit.dataset.action || (form.dataset.productId ? 'product' : 'role');
  const message = form.querySelector('.admin-form-message');
  const data = Object.fromEntries(new FormData(form));
  let endpoint;
  let payload;
  if (form.dataset.productId) {
    let imageDataUrl = '';
    try { const file = form.elements.imageFile.files?.[0]; if (file) imageDataUrl = await compressProductImage(file); }
    catch (error) { message.textContent = error.message || 'ไม่สามารถเตรียมรูปได้'; return; }
    endpoint = 'admin-product-update'; payload = { productId: form.dataset.productId, unit: data.unit, price: Number(data.price), status: data.status, customerType: data.customerType, existingImageUrl: data.existingImageUrl || '', existingImageFileId: data.existingImageFileId || '', imageDataUrl };
  }
  else if (action === 'note') { endpoint = 'admin-user-note-update'; payload = { lineUid: form.dataset.userId, note: data.note || '' }; }
  else if (action === 'message') {
    const text = String(data.directMessage || '').trim();
    if (!text) { message.textContent = 'กรุณาพิมพ์ข้อความก่อนส่ง'; return; }
    if (!window.confirm('ยืนยันส่งข้อความ LINE ถึงสมาชิกคนนี้?')) return;
    endpoint = 'admin-user-message'; payload = { targetType: 'individual', lineUid: form.dataset.userId, message: text };
  } else {
    if (!window.confirm(`ยืนยันเปลี่ยน Role เป็น ${data.role}? Rich Menu จะเปลี่ยนทันที`)) return;
    endpoint = 'admin-user-role-update'; payload = { lineUid: form.dataset.userId, role: data.role };
  }
  submit.disabled = true; message.textContent = action === 'message' ? 'กำลังส่งข้อความ…' : 'กำลังบันทึก…';
  try {
    const result = await postAdmin(endpoint, payload);
    message.textContent = action === 'message' ? `ส่งข้อความเรียบร้อย ${result.successCount || 1} คน` : result.message || 'บันทึกเรียบร้อย';
    if (action !== 'message') await loadPage(); else { form.elements.directMessage.value = ''; submit.disabled = false; }
  } catch (error) { message.textContent = error.message || 'กรุณาลองใหม่'; submit.disabled = false; }
}
function renderMemberMessenger() {
  const groupOptions = roles.map(role => `<label><input type="checkbox" name="roles" value="${role}"><span>${role}</span></label>`).join('');
  return `<section class="admin-member-message"><div><h2>ส่งข้อความถึงกลุ่มสมาชิก</h2><p>ระบบส่งเฉพาะสมาชิกที่ยังเป็นเพื่อนกับ LINE Official Account</p></div><form id="member-group-message"><fieldset><legend>เลือกกลุ่มผู้รับ</legend><div class="admin-role-options">${groupOptions}</div></fieldset><label>ข้อความ<textarea name="message" maxlength="2000" rows="4" placeholder="พิมพ์ข้อความที่ต้องการส่ง" required></textarea></label><div class="admin-message-footer"><span id="member-recipient-count">เลือกกลุ่มเพื่อดูจำนวนผู้รับ</span><button type="submit">ตรวจสอบและส่ง</button></div><p class="admin-form-message" aria-live="polite"></p></form></section>`;
}
function selectedMemberRoles(form) { return [...form.querySelectorAll('input[name="roles"]:checked')].map(input => input.value); }
function countActiveRecipients(selectedRoles) { return allItems.filter(item => selectedRoles.includes(String(item.role || 'customer').toLowerCase()) && String(item.friendStatus || '').toLowerCase() === 'active').length; }
function bindMemberMessenger() {
  const form = document.querySelector('#member-group-message'); if (!form) return;
  const count = form.querySelector('#member-recipient-count');
  const refreshCount = () => { const rolesToSend = selectedMemberRoles(form); const total = countActiveRecipients(rolesToSend); count.textContent = rolesToSend.length ? `ผู้รับที่พร้อมรับข้อความ ${total.toLocaleString('th-TH')} คน` : 'เลือกกลุ่มเพื่อดูจำนวนผู้รับ'; };
  form.querySelectorAll('input[name="roles"]').forEach(input => input.addEventListener('change', refreshCount));
  form.addEventListener('submit', async event => {
    event.preventDefault(); const rolesToSend = selectedMemberRoles(form); const text = String(new FormData(form).get('message') || '').trim(); const total = countActiveRecipients(rolesToSend); const status = form.querySelector('.admin-form-message'); const submit = form.querySelector('[type="submit"]');
    if (!rolesToSend.length) { status.textContent = 'กรุณาเลือกอย่างน้อย 1 กลุ่ม'; return; }
    if (!text) { status.textContent = 'กรุณาพิมพ์ข้อความ'; return; }
    if (!total) { status.textContent = 'ไม่พบสมาชิก Active ในกลุ่มที่เลือก'; return; }
    if (!window.confirm(`ยืนยันส่งข้อความถึง ${total.toLocaleString('th-TH')} คน ในกลุ่ม ${rolesToSend.join(', ')}?`)) return;
    submit.disabled = true; status.textContent = 'กำลังส่งข้อความ…';
    try { const result = await postAdmin('admin-user-message', { targetType: 'roles', roles: rolesToSend, message: text }); status.textContent = `ส่งสำเร็จ ${result.successCount || 0} คน${result.failedCount ? ` · ไม่สำเร็จ ${result.failedCount} คน` : ''}`; form.elements.message.value = ''; }
    catch (error) { status.textContent = error.message || 'ส่งข้อความไม่สำเร็จ'; }
    finally { submit.disabled = false; }
  });
}
function renderList() {
  const copy = pageCopy[pageView]; const content = document.querySelector('#page-content');
  if (!allItems.length) return setState('empty', 'ไม่พบข้อมูลในขณะนี้', 'เมื่อมีรายการ ระบบจะแสดงผลในหน้านี้');
  const visible = allItems.filter(item => (activeStatus === 'all' || (activeStatus === '__unpaid__' ? isUnpaid(item) : itemStatus(item) === activeStatus)) && (activeBranch === 'all' || item.branchName === activeBranch) && (!searchTerm || itemSearchText(item).includes(searchTerm)));
  content.innerHTML = `${renderSummary(allItems)}${renderControls(allItems)}${pageView === 'users' ? renderMemberMessenger() : ''}<section class="admin-card"><div class="admin-card-head"><div><h2 class="admin-card-title">${copy.heading}</h2><p class="admin-card-caption">อัปเดตล่าสุด ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p></div><span class="admin-count">${visible.length} รายการ</span></div><div class="admin-list">${visible.length ? visible.map(renderer).join('') : '<div class="admin-inline-empty"><strong>ไม่พบรายการที่ตรงกัน</strong><span>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</span></div>'}</div></section>`;
  document.querySelector('#admin-search').addEventListener('input', event => { searchTerm = event.target.value.trim().toLocaleLowerCase('th'); renderList(); requestAnimationFrame(() => { const input = document.querySelector('#admin-search'); input.focus(); input.setSelectionRange(input.value.length, input.value.length); }); });
  document.querySelector('#admin-refresh').addEventListener('click', loadPage);
  document.querySelector('#admin-branch')?.addEventListener('change', event => { activeBranch = event.target.value; renderList(); });
  document.querySelectorAll('#admin-filters button').forEach(button => button.addEventListener('click', () => { activeStatus = button.dataset.status; renderList(); })); bindEditors(); bindMemberMessenger();
}
function renderData(data) { allItems = data[pageView] || []; renderList(); }
async function requestData() { const response = await fetch(`${ADMIN_API_BASE}/webhook/${pageCopy[pageView].endpoint}`, { headers: authHeaders() }); if (!response.ok) throw new Error(`ไม่สามารถโหลดข้อมูลได้ (${response.status})`); return response.json(); }
async function loadPage() { setState('loading', 'กำลังโหลดข้อมูล…', 'โปรดรอสักครู่'); try { renderData(await requestData()); } catch (error) { setState('error', 'ไม่สามารถโหลดข้อมูลได้', error.message || 'กรุณาลองใหม่อีกครั้ง', true); } }
async function init() {
  const copy = pageCopy[pageView]; if (!copy) return setState('error', 'ไม่พบหน้าที่ต้องการ', 'กรุณากลับไปหน้า Admin');
  document.querySelector('#page-title').textContent = copy.title; document.querySelector('#page-subtitle').textContent = copy.subtitle;
  document.querySelector('.admin-hero').insertAdjacentHTML('beforeend', `<nav class="admin-tabs" aria-label="หน้าผู้ดูแล">${Object.entries(pageLinks).map(([view, href]) => `<a class="${view === pageView ? 'is-active' : ''}" href="${href}" ${view === pageView ? 'aria-current="page"' : ''}>${pageLabels[view]}</a>`).join('')}</nav>`);
  try {
    if (!window.liff) throw new Error('ไม่พบ LINE LIFF SDK');
    await liff.init({ liffId: ADMIN_LIFF_ID });
    if (!liff.isLoggedIn()) { liff.login({ redirectUri: location.href }); return; }
    adminIdToken = liff.getIDToken() || '';
    if (!adminIdToken) throw new Error('ไม่สามารถรับ LINE ID token ได้ กรุณาเปิดหน้าใหม่จาก LINE');
    adminProfile = await liff.getProfile();
    const currentUrl = new URL(location.href);
    if (currentUrl.searchParams.has('uid')) {
      currentUrl.searchParams.delete('uid');
      history.replaceState(null, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    }
    document.querySelector('#admin-context').innerHTML = `<span class="admin-context-dot" aria-hidden="true"></span><strong>เชื่อมต่อในฐานะ ${esc(adminProfile.displayName || 'ผู้ดูแล')}</strong>`;
    await loadPage();
  } catch (error) { document.querySelector('#admin-context').textContent = 'ไม่สามารถยืนยันสิทธิ์ผู้ดูแลได้'; setState('error', 'ไม่สามารถเปิดหน้าผู้ดูแลได้', error.message || 'กรุณาลองใหม่อีกครั้ง', true); }
}
init();
