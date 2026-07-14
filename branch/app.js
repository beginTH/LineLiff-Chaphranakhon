/* ===================================================
   ชาพระนคร — LIFF Branch App (สาขา)
   Version: 1.0.0

   📋 สิ่งที่ต้องทำก่อน Deploy จริง:
   1. เปลี่ยน CONFIG.LIFF_ID เป็น LIFF ID จริงจาก LINE Developers
   2. เปลี่ยน CONFIG.N8N_BASE_URL เป็น URL ของ n8n จริง
   3. เปลี่ยน CONFIG.IS_DEV_MODE เป็น false
   4. (Optional) ลบ MOCK_PRODUCTS และเชื่อมต่อ API ดึงสินค้าจริง
=================================================== */

'use strict';

// =====================================================
// ⚙️ CONFIGURATION
// =====================================================
const CONFIG = {
    LIFF_ID:      '2010570929-oEalS3oQ',                    // ✅ LIFF ID: สั่งซื้อวัตถุดิบ (สาขา)
    N8N_BASE_URL: 'https://n8n.n8n-kokujapan.org',          // ✅ n8n instance URL
    WEBHOOK: {
        GET_PROFILE:  '/webhook/get-user-profile',     // GET  ?uid=xxx  → Lookup Address sheet
        SUBMIT_ORDER: '/webhook/submit-order',         // POST           → Save New Order sheet
    },
    IS_DEV_MODE: false, // ✅ Production mode
    TEST_UID: 'browser-test-uid-001',                       // UID สำหรับทดสอบจาก browser (ไม่ใช่ LINE)
};

/** ตรวจสอบว่าอยู่ใน LINE environment หรือเปล่า */
const isLiffAvailable = () => typeof liff !== 'undefined';

/**
 * รอ LIFF SDK โหลดสูงสุด maxMs มิลลิวินาที
 * ป้องกัน race condition ใน LINE WebView ที่ SDK อาจโหลดช้ากว่า app.js
 */
async function waitForLiff(maxMs = 5000) {
    const interval = 100;
    let elapsed = 0;
    while (typeof liff === 'undefined' && elapsed < maxMs) {
        await new Promise(r => setTimeout(r, interval));
        elapsed += interval;
    }
    return typeof liff !== 'undefined';
}

// =====================================================
// 🗄️ MOCK DATA (ใช้ขณะ Dev — ลบออกเมื่อ API พร้อม)
// =====================================================

/** TODO: แทนที่ด้วยการดึงข้อมูลจาก Google Sheets ผ่าน n8n */
const MOCK_PRODUCTS = [
    { id: 'RM001', name: 'ชาผง CTC (สำหรับชานม)', unit: 'กิโลกรัม', price: 220, emoji: '🍂', status: 'active' },
    { id: 'RM002', name: 'นมข้นหวานตรานกอินทรีย์', unit: 'กระป๋อง', price: 25,  emoji: '🥛', status: 'active' },
    { id: 'RM003', name: 'น้ำตาลทราย',              unit: 'กิโลกรัม', price: 22,  emoji: '🍬', status: 'active' },
    { id: 'RM004', name: 'น้ำเชื่อมน้ำตาลไหม้',     unit: 'ลิตร',      price: 85,  emoji: '🍯', status: 'active' },
    { id: 'RM005', name: 'นมสดพาสเจอร์ไรส์',       unit: 'ลิตร',      price: 45,  emoji: '🐄', status: 'active' },
    { id: 'RM006', name: 'ถ้วยกระดาษ 16oz',        unit: 'แพ็ค (50ใบ)',price: 75,  emoji: '☕', status: 'active' },
    { id: 'RM007', name: 'หลอดดูดกระดาษ',           unit: 'แพ็ค (100อัน)', price: 35, emoji: '🥤', status: 'active' },
    { id: 'RM008', name: 'ถุงหิ้วกระดาษพิมพ์โลโก้', unit: 'แพ็ค (50ใบ)',price: 65,  emoji: '🛍️', status: 'active' },
];

/** TODO: แทนที่ด้วยข้อมูลจริงจาก n8n GET /webhook/get-user-profile */
const MOCK_USER = {
    uid:         'Ud1a2b3c4d5e6f7g8h9i0j',
    displayName: 'สาขาทดสอบ',
    pictureUrl:  '',
    addresses: [
        {
            id:   'addr1',
            label: 'สาขาสีลม (หลัก)',
            text: '123/45 ถ.สีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500',
        },
        {
            id:   'addr2',
            label: 'สาขาสุขุมวิท',
            text: '67/8 ถ.สุขุมวิท 11 แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพฯ 10110',
        },
    ],
};

// =====================================================
// 🏪 APP STATE
// =====================================================
const state = {
    user:            null,   // { uid, displayName }
    addresses:       [],     // [{ id, label, text, isNew? }]
    selectedAddress: null,   // address object ที่เลือก
    products:        [],     // รายการสินค้าทั้งหมด
    cart:            {},     // { [productId]: qty }
    orderId:         null,   // รหัสออเดอร์หลัง submit
};

// =====================================================
// 🔧 UTILITY
// =====================================================

/**
 * สลับ screen พร้อม animation
 * @param {string} nextId - element id ของ screen ที่จะแสดง
 */
function goTo(nextId) {
    const current = document.querySelector('.screen.is-active');
    const next    = document.getElementById(nextId);

    if (!next || current === next) return;

    // ออก
    if (current) {
        current.classList.add('is-leaving');
        setTimeout(() => {
            current.classList.remove('is-visible', 'is-active', 'is-leaving');
            current.style.display = '';
        }, 360);
    }

    // เข้า
    setTimeout(() => {
        next.classList.add('is-visible');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => next.classList.add('is-active'));
        });
    }, current ? 160 : 0);
}

/** Format ราคา */
const fmt = (n) => `฿${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

/** สร้าง Order ID */
function genOrderId() {
    const d = new Date();
    const date  = d.toISOString().slice(0,10).replace(/-/g,'');
    const rand  = String(Math.floor(Math.random()*1000)).padStart(3,'0');
    return `PO-${date}-${rand}`;
}

/** ยอดรวมวัตถุดิบ */
function calcSubtotal() {
    return Object.entries(state.cart).reduce((sum, [id, qty]) => {
        const p = state.products.find(p => p.id === id);
        return sum + (p ? p.price * qty : 0);
    }, 0);
}

/** จำนวนรายการในตะกร้า */
function countItems() {
    return Object.values(state.cart).reduce((s, q) => s + q, 0);
}

/** Bump animation บน badge */
function bumpBadge() {
    const el = document.getElementById('cart-count');
    el.classList.remove('bump');
    void el.offsetWidth; // reflow
    el.classList.add('bump');
}

// =====================================================
// 🔌 API
// =====================================================

/**
 * ดึงข้อมูล User + ที่อยู่จาก n8n
 * Dev mode: คืน Mock Data
 */
async function apiGetProfile(uid) {
    if (CONFIG.IS_DEV_MODE) {
        console.log('[DEV] apiGetProfile uid:', uid);
        await delay(900);
        return MOCK_USER;
    }

    const res = await fetch(
        `${CONFIG.N8N_BASE_URL}${CONFIG.WEBHOOK.GET_PROFILE}?uid=${encodeURIComponent(uid)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!res.ok) throw new Error(`GET Profile failed: ${res.status}`);
    return res.json();
}

/**
 * ส่งคำสั่งซื้อไปยัง n8n
 * Dev mode: log และคืน success
 */
async function apiSubmitOrder(payload) {
    if (CONFIG.IS_DEV_MODE) {
        console.log('[DEV] apiSubmitOrder payload:', JSON.stringify(payload, null, 2));
        await delay(1600);
        return { success: true, orderId: genOrderId() };
    }

    const res = await fetch(
        `${CONFIG.N8N_BASE_URL}${CONFIG.WEBHOOK.SUBMIT_ORDER}`,
        {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        }
    );
    if (!res.ok) throw new Error(`Submit order failed: ${res.status}`);
    return res.json();
}

/** Sleep helper */
const delay = (ms) => new Promise(r => setTimeout(r, ms));

// =====================================================
// 🖼️ RENDER
// =====================================================

/** Render รายการที่อยู่ในหน้า Address */
function renderAddressList() {
    const container = document.getElementById('address-list');

    if (state.addresses.length === 0) {
        container.innerHTML = `
            <div class="no-address-state">
                <span class="no-address-icon">📍</span>
                <p>ยังไม่มีที่อยู่ที่บันทึกไว้<br>กรุณาเพิ่มที่อยู่ใหม่ด้านล่าง</p>
            </div>`;
        document.getElementById('new-address-form').classList.remove('hidden');
        return;
    }

    container.innerHTML = state.addresses.map(addr => `
        <div class="address-card${state.selectedAddress?.id === addr.id ? ' selected' : ''}"
             id="addr-card-${addr.id}"
             data-addr-id="${addr.id}"
             role="radio"
             aria-checked="${state.selectedAddress?.id === addr.id}"
             tabindex="0">
            <div class="address-radio"></div>
            <div class="address-info">
                <span class="address-tag">${escapeHtml(addr.label)}</span>
                <p class="address-detail">${escapeHtml(addr.text)}</p>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.address-card').forEach(card => {
        const pick = () => selectAddress(card.dataset.addrId);
        card.addEventListener('click', pick);
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') pick(); });
    });
}

/** เลือกที่อยู่ */
function selectAddress(id) {
    state.selectedAddress = state.addresses.find(a => a.id === id) || null;

    document.querySelectorAll('.address-card').forEach(c => {
        const sel = c.dataset.addrId === id;
        c.classList.toggle('selected', sel);
        c.setAttribute('aria-checked', sel);
    });

    document.getElementById('btn-next-to-products').disabled = !state.selectedAddress;
    document.getElementById('new-address-form').classList.add('hidden');
}

/** Render Product Grid */
function renderProducts() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = state.products.map(p => {
        const qty = state.cart[p.id] || 0;
        return `
            <div class="product-card${qty > 0 ? ' in-cart' : ''}" id="prod-${p.id}">
                <span class="product-emoji">${p.emoji}</span>
                <div>
                    <p class="product-name">${escapeHtml(p.name)}</p>
                    <p class="product-unit">/ ${escapeHtml(p.unit)}</p>
                </div>
                <p class="product-price">${fmt(p.price)}</p>
                <div class="qty-control">
                    <button class="qty-btn dec" data-pid="${p.id}" aria-label="ลด">−</button>
                    <span class="qty-value" id="qty-${p.id}">${qty}</span>
                    <button class="qty-btn inc" data-pid="${p.id}" aria-label="เพิ่ม">+</button>
                </div>
            </div>`;
    }).join('');

    grid.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => changeQty(btn.dataset.pid, btn.classList.contains('inc') ? 1 : -1));
    });
}

/** เปลี่ยนจำนวนสินค้าในตะกร้า */
function changeQty(pid, delta) {
    const cur = state.cart[pid] || 0;
    const nxt = Math.max(0, cur + delta);

    if (nxt === 0) delete state.cart[pid];
    else state.cart[pid] = nxt;

    // Update DOM
    const qtyEl = document.getElementById(`qty-${pid}`);
    if (qtyEl) qtyEl.textContent = nxt;

    const card = document.getElementById(`prod-${pid}`);
    if (card) card.classList.toggle('in-cart', nxt > 0);

    syncCartUI();
    if (delta > 0) bumpBadge();
}

/** Sync ข้อมูลตะกร้าทุก element */
function syncCartUI() {
    const total = countItems();
    const sub   = calcSubtotal();

    document.getElementById('cart-count').textContent      = total;
    document.getElementById('cart-items-count').textContent = `${total} รายการ`;
    document.getElementById('cart-total-price').textContent  = fmt(sub);

    const bar = document.getElementById('cart-action-bar');
    bar.style.display = total > 0 ? 'block' : 'none';
}

/** Render Summary */
function renderSummary() {
    // Address
    const addrEl = document.getElementById('summary-address-text');
    if (state.selectedAddress) {
        addrEl.innerHTML = `<strong style="color:var(--text-primary)">${escapeHtml(state.selectedAddress.label)}</strong><br>${escapeHtml(state.selectedAddress.text)}`;
    }

    // Items
    const list = document.getElementById('summary-items-list');
    const items = Object.entries(state.cart).filter(([,q]) => q > 0);
    list.innerHTML = items.map(([id, qty]) => {
        const p = state.products.find(x => x.id === id);
        return `
            <div class="summary-item">
                <span class="summary-item-name">${p.emoji} ${escapeHtml(p.name)}</span>
                <span class="summary-item-qty">×${qty} ${escapeHtml(p.unit)}</span>
                <span class="summary-item-price">${fmt(p.price * qty)}</span>
            </div>`;
    }).join('');

    // Price
    const sub = calcSubtotal();
    document.getElementById('summary-subtotal').textContent = fmt(sub);
    document.getElementById('summary-total').textContent    = fmt(sub);
}

/** XSS guard */
function escapeHtml(s) {
    return String(s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

// =====================================================
// 🚀 INIT
// =====================================================

async function initApp() {
    const loadingText = document.getElementById('loading-text');

    // แสดง loading screen ทันที
    const loadingScreen = document.getElementById('screen-loading');
    loadingScreen.classList.add('is-visible');
    requestAnimationFrame(() => requestAnimationFrame(() => loadingScreen.classList.add('is-active')));

    try {
        // 1️⃣ Init LIFF (หรือ fallback เมื่อเปิดจาก browser)
        loadingText.textContent = 'กำลังเชื่อมต่อ LINE...';

        // 🔍 Debug: รอ LIFF SDK โหลด (ป้องกัน race condition ใน LINE WebView)
        loadingText.textContent = 'กำลังโหลด LIFF SDK...';
        const liffLoaded = await waitForLiff(5000);
        const isLineUA   = /Line\//i.test(navigator.userAgent);
        console.log(`[DEBUG] LIFF SDK loaded: ${liffLoaded} (after wait)`);
        console.log(`[DEBUG] Is LINE UA: ${isLineUA}`);
        console.log(`[DEBUG] User-Agent: ${navigator.userAgent}`);
        loadingText.textContent = 'กำลังเชื่อมต่อ LINE...';

        if (CONFIG.IS_DEV_MODE) {
            // 🧪 Dev mode: Mock user, Mock data
            console.log('[DEV] Skipping LIFF.init()');
            await delay(500);
            state.user = { uid: MOCK_USER.uid, displayName: MOCK_USER.displayName };

        } else if (!liffLoaded) {
            // 🌐 Browser mode: LIFF SDK โหลดไม่สำเร็จภายใน 5 วินาที
            console.warn(`[BROWSER] LIFF SDK unavailable after 5s. UA: ${navigator.userAgent}`);
            const testUid = new URLSearchParams(window.location.search).get('uid') || CONFIG.TEST_UID;
            state.user = { uid: testUid, displayName: `Browser Test (${testUid.slice(-6)})` };
            showBrowserTestBanner(testUid, isLineUA);

        } else {
            // 📱 LINE mode: LIFF จริง
            loadingText.textContent = 'กำลัง Init LIFF...';
            await liff.init({ liffId: CONFIG.LIFF_ID });
            console.log(`[LIFF] isInClient: ${liff.isInClient()}, isLoggedIn: ${liff.isLoggedIn()}`);
            if (!liff.isLoggedIn()) {
                loadingText.textContent = 'กำลัง Login LINE...';
                liff.login();
                return;
            }
            const profile = await liff.getProfile();
            state.user = { uid: profile.userId, displayName: profile.displayName };
        }

        // 2️⃣ ดึงข้อมูลสาขา (เรียก webhook จริงเสมอ ยกเว้น Dev mode)
        loadingText.textContent = 'กำลังดึงข้อมูลสาขา...';
        const userData = await apiGetProfile(state.user.uid);

        // 3️⃣ Set state
        state.addresses = userData.addresses || [];

        state.products = MOCK_PRODUCTS;

        // 4️⃣ อัปเดต greeting
        document.getElementById('user-greeting').textContent =
            `สวัสดีครับ, ${state.user.displayName}! 👋`;

        // 5️⃣ Render และเปิดหน้าเลือกที่อยู่
        renderAddressList();
        goTo('screen-address');

    } catch (err) {
        console.error('[LIFF Error]', err);
        loadingText.textContent = `เกิดข้อผิดพลาด: ${err.message}`;
        loadingText.style.color = 'var(--red)';
    }
}

/** แสดง banner แจ้งว่ากำลังทดสอบจาก browser หรือ LIFF SDK โหลดไม่สำเร็จ */
function showBrowserTestBanner(uid, isLineUA = false) {
    const banner = document.createElement('div');
    banner.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9999',
        'background:#f59e0b', 'color:#1a1a1a', 'font-size:10px',
        'font-weight:600', 'text-align:center', 'padding:4px 8px',
        'letter-spacing:0.3px', 'line-height:1.4',
    ].join(';');
    const context = isLineUA ? '📱 LINE Browser (SDK fail)' : '🌐 External Browser';
    banner.textContent = `BROWSER TEST MODE | ${context} | UID: ${uid}`;
    document.body.prepend(banner);
}

// =====================================================
// 🎮 EVENT LISTENERS
// =====================================================

document.addEventListener('DOMContentLoaded', () => {

    // ─────────────────────────────────────────────
    // SCREEN 1: ADDRESS
    // ─────────────────────────────────────────────

    /** ปุ่ม "เพิ่มที่อยู่ใหม่" */
    document.getElementById('btn-add-address').addEventListener('click', () => {
        const form = document.getElementById('new-address-form');
        const isHidden = form.classList.toggle('hidden');
        if (!isHidden) document.getElementById('input-branch-name').focus();
    });

    /** ปุ่ม "บันทึกที่อยู่นี้" */
    document.getElementById('btn-confirm-new-address').addEventListener('click', () => {
        const label = document.getElementById('input-branch-name').value.trim();
        const text  = document.getElementById('input-address').value.trim();

        if (!label || !text) {
            alert('กรุณากรอกชื่อสาขา และที่อยู่ให้ครบก่อนบันทึก');
            return;
        }

        const newAddr = { id: `new-${Date.now()}`, label, text, isNew: true };
        state.addresses.push(newAddr);
        renderAddressList();
        selectAddress(newAddr.id);
        document.getElementById('new-address-form').classList.add('hidden');

        // Clear inputs
        document.getElementById('input-branch-name').value = '';
        document.getElementById('input-address').value     = '';
    });

    /** ปุ่ม "ถัดไป — เลือกสินค้า" */
    document.getElementById('btn-next-to-products').addEventListener('click', () => {
        renderProducts();
        syncCartUI();
        goTo('screen-products');
    });

    // ─────────────────────────────────────────────
    // SCREEN 2: PRODUCTS
    // ─────────────────────────────────────────────

    /** ย้อนกลับไปหน้าที่อยู่ */
    document.getElementById('btn-back-to-address').addEventListener('click', () => {
        goTo('screen-address');
    });

    /** ไปหน้าสรุปคำสั่งซื้อ */
    document.getElementById('btn-next-to-summary').addEventListener('click', () => {
        if (countItems() === 0) {
            alert('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');
            return;
        }
        renderSummary();
        goTo('screen-summary');
    });

    // ─────────────────────────────────────────────
    // SCREEN 3: SUMMARY
    // ─────────────────────────────────────────────

    /** ย้อนกลับไปหน้าสินค้า */
    document.getElementById('btn-back-to-products').addEventListener('click', () => {
        goTo('screen-products');
    });

    /** แก้ไขที่อยู่ (จากหน้าสรุป) */
    document.getElementById('btn-edit-address').addEventListener('click', () => {
        goTo('screen-address');
    });

    /** แก้ไขรายการสินค้า (จากหน้าสรุป) */
    document.getElementById('btn-edit-products').addEventListener('click', () => {
        goTo('screen-products');
    });

    /** ปุ่ม "ยืนยันคำสั่งซื้อ" — Submit */
    document.getElementById('btn-submit-order').addEventListener('click', async () => {
        if (!state.selectedAddress) { alert('กรุณาเลือกที่อยู่จัดส่ง'); return; }
        if (countItems() === 0)     { alert('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ'); return; }

        const btn     = document.getElementById('btn-submit-order');
        const btnText = document.getElementById('submit-btn-text');
        const spinner = document.getElementById('submit-spinner');

        // Loading state
        btn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');

        try {
            const note = document.getElementById('input-note').value.trim();

            // Build order items
            const orderItems = Object.entries(state.cart)
                .filter(([,q]) => q > 0)
                .map(([id, qty]) => {
                    const p = state.products.find(x => x.id === id);
                    return {
                        productId:    p.id,
                        productName:  p.name,
                        unit:         p.unit,
                        pricePerUnit: p.price,
                        quantity:     qty,
                        lineTotal:    p.price * qty,
                    };
                });

            // Build payload ตาม spec ของ n8n webhook POST /webhook/submit-order
            const payload = {
                lineUid:         state.user.uid,
                displayName:     state.user.displayName,
                deliveryAddress: {
                    id:    state.selectedAddress.id,
                    label: state.selectedAddress.label,
                    text:  state.selectedAddress.text,
                },
                isNewAddress: Boolean(state.selectedAddress.isNew),
                orderItems,
                subtotal:  calcSubtotal(),
                note:      note || '',
                timestamp: new Date().toISOString(),
            };

            const result = await apiSubmitOrder(payload);

            // Success
            state.orderId = result.orderId;
            document.getElementById('success-order-id').textContent = state.orderId;
            goTo('screen-success');

        } catch (err) {
            console.error('[Submit Error]', err);
            alert(`ส่งคำสั่งซื้อไม่สำเร็จ\n${err.message}\n\nกรุณาลองใหม่อีกครั้ง`);

            // Reset button
            btn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    // ─────────────────────────────────────────────
    // SCREEN 4: SUCCESS
    // ─────────────────────────────────────────────

    /** ปิดหน้าต่าง LIFF */
    document.getElementById('btn-close-liff').addEventListener('click', () => {
        if (CONFIG.IS_DEV_MODE) {
            // Dev: reload แทน close
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
