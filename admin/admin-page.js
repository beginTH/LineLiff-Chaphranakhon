const ADMIN_API_BASE = 'https://n8n.n8n-kokujapan.org';
const ADMIN_LIFF_ID = '2010570929-BJxo68XQ';
const pageView = document.body.dataset.view;
let adminUid = new URLSearchParams(location.search).get('uid') || '';
let allItems = [];
let activeStatus = 'all';
let searchTerm = '';

const pageCopy = {
  orders: { title: 'ประวัติ Order', subtitle: 'ติดตามคำสั่งซื้อและสถานะล่าสุด', heading: 'รายการ Order', endpoint: 'admin-orders', search: 'ค้นหาเลขที่ Order หรือ LINE UID' },
  payments: { title: 'รายการชำระเงิน', subtitle: 'ตรวจสอบสถานะและหลักฐานการชำระเงิน', heading: 'รายการชำระเงิน', endpoint: 'admin-payments', search: 'ค้นหาเลขที่ Order หรือ LINE UID' },
  products: { title: 'จัดการวัตถุดิบ', subtitle: 'ตรวจสอบรายการ ราคา และสถานะวัตถุดิบ', heading: 'รายการวัตถุดิบ', endpoint: 'admin-products', search: 'ค้นหารหัส ชื่อ หรือประเภทสินค้า' },
  users: { title: 'จัดการสมาชิก', subtitle: 'ตรวจสอบข้อมูลสมาชิกและสิทธิ์การใช้งาน', heading: 'สมาชิกในระบบ', endpoint: 'admin-users', search: 'ค้นหาชื่อ LINE UID หรือ Role' },
};
const pageLinks = { orders: 'orders.html', payments: 'payments.html', products: 'inventory.html', users: 'members.html' };
const pageLabels = { orders: 'Order', payments: 'ชำระเงิน', products: 'วัตถุดิบ', users: 'สมาชิก' };
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const money = value => `฿${Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateTime = value => { const parsed = new Date(value); return !value || Number.isNaN(parsed.getTime()) ? (value ? String(value).replace('T', ' ').replace('.000Z', '') : '—') : parsed.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }); };
const statusClass = value => /approved|verified|paid|\bactive\b|\bavailable\b|พร้อม|สำเร็จ|success/i.test(String(value)) ? 'admin-badge--success' : /pending|รอ|submit|review/i.test(String(value)) ? 'admin-badge--warn' : /reject|cancel|inactive|unavailable|ระงับ|ยกเลิก/i.test(String(value)) ? 'admin-badge--danger' : 'admin-badge--neutral';

function setState(kind, title, detail = '', retry = false) {
  const content = document.querySelector('#page-content');
  content.innerHTML = `<div class="admin-state ${kind === 'error' ? 'admin-state--error' : ''}">${kind === 'loading' ? '<div class="admin-spinner" aria-hidden="true"></div>' : ''}<strong>${esc(title)}</strong>${detail ? `<span>${esc(detail)}</span>` : ''}${retry ? '<button class="admin-retry" type="button">ลองใหม่</button>' : ''}</div>`;
  content.querySelector('.admin-retry')?.addEventListener('click', loadPage);
}
function field(label, value, extraClass = '') { return `<div><div class="admin-field-label">${esc(label)}</div><div class="admin-field-value ${extraClass}">${esc(value || '—')}</div></div>`; }
function safeUrl(value) { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
function record(title, meta, badge, fields, actions = []) {
  const buttons = actions.filter(action => safeUrl(action.url)).map(action => `<a class="admin-record-link" href="${esc(safeUrl(action.url))}" target="_blank" rel="noopener noreferrer">${esc(action.label)} <span aria-hidden="true">↗</span></a>`).join('');
  return `<article class="admin-record"><div class="admin-record-top"><div><div class="admin-record-title">${esc(title || '—')}</div>${meta ? `<div class="admin-record-meta">${esc(meta)}</div>` : ''}</div>${badge ? `<span class="admin-badge ${statusClass(badge)}">${esc(badge)}</span>` : ''}</div><div class="admin-fields">${fields.join('')}</div>${buttons ? `<div class="admin-record-actions">${buttons}</div>` : ''}</article>`;
}
function itemStatus(item) { return String(pageView === 'products' ? item.status : pageView === 'users' ? (item.role || item.friendStatus) : (item.paymentStatus || item.status) || 'ไม่ระบุ'); }
function itemSearchText(item) { return Object.values(item).filter(value => typeof value !== 'object').join(' ').toLocaleLowerCase('th'); }
function renderSummary(items) {
  const success = items.filter(item => /approved|verified|paid|\bactive\b|\bavailable\b|พร้อม|สำเร็จ|success/i.test(itemStatus(item))).length;
  const pending = items.filter(item => /pending|รอ|submit|review/i.test(itemStatus(item))).length;
  const total = ['orders', 'payments'].includes(pageView) ? items.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0) : null;
  const label = total !== null ? 'มูลค่ารวม' : (pageView === 'products' ? 'พร้อมใช้งาน' : 'Active / Admin');
  return `<section class="admin-summary" aria-label="สรุปข้อมูล"><div class="admin-summary-item"><span>ทั้งหมด</span><strong>${items.length.toLocaleString('th-TH')}</strong></div><div class="admin-summary-item"><span>รอดำเนินการ</span><strong>${pending.toLocaleString('th-TH')}</strong></div><div class="admin-summary-item"><span>${label}</span><strong>${total !== null ? money(total) : success.toLocaleString('th-TH')}</strong></div></section>`;
}
function renderControls(items) {
  const statuses = [...new Set(items.map(itemStatus).filter(Boolean))].slice(0, 8);
  return `<section class="admin-tools" aria-label="ค้นหาและกรองข้อมูล"><label class="admin-search"><span aria-hidden="true">⌕</span><span class="sr-only">ค้นหา</span><input id="admin-search" type="search" placeholder="${esc(pageCopy[pageView].search)}" value="${esc(searchTerm)}" autocomplete="off"></label><button class="admin-refresh" id="admin-refresh" type="button" aria-label="โหลดข้อมูลใหม่">↻ <span>รีเฟรช</span></button><div class="admin-filters" id="admin-filters"><button class="${activeStatus === 'all' ? 'is-active' : ''}" data-status="all" type="button">ทั้งหมด</button>${statuses.map(status => `<button class="${activeStatus === status ? 'is-active' : ''}" data-status="${esc(status)}" type="button">${esc(status)}</button>`).join('')}</div></section>`;
}
function renderer(item) {
  if (pageView === 'orders') return record(item.orderId, dateTime(item.timestamp), item.status, [field('ยอดรวม', money(item.totalAmount)), field('สถานะชำระเงิน', item.paymentStatus), field('LINE UID', item.lineUid, 'admin-field-value--uid')], [{ label: 'เปิดใบสั่งซื้อ', url: item.poUrl }, { label: 'ดูหลักฐาน', url: item.paymentProofUrl }]);
  if (pageView === 'payments') return record(item.orderId, `ส่งหลักฐาน ${dateTime(item.submittedAt)}`, item.paymentStatus, [field('ยอดชำระ', money(item.totalAmount)), field('สถานะ Order', item.status), field('LINE UID', item.lineUid, 'admin-field-value--uid')], [{ label: 'ดูหลักฐานชำระเงิน', url: item.proofUrl }]);
  if (pageView === 'products') return record(item.name, item.productId, item.status, [field('หน่วย', item.unit), field('ราคา', money(item.price)), field('ประเภทลูกค้า', item.customerType)]);
  return record(item.displayName, item.lineUid, item.friendStatus, [field('Role', item.role), field('อัปเดตล่าสุด', dateTime(item.updatedAt)), field('LINE UID', item.lineUid, 'admin-field-value--uid')]);
}
function renderList() {
  const copy = pageCopy[pageView];
  const content = document.querySelector('#page-content');
  if (!allItems.length) return setState('empty', 'ไม่พบข้อมูลในขณะนี้', 'เมื่อมีรายการ ระบบจะแสดงผลในหน้านี้');
  const visible = allItems.filter(item => (activeStatus === 'all' || itemStatus(item) === activeStatus) && (!searchTerm || itemSearchText(item).includes(searchTerm)));
  content.innerHTML = `${renderSummary(allItems)}${renderControls(allItems)}<section class="admin-card"><div class="admin-card-head"><div><h2 class="admin-card-title">${copy.heading}</h2><p class="admin-card-caption">อัปเดตล่าสุด ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p></div><span class="admin-count">${visible.length} รายการ</span></div><div class="admin-list">${visible.length ? visible.map(renderer).join('') : '<div class="admin-inline-empty"><strong>ไม่พบรายการที่ตรงกัน</strong><span>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</span></div>'}</div></section>`;
  document.querySelector('#admin-search').addEventListener('input', event => { searchTerm = event.target.value.trim().toLocaleLowerCase('th'); renderList(); requestAnimationFrame(() => { const input = document.querySelector('#admin-search'); input.focus(); input.setSelectionRange(input.value.length, input.value.length); }); });
  document.querySelector('#admin-refresh').addEventListener('click', loadPage);
  document.querySelectorAll('#admin-filters button').forEach(button => button.addEventListener('click', () => { activeStatus = button.dataset.status; renderList(); }));
}
function renderData(data) { allItems = data[pageView] || []; renderList(); }
async function requestData() { const response = await fetch(`${ADMIN_API_BASE}/webhook/${pageCopy[pageView].endpoint}?uid=${encodeURIComponent(adminUid)}`); if (!response.ok) throw new Error(`ไม่สามารถโหลดข้อมูลได้ (${response.status})`); return response.json(); }
async function loadPage() { setState('loading', 'กำลังโหลดข้อมูล…', 'โปรดรอสักครู่'); try { renderData(await requestData()); } catch (error) { setState('error', 'ไม่สามารถโหลดข้อมูลได้', error.message || 'กรุณาลองใหม่อีกครั้ง', true); } }
async function init() {
  const copy = pageCopy[pageView];
  if (!copy) return setState('error', 'ไม่พบหน้าที่ต้องการ', 'กรุณากลับไปหน้า Admin');
  document.querySelector('#page-title').textContent = copy.title;
  document.querySelector('#page-subtitle').textContent = copy.subtitle;
  document.querySelector('.admin-hero').insertAdjacentHTML('beforeend', `<nav class="admin-tabs" aria-label="หน้าผู้ดูแล">${Object.entries(pageLinks).map(([view, href]) => `<a class="${view === pageView ? 'is-active' : ''}" href="${href}" ${view === pageView ? 'aria-current="page"' : ''}>${pageLabels[view]}</a>`).join('')}</nav>`);
  try {
    if (!adminUid && window.liff) { await liff.init({ liffId: ADMIN_LIFF_ID }); if (liff.isLoggedIn()) adminUid = (await liff.getProfile()).userId; }
    document.querySelector('#admin-context').innerHTML = adminUid ? '<span class="admin-context-dot" aria-hidden="true"></span><strong>เชื่อมต่อในฐานะผู้ดูแลแล้ว</strong>' : 'กรุณาเปิดผ่าน LINE LIFF เพื่อยืนยันสิทธิ์';
    if (adminUid) document.querySelectorAll('.admin-tabs a').forEach(link => { const url = new URL(link.href); url.searchParams.set('uid', adminUid); link.href = url.href; });
    await loadPage();
  } catch (error) { document.querySelector('#admin-context').textContent = 'ไม่สามารถยืนยันสิทธิ์ผู้ดูแลได้'; setState('error', 'ไม่สามารถเปิดหน้าผู้ดูแลได้', error.message || 'กรุณาลองใหม่อีกครั้ง', true); }
}
init();
