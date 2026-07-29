const ADMIN_API_BASE = 'https://n8n.n8n-kokujapan.org';
const ADMIN_LIFF_ID = '2010570929-BJxo68XQ';
const pageView = document.body.dataset.view;
let adminUid = new URLSearchParams(location.search).get('uid') || '';

const pageCopy = {
  orders: { title: 'ประวัติ Order', subtitle: 'ติดตามคำสั่งซื้อและสถานะล่าสุด', heading: 'รายการ Order', endpoint: 'admin-orders' },
  payments: { title: 'รายการชำระเงิน', subtitle: 'ตรวจสอบสถานะการชำระเงินของแต่ละ Order', heading: 'รายการชำระเงิน', endpoint: 'admin-payments' },
  products: { title: 'จัดการวัตถุดิบ', subtitle: 'ตรวจสอบรายการ ราคา และสถานะวัตถุดิบ', heading: 'รายการวัตถุดิบ', endpoint: 'admin-products' },
  users: { title: 'จัดการสมาชิก', subtitle: 'ตรวจสอบข้อมูลสมาชิกและสิทธิ์การใช้งาน', heading: 'สมาชิกในระบบ', endpoint: 'admin-users' },
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const money = value => `฿${Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateTime = value => value ? String(value).replace('T', ' ').replace('.000Z', '') : '—';
const statusClass = value => /approved|verified|active|พร้อม|success/i.test(String(value)) ? 'admin-badge--success' : /pending|รอ|submit/i.test(String(value)) ? 'admin-badge--warn' : 'admin-badge--neutral';

function setState(kind, title, detail = '', retry = false) {
  const content = document.querySelector('#page-content');
  content.innerHTML = `<div class="admin-state ${kind === 'error' ? 'admin-state--error' : ''}">${kind === 'loading' ? '<div class="admin-spinner" aria-hidden="true"></div>' : ''}<strong>${esc(title)}</strong>${detail ? `<span>${esc(detail)}</span>` : ''}${retry ? '<button class="admin-retry" type="button">ลองใหม่</button>' : ''}</div>`;
  const button = content.querySelector('.admin-retry');
  if (button) button.addEventListener('click', loadPage);
}

function field(label, value, extraClass = '') {
  return `<div><div class="admin-field-label">${esc(label)}</div><div class="admin-field-value ${extraClass}">${esc(value || '—')}</div></div>`;
}

function record(title, meta, badge, fields) {
  return `<article class="admin-record"><div class="admin-record-top"><div><div class="admin-record-title">${esc(title || '—')}</div>${meta ? `<div class="admin-record-meta">${esc(meta)}</div>` : ''}</div>${badge ? `<span class="admin-badge ${statusClass(badge)}">${esc(badge)}</span>` : ''}</div><div class="admin-fields">${fields.join('')}</div></article>`;
}

function renderList(items, renderer) {
  const copy = pageCopy[pageView];
  const content = document.querySelector('#page-content');
  if (!items.length) {
    setState('empty', 'ไม่พบข้อมูลในขณะนี้', 'เมื่อมีรายการ ระบบจะแสดงผลในหน้านี้');
    return;
  }
  content.innerHTML = `<section class="admin-card" aria-live="polite"><div class="admin-card-head"><div><h2 class="admin-card-title">${copy.heading}</h2><p class="admin-card-caption">อัปเดตจากระบบล่าสุด</p></div><span class="admin-count">${items.length} รายการ</span></div><div class="admin-list">${items.map(renderer).join('')}</div></section>`;
}

function renderData(data) {
  if (pageView === 'orders') {
    renderList(data.orders || [], item => record(item.orderId, dateTime(item.timestamp), item.status, [field('ยอดรวม', money(item.totalAmount)), field('สถานะชำระเงิน', item.paymentStatus)]));
  } else if (pageView === 'payments') {
    renderList(data.payments || [], item => record(item.orderId, `ส่งหลักฐาน ${dateTime(item.submittedAt)}`, item.paymentStatus, [field('ยอดชำระ', money(item.totalAmount)), field('สถานะ', item.paymentStatus)]));
  } else if (pageView === 'products') {
    renderList(data.products || [], item => record(item.name, item.productId, item.status, [field('หน่วย', item.unit), field('ราคา', money(item.price))]));
  } else if (pageView === 'users') {
    renderList(data.users || [], item => record(item.displayName, item.lineUid, item.friendStatus, [field('Role', item.role), field('อัปเดตล่าสุด', dateTime(item.updatedAt)), field('LINE UID', item.lineUid, 'admin-field-value--uid')]));
  }
}

async function requestData() {
  const copy = pageCopy[pageView];
  const response = await fetch(`${ADMIN_API_BASE}/webhook/${copy.endpoint}?uid=${encodeURIComponent(adminUid)}`);
  if (!response.ok) throw new Error(`ไม่สามารถโหลดข้อมูลได้ (${response.status})`);
  return response.json();
}

async function loadPage() {
  setState('loading', 'กำลังโหลดข้อมูล…', 'โปรดรอสักครู่');
  try {
    const data = await requestData();
    renderData(data);
  } catch (error) {
    setState('error', 'ไม่สามารถโหลดข้อมูลได้', error.message || 'กรุณาลองใหม่อีกครั้ง', true);
  }
}

async function init() {
  const copy = pageCopy[pageView];
  document.querySelector('#page-title').textContent = copy.title;
  document.querySelector('#page-subtitle').textContent = copy.subtitle;
  try {
    if (!adminUid && window.liff) {
      await liff.init({ liffId: ADMIN_LIFF_ID });
      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        adminUid = profile.userId;
      }
    }
    document.querySelector('#admin-context').innerHTML = adminUid ? `<strong>ผู้ดูแล:</strong> ${esc(adminUid)}` : 'กรุณาเปิดผ่าน LINE LIFF เพื่อยืนยันสิทธิ์';
    await loadPage();
  } catch (error) {
    document.querySelector('#admin-context').textContent = 'ไม่สามารถยืนยันสิทธิ์ผู้ดูแลได้';
    setState('error', 'ไม่สามารถเปิดหน้าผู้ดูแลได้', error.message || 'กรุณาลองใหม่อีกครั้ง', true);
  }
}

init();
