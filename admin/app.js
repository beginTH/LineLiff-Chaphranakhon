/* ===================================================
   ชาพระนคร — LIFF Admin App
   Version: 1.0.0

   📋 วิธีการทำงาน:
   - หน้านี้ถูกเปิดผ่านปุ่มใน LINE Flex Message ที่ส่งให้แอดมิน
   - URL จะมี query param: ?orderId=PO-20260702-001
   - ระบบดึงข้อมูลออเดอร์จาก n8n ด้วย orderId นั้น
   - แอดมินกรอกค่าขนส่ง แล้วกดอนุมัติ
   - ข้อมูลส่งกลับไปยัง POST /webhook/admin-approve

   📋 สิ่งที่ต้องทำก่อน Deploy จริง:
   1. เปลี่ยน CONFIG.LIFF_ID เป็น LIFF ID จริง (Admin LIFF)
   2. เปลี่ยน CONFIG.N8N_BASE_URL เป็น URL n8n จริง
   3. เปลี่ยน CONFIG.IS_DEV_MODE เป็น false
=================================================== */

'use strict';

// =====================================================
// ⚙️ CONFIGURATION
// =====================================================
const CONFIG = {
    LIFF_ID:      '2010570929-BJxo68XQ',         // ✅ LIFF ID: จัดการออเดอร์ (Admin)
    N8N_BASE_URL: 'https://YOUR_N8N_DOMAIN.com',    // TODO: ใส่ URL n8n จริง
    WEBHOOK: {
        GET_ORDER:     '/webhook/get-order',          // GET  ?orderId=xxx
        ADMIN_APPROVE: '/webhook/admin-approve',      // POST
    },
    IS_DEV_MODE: true, // ⚠️ เปลี่ยนเป็น false ก่อน Deploy จริง
};

// =====================================================
// 🗄️ MOCK ORDER DATA (ใช้ขณะ Dev — ลบออกเมื่อ API พร้อม)
// =====================================================

/** TODO: แทนที่ด้วยข้อมูลจริงจาก Google Sheets ผ่าน n8n */
const MOCK_ORDER = {
    orderId:   'PO-20260702-042',
    timestamp: '2026-07-02T10:30:00.000Z',
    status:    'Pending',   // 'Pending' | 'Approved' | 'Completed'
    branchInfo: {
        uid:         'Ud1a2b3c4d5e6f7g8h9i0j',
        displayName: 'สาขาสีลม',
    },
    deliveryAddress: {
        label: 'สาขาสีลม (หลัก)',
        text:  '123/45 ถ.สีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500',
    },
    orderItems: [
        { productId: 'RM001', productName: 'ชาผง CTC', unit: 'กิโลกรัม', pricePerUnit: 220, quantity: 5,  lineTotal: 1100 },
        { productId: 'RM002', productName: 'นมข้นหวาน', unit: 'กระป๋อง', pricePerUnit: 25,  quantity: 24, lineTotal: 600  },
        { productId: 'RM003', productName: 'น้ำตาลทราย', unit: 'กิโลกรัม', pricePerUnit: 22, quantity: 10, lineTotal: 220  },
        { productId: 'RM006', productName: 'ถ้วยกระดาษ 16oz', unit: 'แพ็ค (50ใบ)', pricePerUnit: 75, quantity: 4, lineTotal: 300 },
    ],
    subtotal: 2220,
    note: 'ต้องการรับก่อนเที่ยง ฝากวางไว้หน้าร้านได้เลยครับ',
};

// =====================================================
// 🏪 APP STATE
// =====================================================
const state = {
    admin:    null,   // { uid, displayName }
    orderId:  null,   // จาก URL param
    order:    null,   // ข้อมูลออเดอร์เต็ม
    shipping: 0,      // ค่าขนส่งที่แอดมินกรอก
};

// =====================================================
// 🔧 UTILITY
// =====================================================

/** สลับ screen พร้อม animation */
function goTo(nextId) {
    const current = document.querySelector('.screen.is-active');
    const next    = document.getElementById(nextId);
    if (!next || current === next) return;

    if (current) {
        current.classList.add('is-leaving');
        setTimeout(() => current.classList.remove('is-visible','is-active','is-leaving'), 360);
    }
    setTimeout(() => {
        next.classList.add('is-visible');
        requestAnimationFrame(() => requestAnimationFrame(() => next.classList.add('is-active')));
    }, current ? 160 : 0);
}

/** Format ราคา */
const fmt = (n) => `฿${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

/** Format วันเวลาเป็น Thai format */
function formatDateTime(isoString) {
    try {
        const d = new Date(isoString);
        return d.toLocaleString('th-TH', {
            year:   'numeric',
            month:  'long',
            day:    'numeric',
            hour:   '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Bangkok',
        });
    } catch {
        return isoString;
    }
}

/** XSS guard */
function esc(s) {
    return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** อ่าน query param */
function getQueryParam(key) {
    return new URLSearchParams(window.location.search).get(key);
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// =====================================================
// 🔌 API
// =====================================================

/**
 * ดึงข้อมูลออเดอร์จาก n8n โดยใช้ orderId
 * Dev mode: คืน Mock Order
 */
async function apiGetOrder(orderId) {
    if (CONFIG.IS_DEV_MODE) {
        console.log('[DEV] apiGetOrder:', orderId);
        await delay(1000);
        // Simulate: ถ้า orderId ตรงกับ mock ให้คืน mock data
        return { ...MOCK_ORDER, orderId: orderId || MOCK_ORDER.orderId };
    }

    const res = await fetch(
        `${CONFIG.N8N_BASE_URL}${CONFIG.WEBHOOK.GET_ORDER}?orderId=${encodeURIComponent(orderId)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!res.ok) throw new Error(`GET Order failed: ${res.status}`);
    return res.json();
}

/**
 * ส่งการอนุมัติไปยัง n8n
 * Dev mode: log และคืน success
 */
async function apiApproveOrder(payload) {
    if (CONFIG.IS_DEV_MODE) {
        console.log('[DEV] apiApproveOrder payload:', JSON.stringify(payload, null, 2));
        await delay(1800);
        return { success: true };
    }

    const res = await fetch(
        `${CONFIG.N8N_BASE_URL}${CONFIG.WEBHOOK.ADMIN_APPROVE}`,
        {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        }
    );
    if (!res.ok) throw new Error(`Approve order failed: ${res.status}`);
    return res.json();
}

// =====================================================
// 🖼️ RENDER
// =====================================================

/** Render ข้อมูลออเดอร์ทั้งหมดลงหน้า Order Detail */
function renderOrder(order) {
    // Hero
    setText('display-order-id', order.orderId);
    setText('display-timestamp', formatDateTime(order.timestamp));

    // Status badge
    const badge = document.getElementById('order-status-badge');
    if (order.status === 'Approved' || order.status === 'Completed') {
        badge.textContent = 'อนุมัติแล้ว';
        badge.className = 'status-badge status-approved';
    } else {
        badge.textContent = 'รอยืนยัน';
        badge.className = 'status-badge status-pending';
    }

    // Branch
    setText('branch-name', order.branchInfo?.displayName || '—');
    setText('branch-uid',  order.branchInfo?.uid         || '—');

    // Delivery address
    setText('delivery-label',   order.deliveryAddress?.label || '—');
    setText('delivery-address', order.deliveryAddress?.text  || '—');

    // Order items
    const itemsContainer = document.getElementById('order-items-list');
    itemsContainer.innerHTML = (order.orderItems || []).map(item => `
        <div class="order-item">
            <span class="oi-name">${esc(item.productName)}</span>
            <span class="oi-qty">×${item.quantity} ${esc(item.unit)}</span>
            <span class="oi-unit-price">${fmt(item.pricePerUnit)} / หน่วย</span>
            <span class="oi-total">${fmt(item.lineTotal)}</span>
        </div>
    `).join('');

    // Item count badge
    setText('item-count-badge', `${order.orderItems?.length || 0} รายการ`);

    // Note
    if (order.note) {
        const noteCard = document.getElementById('note-card');
        noteCard.style.display = 'block';
        setText('order-note', order.note);
    }

    // Price breakdown
    setText('price-subtotal',   fmt(order.subtotal || 0));
    setText('price-shipping',   fmt(state.shipping));
    setText('price-grand-total', fmt((order.subtotal || 0) + state.shipping));
}

/** อัปเดตราคาแบบ real-time เมื่อพิมพ์ค่าขนส่ง */
function updatePriceDisplay(shippingCost) {
    const sub   = state.order?.subtotal || 0;
    const total = sub + shippingCost;
    setText('price-shipping',    fmt(shippingCost));
    setText('price-grand-total', fmt(total));
}

/** Helper setText */
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// =====================================================
// 🚀 INIT
// =====================================================

async function initApp() {
    const loadingText = document.getElementById('loading-text');

    // แสดง loading ทันที
    const loadScreen = document.getElementById('screen-loading');
    loadScreen.classList.add('is-visible');
    requestAnimationFrame(() => requestAnimationFrame(() => loadScreen.classList.add('is-active')));

    try {
        // 1️⃣ อ่าน orderId จาก URL
        state.orderId = getQueryParam('orderId');

        if (CONFIG.IS_DEV_MODE) {
            // DEV MODE: ใช้ orderId จาก URL หรือ Mock
            if (!state.orderId) state.orderId = MOCK_ORDER.orderId;
            console.log('[DEV] orderId:', state.orderId);
            await delay(400);
            state.admin = { uid: 'admin-uid-dev', displayName: 'แอดมิน (Dev)' };
        } else {
            // PRODUCTION
            if (!state.orderId) throw new Error('ไม่พบรหัสออเดอร์ใน URL กรุณาเปิดผ่านลิงก์ที่ได้รับ');

            await liff.init({ liffId: CONFIG.LIFF_ID });
            if (!liff.isLoggedIn()) { liff.login(); return; }

            const profile = await liff.getProfile();
            state.admin = { uid: profile.userId, displayName: profile.displayName };
        }

        // 2️⃣ ดึงข้อมูลออเดอร์
        loadingText.textContent = `กำลังโหลดออเดอร์ ${state.orderId}...`;
        const order = await apiGetOrder(state.orderId);
        state.order = order;

        // 3️⃣ เช็คว่าออเดอร์นี้อนุมัติแล้วหรือยัง
        if (order.status === 'Approved' || order.status === 'Completed') {
            // ออเดอร์อนุมัติแล้ว — แสดงหน้า already approved
            setText('approved-order-id', order.orderId);
            setText('approved-shipping',  fmt(order.shippingCost || 0));
            setText('approved-total',     fmt(order.totalAmount  || order.subtotal));
            goTo('screen-approved');
            return;
        }

        // 4️⃣ Render หน้า Order Detail
        renderOrder(order);
        goTo('screen-order');

    } catch (err) {
        console.error('[Admin LIFF Error]', err);
        setText('not-found-msg', err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        goTo('screen-not-found');
    }
}

// =====================================================
// 🎮 EVENT LISTENERS
// =====================================================

document.addEventListener('DOMContentLoaded', () => {

    // ─────────────────────────────────────────────
    // Real-time shipping cost calculation
    // ─────────────────────────────────────────────
    document.getElementById('input-shipping').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        state.shipping = Math.max(0, val);
        updatePriceDisplay(state.shipping);
    });

    // ─────────────────────────────────────────────
    // APPROVE BUTTON
    // ─────────────────────────────────────────────
    document.getElementById('btn-approve-order').addEventListener('click', async () => {
        // Validate shipping cost
        const shippingInput = document.getElementById('input-shipping');
        const shippingCost  = parseFloat(shippingInput.value);

        if (isNaN(shippingCost) || shippingCost < 0) {
            alert('กรุณาระบุค่าขนส่ง (ถ้าไม่มีค่าขนส่ง ให้กรอก 0)');
            shippingInput.focus();
            return;
        }

        // Confirm
        const subtotal   = state.order?.subtotal || 0;
        const totalAmount = subtotal + shippingCost;
        const confirmed  = confirm(
            `ยืนยันการอนุมัติออเดอร์?\n\n` +
            `รหัส: ${state.orderId}\n` +
            `สาขา: ${state.order?.branchInfo?.displayName}\n` +
            `ค่าขนส่ง: ${fmt(shippingCost)}\n` +
            `ยอดรวม: ${fmt(totalAmount)}`
        );
        if (!confirmed) return;

        // Loading state
        const btn     = document.getElementById('btn-approve-order');
        const btnText = document.getElementById('approve-btn-text');
        const spinner = document.getElementById('approve-spinner');
        btn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');

        try {
            // Build payload ตาม spec ของ n8n webhook POST /webhook/admin-approve
            const payload = {
                orderId:      state.orderId,
                adminUid:     state.admin?.uid,
                adminName:    state.admin?.displayName,
                shippingCost: shippingCost,
                subtotal:     subtotal,
                totalAmount:  totalAmount,
                approvedAt:   new Date().toISOString(),
                // ส่ง branchUid เพื่อให้ n8n ยิง Push Message กลับไปหาสาขา
                branchUid:    state.order?.branchInfo?.uid,
            };

            await apiApproveOrder(payload);

            // Success — อัปเดตหน้า Success
            setText('success-order-id',    state.orderId);
            setText('success-branch',      state.order?.branchInfo?.displayName || '—');
            setText('success-subtotal',    fmt(subtotal));
            setText('success-shipping',    fmt(shippingCost));
            setText('success-grand-total', fmt(totalAmount));

            goTo('screen-success');

        } catch (err) {
            console.error('[Approve Error]', err);
            alert(`อนุมัติไม่สำเร็จ\n${err.message}\n\nกรุณาลองใหม่อีกครั้ง`);

            btn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    // ─────────────────────────────────────────────
    // CLOSE BUTTON (Success Screen)
    // ─────────────────────────────────────────────
    document.getElementById('btn-close-liff').addEventListener('click', () => {
        if (CONFIG.IS_DEV_MODE) {
            window.location.reload();
            return;
        }
        try {
            liff.closeWindow();
        } catch {
            window.close();
        }
    });

    // ─────────────────────────────────────────────
    // START
    // ─────────────────────────────────────────────
    initApp();
});
