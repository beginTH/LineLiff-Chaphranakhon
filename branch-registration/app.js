'use strict';

const CONFIG = {
  LIFF_ID: '2010570929-GTbRonBm',
  N8N_BASE_URL: 'https://n8n.n8n-kokujapan.org',
  SUBMIT_PATH: '/webhook/submit-branch-application',
  GEOGRAPHY_URL: 'https://raw.githubusercontent.com/thailand-geography-data/thailand-geography-json/main/src/geography.json',
};

let lineProfile;
let geography = [];
const $ = (selector) => document.querySelector(selector);

function showNotice(text, type = 'error') {
  const notice = $('#notice');
  notice.textContent = text;
  notice.className = `notice ${type}`;
  notice.hidden = false;
}
function clean(value) { return String(value || '').trim(); }
function uniqueByCode(rows, code) { return [...new Map(rows.map((row) => [row[code], row])).values()]; }
function setOptions(select, rows, valueKey, labelKey, placeholder) {
  select.replaceChildren(new Option(placeholder, ''));
  rows.forEach((row) => select.add(new Option(row[labelKey], row[valueKey])));
}

async function loadAddressOptions() {
  const province = $('#province');
  const district = $('#district');
  const subdistrict = $('#subdistrict');
  const postalCode = $('#postal-code');
  const response = await fetch(CONFIG.GEOGRAPHY_URL);
  if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลที่อยู่ได้');
  geography = await response.json();
  const provinces = uniqueByCode(geography, 'provinceCode').sort((a, b) => a.provinceNameTh.localeCompare(b.provinceNameTh, 'th'));
  setOptions(province, provinces, 'provinceCode', 'provinceNameTh', 'เลือกจังหวัด');
  province.disabled = false;

  province.addEventListener('change', () => {
    const districts = uniqueByCode(geography.filter((row) => String(row.provinceCode) === province.value), 'districtCode')
      .sort((a, b) => a.districtNameTh.localeCompare(b.districtNameTh, 'th'));
    setOptions(district, districts, 'districtCode', 'districtNameTh', 'เลือกเขต / อำเภอ');
    district.disabled = !province.value;
    setOptions(subdistrict, [], 'subdistrictCode', 'subdistrictNameTh', 'เลือกเขต / อำเภอก่อน');
    subdistrict.disabled = true;
    postalCode.value = '';
  });
  district.addEventListener('change', () => {
    const subdistricts = geography.filter((row) => String(row.districtCode) === district.value)
      .sort((a, b) => a.subdistrictNameTh.localeCompare(b.subdistrictNameTh, 'th'));
    setOptions(subdistrict, subdistricts, 'subdistrictCode', 'subdistrictNameTh', 'เลือกแขวง / ตำบล');
    subdistrict.disabled = !district.value;
    postalCode.value = '';
  });
  subdistrict.addEventListener('change', () => {
    const selected = geography.find((row) => String(row.subdistrictCode) === subdistrict.value);
    postalCode.value = selected ? String(selected.postalCode).padStart(5, '0') : '';
  });
}

async function init() {
  try {
    await loadAddressOptions();
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
    showNotice(error.message || 'ไม่สามารถเชื่อมต่อ LINE หรือโหลดข้อมูลที่อยู่ได้ กรุณาลองใหม่อีกครั้ง');
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