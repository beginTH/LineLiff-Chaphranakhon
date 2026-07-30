const ADMIN_API_BASE = 'https://n8n.n8n-kokujapan.org';
const ADMIN_LIFF_ID = '2010570929-BJxo68XQ';
const pageView = document.body.dataset.view;
let adminUid = new URLSearchParams(location.search).get('uid') || '';
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
const roles = ['customer', 'branch', 'owner', 'admin', 'superadmin'];
const productStatuses = ['active', 'inactive', 'cancelled'];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const money = value => `฿${Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateTime = value => { const parsed = new Date(value); return !value || Number.isNaN(parsed.getTime()) ? (value ? String(value).replace('T', ' ').replace('.000Z', '') : '—') : parsed.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }); };
const orderAge = value => { const then = new Date(value); if (Number.isNaN(then.getTime())) return 'ไม่ทราบเวลา'; const minutes = Math.max(0, Math.floor((Date.now() - then.getTime()) / 60000)); if (minutes < 60) return `${minutes} นาทีที่แล้ว`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`; return `${Math.floor(hours / 24)} วันที่แล้ว`; };
const statusClass = value => /approved|verified|paid|\bactive\b|\bavailable\b|พร้อม|สำเร็จ|success/i.test(String(value)) ? 'admin-badge--success' : /pending|รอ|submit|review|ยังไม่ชำระ/i.test(String(value)) ? 'admin-badge--warn' : /reject|cancel|inactive|unavailable|ระงับ|ยกเลิก/i.test(String(value)) ? 'admin-badge--danger' : 'admin-badge--neutral';

function setState(kind, title, detail = '', retry = false) {
  const content = document.querySelector('#page-content');
  content.innerHTML = `<div class="admin-state ${kind === 'error' ? 'admin-state--error' : ''}">${kind === 'loading' ? '<div class="admin-spinner" aria-hidden="true"></div>' : ''}<strong>${esc(title)}</strong>${detail ? `<span>${esc(detail)}</span>` : ''}${retry ? '<button class="admin-retry" type="button">ลองใหม่</button>' : ''}</div>`;
  content.querySelector('.admin-retry')?.addEventListener('click', loadPage);
}
function field(label, value, extraClass = '') { return `<div><div class="admin-field-label">${esc(label)}</div><div class="admin-field-value ${extraClass}">${esc(value || '—')}</div></div>`; }
function safeUrl(value) { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
function linkActions(actions = []) { return actions.filter(action => safeUrl(action.url)).map(action => `<a class="admin-record-link" href="${esc(safeUrl(action.url))}" target="_blank" rel="noopener noreferrer">${esc(action.label)} <span aria-hidden="true">↗</span></a>`).join(''); }
function record(title, meta, badge, fields, actions = '', edit = '') { return `<article class="admin-record"><div class="admin-record-top"><div><div class="admin-record-title">${esc(title || '—')}</div>${meta ? `<div class="admin-record-meta">${esc(meta)}</div>` : ''}</div>${badge ? `<span class="admin-badge ${statusClass(badge)}">${esc(badge)}</span>` : ''}</div><div class="admin-fields">${fields.join('')}</div>${actions ? `<div class="admin-record-actions">${actions}</div>` : ''}${edit}</article>`; }
function isUnpaid(item) { const status = String(item.paymentStatus || '').trim().toLowerCase(); return !status || /^(unpaid|not paid|pending payment|pending_payment|ยังไม่ชำระ|รอชำระ|รอการชำระเงิน|-)$/.test(status); }
function itemStatus(item) { if (pageView === 'payments') return isUnpaid(item) ? 'ยังไม่ชำระ' : item.paymentStatus; return String(pageView === 'products' ? item.status : pageView === 'users' ? (item.role || item.friendStatus) : (item.paymentStatus || item.status) || 'ไม่ระบุ'); }
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
  return `<section class="admin-tools" aria-label="ค้นหาและกรองข้อมูล"><label class="admin-search"><span aria-hidden="true">⌕</span><span class="sr-only">ค้นหา</span><input id="admin-search" type="search" placeholder="${esc(pageCopy[pageView].search)}" value="${esc(searchTerm)}" autocomplete="off"></label><button class="admin-refresh" id="admin-refresh" type="button" aria-label="โหลดข้อมูลใหม่">↻ <span>รีเฟรช</span></button>${branches.length ? `<label class="admin-select"><span>สาขา</span><select id="admin-branch"><option value="all">ทุกสาขา</option>${branches.map(branch => `<option value="${esc(branch)}" ${activeBranch === branch ? 'selected' : ''}>${esc(branch)}</option>`).join('')}</select></label>` : ''}<div class="admin-filters" id="admin-filters"><button class="${activeStatus === 'all' ? 'is-active' : ''}" data-status="all" type="button">ทั้งหมด</button>${pageView === 'payments' ? `<button class="${activeStatus === '__unpaid__' ? 'is-active' : ''}" data-status="__unpaid__" type="button">ยังไม่ชำระ</button>` : ''}${statuses.map(status => `<button class="${activeStatus === status ? 'is-active' : ''}" data-status="${esc(status)}" type="button">${esc(status)}</button>`).join('')}</div></section>`;
}
function productEditor(item) { return `<form class="admin-edit-form" data-product-id="${esc(item.productId)}" hidden><label>URL รูป<input name="imageUrl" type="url" value="${esc(item.imageUrl)}" placeholder="https://..."></label><label>ราคา<input name="price" type="number" min="0" step="0.01" value="${esc(item.price)}" required></label><label>หน่วย<input name="unit" value="${esc(item.unit)}" required></label><label>ประเภทผู้ซื้อ<input name="customerType" value="${esc(item.customerType)}" placeholder="เช่น branch"></label><label>สถานะ<select name="status">${productStatuses.map(status => `<option ${status === String(item.status).toLowerCase() ? 'selected' : ''}>${status}</option>`).join('')}</select></label><div class="admin-form-actions"><button type="button" data-cancel>ยกเลิก</button><button type="submit">บันทึก</button></div><p class="admin-form-message" aria-live="polite"></p></form>`; }
function userEditor(item) { return `<form class="admin-edit-form admin-edit-form--role" data-user-id="${esc(item.lineUid)}" hidden><label>Role<select name="role">${roles.map(role => `<option ${role === String(item.role).toLowerCase() ? 'selected' : ''}>${role}</option>`).join('')}</select></label><div class="admin-form-actions"><button type="button" data-cancel>ยกเลิก</button><button type="submit">บันทึก Role</button></div><p class="admin-form-message" aria-live="polite"></p></form>`; }
function renderer(item) {
  if (pageView === 'orders') return record(item.orderId, dateTime(item.timestamp), item.status, [field('สาขา', item.branchName), field('ยอดรวม', money(item.totalAmount)), field('สถานะชำระเงิน', item.paymentStatus || 'ยังไม่ชำระ'), field('LINE UID', item.lineUid, 'admin-field-value--uid')], linkActions([{ label: 'เปิดใบสั่งซื้อ', url: item.poUrl }, { label: 'ดูหลักฐาน', url: item.paymentProofUrl }]));
  if (pageView === 'payments') return record(item.orderId, `สั่งซื้อ ${orderAge(item.timestamp)} · ${dateTime(item.timestamp)}`, item.paymentStatus || 'ยังไม่ชำระ', [field('สาขา', item.branchName), field('ยอดชำระ', money(item.totalAmount)), field('ส่งหลักฐาน', dateTime(item.submittedAt)), field('สถานะ Order', item.status)], linkActions([{ label: 'ดูหลักฐานชำระเงิน', url: item.proofUrl }]));
  if (pageView === 'products') return record(item.name, item.productId, item.status, [field('หน่วย', item.unit), field('ราคา', money(item.price)), field('ประเภทผู้ซื้อ', item.customerType), field('รูปสินค้า', item.imageUrl ? 'มีรูปแล้ว' : 'ยังไม่มีรูป')], `<button class="admin-edit-toggle" type="button">แก้ไขวัตถุดิบ</button>`, productEditor(item));
  return record(item.displayName, item.lineUid, item.friendStatus, [field('Role', item.role), field('อัปเดตล่าสุด', dateTime(item.updatedAt)), field('LINE UID', item.lineUid, 'admin-field-value--uid')], `<button class="admin-edit-toggle" type="button">แก้ไข Role</button>`, userEditor(item));
}
function bindEditors() {
  document.querySelectorAll('.admin-edit-toggle').forEach(button => button.addEventListener('click', () => { const form = button.closest('.admin-record').querySelector('.admin-edit-form'); form.hidden = !form.hidden; if (!form.hidden) form.querySelector('input,select')?.focus(); }));
  document.querySelectorAll('[data-cancel]').forEach(button => button.addEventListener('click', () => { button.closest('form').hidden = true; }));
  document.querySelectorAll('.admin-edit-form').forEach(form => form.addEventListener('submit', saveEdit));
}
async function saveEdit(event) {
  event.preventDefault(); const form = event.currentTarget; const submit = form.querySelector('[type="submit"]'); const message = form.querySelector('.admin-form-message'); submit.disabled = true; message.textContent = 'กำลังบันทึก…';
  const data = Object.fromEntries(new FormData(form)); const isProduct = form.dataset.productId; const payload = isProduct ? { uid: adminUid, productId: isProduct, ...data, price: Number(data.price) } : { uid: adminUid, lineUid: form.dataset.userId, role: data.role };
  try { const response = await fetch(`${ADMIN_API_BASE}/webhook/${isProduct ? 'admin-product-update' : 'admin-user-role-update'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(`บันทึกไม่สำเร็จ (${response.status})`); message.textContent = 'บันทึกเรียบร้อย'; await loadPage(); } catch (error) { message.textContent = error.message || 'กรุณาลองใหม่'; submit.disabled = false; }
}
function renderList() {
  const copy = pageCopy[pageView]; const content = document.querySelector('#page-content');
  if (!allItems.length) return setState('empty', 'ไม่พบข้อมูลในขณะนี้', 'เมื่อมีรายการ ระบบจะแสดงผลในหน้านี้');
  const visible = allItems.filter(item => (activeStatus === 'all' || (activeStatus === '__unpaid__' ? isUnpaid(item) : itemStatus(item) === activeStatus)) && (activeBranch === 'all' || item.branchName === activeBranch) && (!searchTerm || itemSearchText(item).includes(searchTerm)));
  content.innerHTML = `${renderSummary(allItems)}${renderControls(allItems)}<section class="admin-card"><div class="admin-card-head"><div><h2 class="admin-card-title">${copy.heading}</h2><p class="admin-card-caption">อัปเดตล่าสุด ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p></div><span class="admin-count">${visible.length} รายการ</span></div><div class="admin-list">${visible.length ? visible.map(renderer).join('') : '<div class="admin-inline-empty"><strong>ไม่พบรายการที่ตรงกัน</strong><span>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</span></div>'}</div></section>`;
  document.querySelector('#admin-search').addEventListener('input', event => { searchTerm = event.target.value.trim().toLocaleLowerCase('th'); renderList(); requestAnimationFrame(() => { const input = document.querySelector('#admin-search'); input.focus(); input.setSelectionRange(input.value.length, input.value.length); }); });
  document.querySelector('#admin-refresh').addEventListener('click', loadPage);
  document.querySelector('#admin-branch')?.addEventListener('change', event => { activeBranch = event.target.value; renderList(); });
  document.querySelectorAll('#admin-filters button').forEach(button => button.addEventListener('click', () => { activeStatus = button.dataset.status; renderList(); })); bindEditors();
}
function renderData(data) { allItems = data[pageView] || []; renderList(); }
async function requestData() { const response = await fetch(`${ADMIN_API_BASE}/webhook/${pageCopy[pageView].endpoint}?uid=${encodeURIComponent(adminUid)}`); if (!response.ok) throw new Error(`ไม่สามารถโหลดข้อมูลได้ (${response.status})`); return response.json(); }
async function loadPage() { setState('loading', 'กำลังโหลดข้อมูล…', 'โปรดรอสักครู่'); try { renderData(await requestData()); } catch (error) { setState('error', 'ไม่สามารถโหลดข้อมูลได้', error.message || 'กรุณาลองใหม่อีกครั้ง', true); } }
async function init() {
  const copy = pageCopy[pageView]; if (!copy) return setState('error', 'ไม่พบหน้าที่ต้องการ', 'กรุณากลับไปหน้า Admin');
  document.querySelector('#page-title').textContent = copy.title; document.querySelector('#page-subtitle').textContent = copy.subtitle;
  document.querySelector('.admin-hero').insertAdjacentHTML('beforeend', `<nav class="admin-tabs" aria-label="หน้าผู้ดูแล">${Object.entries(pageLinks).map(([view, href]) => `<a class="${view === pageView ? 'is-active' : ''}" href="${href}" ${view === pageView ? 'aria-current="page"' : ''}>${pageLabels[view]}</a>`).join('')}</nav>`);
  try { if (!adminUid && window.liff) { await liff.init({ liffId: ADMIN_LIFF_ID }); if (liff.isLoggedIn()) adminUid = (await liff.getProfile()).userId; } document.querySelector('#admin-context').innerHTML = adminUid ? '<span class="admin-context-dot" aria-hidden="true"></span><strong>เชื่อมต่อในฐานะผู้ดูแลแล้ว</strong>' : 'กรุณาเปิดผ่าน LINE LIFF เพื่อยืนยันสิทธิ์'; if (adminUid) document.querySelectorAll('.admin-tabs a').forEach(link => { const url = new URL(link.href); url.searchParams.set('uid', adminUid); link.href = url.href; }); await loadPage(); } catch (error) { document.querySelector('#admin-context').textContent = 'ไม่สามารถยืนยันสิทธิ์ผู้ดูแลได้'; setState('error', 'ไม่สามารถเปิดหน้าผู้ดูแลได้', error.message || 'กรุณาลองใหม่อีกครั้ง', true); }
}
init();
