'use strict';

// เปลี่ยน LIFF_ID หลังสร้าง LIFF app ใหม่สำหรับ "สมัครบัญชีสาขา" ใน LINE Developers
const CONFIG = {
  LIFF_ID: 'REPLACE_WITH_BRANCH_REGISTRATION_LIFF_ID',
  N8N_BASE_URL: 'https://n8n.n8n-kokujapan.org',
  SUBMIT_PATH: '/webhook/submit-branch-application',
};

let lineProfile;
const $ = (selector) => document.querySelector(selector);

function showNotice(text, type = 'error') {
  const notice = $('#notice');
  notice.textContent = text;
  notice.className = `notice ${type}`;
  notice.hidden = false;
}

function clean(value) { return String(value || '').trim(); }

async function init() {
  try {
    if (CONFIG.LIFF_ID.startsWith('REPLACE_')) throw new Error('ยังไม่ได้ตั้งค่า LIFF ID สำหรับหน้าสมัครสาขา');
    await liff.init({ liffId: CONFIG.LIFF_ID });
    if (!liff.isLoggedIn()) { liff.login(); return; }
    lineProfile = await liff.getProfile();
    $('#line-name').textContent = lineProfile.displayName || 'ผู้ใช้ LINE';
    $('#line-uid').textContent = lineProfile.userId;
    if (lineProfile.pictureUrl) { $('#picture').src = lineProfile.pictureUrl; $('#picture').hidden = false; }
    $('#loading').hidden = true;
    $('#app').hidden = false;
  } catch (error) {
    $('#loading').hidden = true;
    $('#app').hidden = false;
    showNotice(error.message || 'ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาเปิดหน้านี้จาก LINE อีกครั้ง');
  }
}

$('#application-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!lineProfile) return showNotice('กรุณาเปิดหน้านี้ผ่าน LINE เพื่อยืนยันตัวตน');
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const tel = clean(data.tel).replace(/[\s-]/g, '');
  if (!/^\+?[0-9]{8,15}$/.test(tel)) return showNotice('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง');
  if (!/^\d{5}$/.test(clean(data.postalCode))) return showNotice('รหัสไปรษณีย์ต้องมี 5 หลัก');
  const button = $('#submit');
  button.disabled = true; button.textContent = 'กำลังส่งคำขอ…';
  try {
    const response = await fetch(`${CONFIG.N8N_BASE_URL}${CONFIG.SUBMIT_PATH}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, tel, lineUid: lineProfile.userId, lineDisplayName: lineProfile.displayName || '', submittedAt: new Date().toISOString() }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || 'ไม่สามารถบันทึกคำขอได้');
    form.hidden = true;
    showNotice(`ส่งคำขอเรียบร้อย${result.applicationId ? ` เลขที่ ${result.applicationId}` : ''} กรุณารอผู้ดูแลตรวจสอบ`, 'success');
  } catch (error) {
    showNotice(error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
  } finally { button.disabled = false; button.textContent = 'ส่งคำขอสมัครสาขา'; }
});

init();
