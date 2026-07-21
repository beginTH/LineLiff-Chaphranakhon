/* ===================================================
   เธเธฒเธเธฃเธฐเธเธเธฃ โ€” LIFF Branch App (เธชเธฒเธเธฒ)
   Version: 1.0.0

   ๐“ เธชเธดเนเธเธ—เธตเนเธ•เนเธญเธเธ—เธณเธเนเธญเธ Deploy เธเธฃเธดเธ:
   1. เน€เธเธฅเธตเนเธขเธ CONFIG.LIFF_ID เน€เธเนเธ LIFF ID เธเธฃเธดเธเธเธฒเธ LINE Developers
   2. เน€เธเธฅเธตเนเธขเธ CONFIG.N8N_BASE_URL เน€เธเนเธ URL เธเธญเธ n8n เธเธฃเธดเธ
   3. เน€เธเธฅเธตเนเธขเธ CONFIG.IS_DEV_MODE เน€เธเนเธ false
   4. (Optional) เธฅเธ MOCK_PRODUCTS เนเธฅเธฐเน€เธเธทเนเธญเธกเธ•เนเธญ API เธ”เธถเธเธชเธดเธเธเนเธฒเธเธฃเธดเธ
=================================================== */

'use strict';

// =====================================================
// โ๏ธ CONFIGURATION
// =====================================================
const CONFIG = {
    LIFF_ID:      '2010570929-oEaIS3oQ',                    // โ… LIFF ID: เธชเธฑเนเธเธเธทเนเธญเธงเธฑเธ•เธ–เธธเธ”เธดเธ (เธชเธฒเธเธฒ)
    N8N_BASE_URL: 'https://n8n.n8n-kokujapan.org',          // โ… n8n instance URL
    WEBHOOK: {
        GET_PROFILE:  '/webhook/get-user-profile',     // GET  ?uid=xxx  โ’ Lookup Address sheet
        GET_PRODUCTS: '/webhook/get-products',         // GET           โ’ Lookup Products sheet
        SUBMIT_ORDER: '/webhook/submit-order',         // POST           โ’ Save New Order sheet
    },
    IS_DEV_MODE: false, // โ… Production mode
    TEST_UID: 'id-001',                                     // UID เธชเธณเธซเธฃเธฑเธเธ—เธ”เธชเธญเธเธเธฒเธ browser (เธ•เนเธญเธเธ•เธฃเธเธเธฑเธ Users_Addresses)
};

/** เธ•เธฃเธงเธเธชเธญเธเธงเนเธฒเธญเธขเธนเนเนเธ LINE environment เธซเธฃเธทเธญเน€เธเธฅเนเธฒ */
const liffUrlParams = new URLSearchParams(window.location.search);
const liffState = liffUrlParams.get('liff.state') || '';
const liffStateParams = new URLSearchParams(liffState.replace(/^\?/, ''));
const requestedScreen = liffUrlParams.get('screen') || liffStateParams.get('screen');
if (requestedScreen === 'history' || requestedScreen === 'payment-proof') {
    const target = requestedScreen === 'history' ? 'history.html' : 'payment-proof.html';
    window.location.replace(`${target}${window.location.search}`);
}
const isLiffAvailable = () => typeof liff !== 'undefined';

/**
 * เธฃเธญ LIFF SDK เนเธซเธฅเธ”เธชเธนเธเธชเธธเธ” maxMs เธกเธดเธฅเธฅเธดเธงเธดเธเธฒเธ—เธต
 * เธเนเธญเธเธเธฑเธ race condition เนเธ LINE WebView เธ—เธตเน SDK เธญเธฒเธเนเธซเธฅเธ”เธเนเธฒเธเธงเนเธฒ app.js
 */
async function waitForLiff(maxMs = 10000) {
    const interval = 100;
    let elapsed = 0;
    while (typeof liff === 'undefined' && elapsed < maxMs) {
        await new Promise(r => setTimeout(r, interval));
        elapsed += interval;
    }
    return typeof liff !== 'undefined';
}

// =====================================================
// ๐—๏ธ MOCK DATA (เนเธเนเธเธ“เธฐ Dev โ€” เธฅเธเธญเธญเธเน€เธกเธทเนเธญ API เธเธฃเนเธญเธก)
// =====================================================

/** TODO: เนเธ—เธเธ—เธตเนเธ”เนเธงเธขเธเธฒเธฃเธ”เธถเธเธเนเธญเธกเธนเธฅเธเธฒเธ Google Sheets เธเนเธฒเธ n8n */
const MOCK_PRODUCTS = [
    { id: 'RM001', name: 'เธเธฒเธเธ CTC (เธชเธณเธซเธฃเธฑเธเธเธฒเธเธก)', unit: 'เธเธดเนเธฅเธเธฃเธฑเธก', price: 220, emoji: '๐', status: 'active' },
    { id: 'RM002', name: 'เธเธกเธเนเธเธซเธงเธฒเธเธ•เธฃเธฒเธเธเธญเธดเธเธ—เธฃเธตเธขเน', unit: 'เธเธฃเธฐเธเนเธญเธ', price: 25,  emoji: '๐ฅ', status: 'active' },
    { id: 'RM003', name: 'เธเนเธณเธ•เธฒเธฅเธ—เธฃเธฒเธข',              unit: 'เธเธดเนเธฅเธเธฃเธฑเธก', price: 22,  emoji: '๐ฌ', status: 'active' },
    { id: 'RM004', name: 'เธเนเธณเน€เธเธทเนเธญเธกเธเนเธณเธ•เธฒเธฅเนเธซเธกเน',     unit: 'เธฅเธดเธ•เธฃ',      price: 85,  emoji: '๐ฏ', status: 'active' },
    { id: 'RM005', name: 'เธเธกเธชเธ”เธเธฒเธชเน€เธเธญเธฃเนเนเธฃเธชเน',       unit: 'เธฅเธดเธ•เธฃ',      price: 45,  emoji: '๐', status: 'active' },
    { id: 'RM006', name: 'เธ–เนเธงเธขเธเธฃเธฐเธ”เธฒเธฉ 16oz',        unit: 'เนเธเนเธ (50เนเธ)',price: 75,  emoji: 'โ•', status: 'active' },
    { id: 'RM007', name: 'เธซเธฅเธญเธ”เธ”เธนเธ”เธเธฃเธฐเธ”เธฒเธฉ',           unit: 'เนเธเนเธ (100เธญเธฑเธ)', price: 35, emoji: '๐ฅค', status: 'active' },
    { id: 'RM008', name: 'เธ–เธธเธเธซเธดเนเธงเธเธฃเธฐเธ”เธฒเธฉเธเธดเธกเธเนเนเธฅเนเธเน', unit: 'เนเธเนเธ (50เนเธ)',price: 65,  emoji: '๐๏ธ', status: 'active' },
];

/** TODO: เนเธ—เธเธ—เธตเนเธ”เนเธงเธขเธเนเธญเธกเธนเธฅเธเธฃเธดเธเธเธฒเธ n8n GET /webhook/get-user-profile */
const MOCK_USER = {
    uid:         'Ud1a2b3c4d5e6f7g8h9i0j',
    displayName: 'เธชเธฒเธเธฒเธ—เธ”เธชเธญเธ',
    pictureUrl:  '',
    addresses: [
        {
            id:   'addr1',
            label: 'เธชเธฒเธเธฒเธชเธตเธฅเธก (เธซเธฅเธฑเธ)',
            text: '123/45 เธ–.เธชเธตเธฅเธก เนเธเธงเธเธชเธตเธฅเธก เน€เธเธ•เธเธฒเธเธฃเธฑเธ เธเธฃเธธเธเน€เธ—เธเธฏ 10500',
        },
        {
            id:   'addr2',
            label: 'เธชเธฒเธเธฒเธชเธธเธเธธเธกเธงเธดเธ—',
            text: '67/8 เธ–.เธชเธธเธเธธเธกเธงเธดเธ— 11 เนเธเธงเธเธเธฅเธญเธเน€เธ•เธขเน€เธซเธเธทเธญ เน€เธเธ•เธงเธฑเธ’เธเธฒ เธเธฃเธธเธเน€เธ—เธเธฏ 10110',
        },
    ],
};

// =====================================================
// ๐ช APP STATE
// =====================================================
const state = {
    user:            null,   // { uid, displayName }
    addresses:       [],     // [{ id, label, text, isNew? }]
    selectedAddress: null,   // address object เธ—เธตเนเน€เธฅเธทเธญเธ
    products:        [],     // เธฃเธฒเธขเธเธฒเธฃเธชเธดเธเธเนเธฒเธ—เธฑเนเธเธซเธกเธ”
    cart:            {},     // { [productId]: qty }
    orderId:         null,   // เธฃเธซเธฑเธชเธญเธญเน€เธ”เธญเธฃเนเธซเธฅเธฑเธ submit
};

// =====================================================
// ๐”ง UTILITY
// =====================================================

/**
 * เธชเธฅเธฑเธ screen เธเธฃเนเธญเธก animation
 * @param {string} nextId - element id เธเธญเธ screen เธ—เธตเนเธเธฐเนเธชเธ”เธ
 */
function goTo(nextId) {
    const current = document.querySelector('.screen.is-active');
    const next    = document.getElementById(nextId);

    if (!next || current === next) return;

    // เธญเธญเธ
    if (current) {
        current.classList.add('is-leaving');
        setTimeout(() => {
            current.classList.remove('is-visible', 'is-active', 'is-leaving');
            current.style.display = '';
        }, 360);
    }

    // เน€เธเนเธฒ
    setTimeout(() => {
        next.classList.add('is-visible');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => next.classList.add('is-active'));
        });
    }, current ? 160 : 0);
}

/** Format เธฃเธฒเธเธฒ */
const fmt = (n) => `เธฟ${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

/** เธชเธฃเนเธฒเธ Order ID */
function genOrderId() {
    const d = new Date();
    const date  = d.toISOString().slice(0,10).replace(/-/g,'');
    const rand  = String(Math.floor(Math.random()*1000)).padStart(3,'0');
    return `PO-${date}-${rand}`;
}

/** เธขเธญเธ”เธฃเธงเธกเธงเธฑเธ•เธ–เธธเธ”เธดเธ */
function calcSubtotal() {
    return Object.entries(state.cart).reduce((sum, [id, qty]) => {
        const p = state.products.find(p => p.id === id);
        return sum + (p ? p.price * qty : 0);
    }, 0);
}

/** เธเธณเธเธงเธเธฃเธฒเธขเธเธฒเธฃเนเธเธ•เธฐเธเธฃเนเธฒ */
function countItems() {
    return Object.values(state.cart).reduce((s, q) => s + q, 0);
}

/** Bump animation เธเธ badge */
function bumpBadge() {
    const el = document.getElementById('cart-count');
    el.classList.remove('bump');
    void el.offsetWidth; // reflow
    el.classList.add('bump');
}

// =====================================================
// ๐” API
// =====================================================

/**
 * เธ”เธถเธเธเนเธญเธกเธนเธฅ User + เธ—เธตเนเธญเธขเธนเนเธเธฒเธ n8n
 * Dev mode: เธเธทเธ Mock Data
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

/** เธ”เธถเธเธฃเธฒเธขเธเธฒเธฃเธชเธดเธเธเนเธฒเธเธฒเธ n8n */
async function apiGetProducts() {
    if (CONFIG.IS_DEV_MODE) {
        console.log('[DEV] apiGetProducts');
        await delay(500);
        return MOCK_PRODUCTS;
    }

    const res = await fetch(
        `${CONFIG.N8N_BASE_URL}${CONFIG.WEBHOOK.GET_PRODUCTS}?customerType=${state.user?.isBranch ? 'branch' : 'general'}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!res.ok) throw new Error(`GET Products failed: ${res.status}`);
    return normalizeProducts(await res.json());
}

/**
 * เธชเนเธเธเธณเธชเธฑเนเธเธเธทเนเธญเนเธเธขเธฑเธ n8n
 * Dev mode: log เนเธฅเธฐเธเธทเธ success
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

function unwrapProfileResponse(raw) {
    if (Array.isArray(raw)) return raw[0] || {};
    if (!raw || typeof raw !== 'object') return {};

    const keys = ['body', 'data', 'json', 'user', 'profile', 'result'];
    for (const key of keys) {
        const value = raw[key];
        if (Array.isArray(value)) return value[0] || {};
        if (value && typeof value === 'object') return value;
    }

    return raw;
}

function pickFirst(obj, keys) {
    for (const key of keys) {
        const value = obj?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value).trim();
        }
    }
    return '';
}

function unwrapProductResponse(raw) {
    if (Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== 'object') return [];

    const keys = ['products', 'data', 'items', 'rows', 'body', 'result'];
    for (const key of keys) {
        const value = raw[key];
        if (Array.isArray(value)) return value;
        if (value && typeof value === 'object') {
            const nested = unwrapProductResponse(value);
            if (nested.length > 0) return nested;
        }
    }

    return [raw];
}

function pickProductEmoji(name, index) {
    const text = String(name || '');
    if (text.includes('เธเธฒ')) return '๐';
    if (text.includes('เธเธก')) return '๐ฅ';
    if (text.includes('เธเนเธณเธ•เธฒเธฅ')) return '๐ฌ';
    if (text.includes('เนเธเธฃเธฑเธ') || text.includes('เน€เธเธทเนเธญเธก')) return '๐ฏ';
    if (text.includes('เนเธเนเธง') || text.includes('เธ–เนเธงเธข')) return 'โ•';
    if (text.includes('เธซเธฅเธญเธ”')) return '๐ฅค';
    if (text.includes('เธ–เธธเธ')) return '๐๏ธ';
    return ['๐“ฆ', '๐งพ', '๐ฅ', '๐ซ'][index % 4];
}

const PRODUCT_IMAGE_BY_INDEX = [
    'assets/products/P001-red-thai-tea.png',
    'assets/products/P002-green-tea.png',
    'assets/products/P003-traditional-coffee.png',
    'assets/products/P004-cocoa.png',
    'assets/products/P005-fresh-coffee-powder.png',
    'assets/products/P006-creamer.png',
    'assets/products/P007-rose-tea.png',
    'assets/products/P008-butterfly-pea-tea.png',
    'assets/products/P009-jasmine-tea.png',
    'assets/products/P010-taiwan-milk-tea.png',
    'assets/products/P011-fruit-green-tea.png',
    'assets/products/P012-hong-kong-tea.png',
    'assets/products/P013-premium-cup-set.png',
    'assets/products/P014-6mm-straws.png',
    'assets/products/P015-8mm-straws.png',
    'assets/products/P016-pearl-straws.png',
    'assets/products/P017-smoothie-powder.png',
    'assets/products/P018-standee-sign.png',
    'assets/products/P019-menu-a4.png',
    'assets/products/P020-menu-a3.png',
    'assets/products/P021-large-tea-pot.png',
    'assets/products/P022-140ml-measuring-cup.png',
    'assets/products/P023-45ml-milk-cup.png',
    'assets/products/P024-hot-water-scoop.png',
    'assets/products/P025-stainless-spoons.png',
    'assets/products/P026-long-spoon.png',
    'assets/products/P027-spoon-and-jar.png',
    'assets/products/P028-double-cup-bag.png',
    'assets/products/P029-single-cup-bag.png',
    'assets/products/P030-honey.png',
    'assets/products/P031-stainless-pitcher.png',
    'assets/products/P032-milk-can-punch.png',
    'assets/products/P033-tea-filter-cloths.png',
    'assets/products/P034-ingredient-jars.png',
    'assets/products/P035-lemon-squeezer.png',
    'assets/products/P036-milk-frother-machine.png',
    'assets/products/P037-frother-rod.png',
    'assets/products/P038-fruit-squeeze-bottle.png',
    'assets/products/P039-bag-sealing-clip.png',
    'assets/products/P040-small-tea-filter-bag.png',
    'assets/products/P041-smoothie-blender.png',
];

function localProductImage(id, index) {
    const match = String(id || '').match(/^P(\d{3})$/i);
    const byIdIndex = match ? Number(match[1]) - 1 : -1;
    return PRODUCT_IMAGE_BY_INDEX[byIdIndex] || PRODUCT_IMAGE_BY_INDEX[index] || '';
}

function normalizeStatus(status) {
    return String(status || '').trim().toLowerCase();
}

function isProductHidden(status) {
    return ['เธขเธเน€เธฅเธดเธ', 'cancelled', 'canceled', 'inactive', 'disabled', 'เธเธดเธ”'].includes(normalizeStatus(status));
}

function isProductAvailable(status) {
    const value = normalizeStatus(status);
    return value === '' || ['เธเธฃเนเธญเธก', 'active', 'available', 'in stock'].includes(value);
}

function normalizeProducts(raw) {
    return unwrapProductResponse(raw)
        .map((row, index) => {
            const source = unwrapProfileResponse(row);
            const name = pickFirst(source, [
                'Product_Name', 'productName', 'product_name', 'Name', 'name',
            ]);
            const price = Number(pickFirst(source, [
                'Price', 'price', 'Unit_Price', 'unitPrice', 'pricePerUnit',
            ]) || 0);
            const status = pickFirst(source, ['Status', 'status']) || 'active';
            const id = pickFirst(source, [
                'Product_ID', 'productId', 'product_id', 'ID', 'id',
            ]) || `P${String(index + 1).padStart(3, '0')}`;

            return {
                id,
                name,
                unit: pickFirst(source, ['Unit', 'unit', 'UOM', 'uom']) || '-',
                price,
                emoji: pickFirst(source, ['Emoji', 'emoji']) || pickProductEmoji(name, index),
                imageUrl: pickFirst(source, ['Image_URL', 'imageUrl', 'image_url', 'Image', 'image'])
                    || localProductImage(id, index),
                status,
            };
        })
        .filter(product => {
            return product.name && product.price > 0 && !isProductHidden(product.status);
        });
}

function normalizeAddressRecord(item, index, fallbackLabel = '') {
    if (typeof item === 'string') {
        const text = item.trim();
        return text ? { id: `addr-${index + 1}`, label: fallbackLabel || `เธ—เธตเนเธญเธขเธนเน ${index + 1}`, text } : null;
    }

    if (!item || typeof item !== 'object') return null;

    const label = pickFirst(item, [
        'label', 'name', 'branchName', 'branch_name', 'Branch_Name',
        'branch', 'title', 'Address_Label', 'addressLabel',
    ]) || fallbackLabel || `เธ—เธตเนเธญเธขเธนเน ${index + 1}`;

    const text = pickFirst(item, [
        'text', 'address', 'fullAddress', 'full_address', 'Address',
        'Delivery_Address', 'deliveryAddress', 'value',
    ]);
    const contactName = pickFirst(item, ['contactName', 'contact_name', 'Contact_Name', 'contact', 'Contact']);
    const tel = pickFirst(item, [
        'tel', 'phone', 'mobile', 'contactTel', 'contact_tel',
        'Tel', 'TEL', 'Phone', 'Mobile',
    ]);

    if (!text) return null;

    return {
        id: pickFirst(item, ['id', 'addressId', 'address_id', 'Address_ID']) || `addr-${index + 1}`,
        label,
        text,
        contactName: contactName || '',
        tel: tel || '',
    };
}

function normalizeAddressSheetRow(row) {
    if (!row || typeof row !== 'object') return [];

    const branchName = pickFirst(row, [
        'Branch_Name', 'branchName', 'branch_name', 'Branch', 'branch',
        'Display_Name', 'displayName', 'display_name',
    ]);
    const tel = pickFirst(row, [
        'Tel', 'TEL', 'tel', 'Phone', 'phone', 'Mobile', 'mobile',
    ]) || '';
    const defaultContactName = pickFirst(row, ['Contact_Name', 'contactName', 'contact_name', 'Display_Name']) || '';

    return [1, 2, 3, 4, 5]
        .map((num) => {
            const text = pickFirst(row, [
                `Address_${num}`, `address_${num}`, `address${num}`,
                `Address ${num}`, `address ${num}`,
            ]);
            if (!text) return null;

            const label = pickFirst(row, [
                `Address_Label_${num}`, `address_label_${num}`, `Label_${num}`, `label_${num}`,
            ]) || (branchName ? (num === 1 ? branchName : `${branchName} (${num})`) : `เธ—เธตเนเธญเธขเธนเน ${num}`);

            const contactName = pickFirst(row, [`Contact_Name_${num}`, `contact_name_${num}`]) || defaultContactName;
            return { id: `addr-${num}`, label, text, contactName, tel };
        })
        .filter(Boolean);
}

function normalizeProfile(raw) {
    const source = unwrapProfileResponse(raw);
    const rawAddresses = source.addresses || source.Addresses || source.addressList || source.address_list;
    const displayName = pickFirst(source, ['displayName', 'display_name', 'Display_Name', 'name']);
    const uid = pickFirst(source, ['uid', 'lineUid', 'line_uid', 'LINE_UID', 'userId']);

    let addresses = [];
    if (Array.isArray(rawAddresses)) {
        addresses = rawAddresses
            .map((addr, index) => normalizeAddressRecord(addr, index, displayName))
            .filter(Boolean);
    } else if (rawAddresses && typeof rawAddresses === 'object') {
        addresses = normalizeAddressSheetRow(rawAddresses);
        if (addresses.length === 0) {
            const normalized = normalizeAddressRecord(rawAddresses, 0, displayName);
            if (normalized) addresses = [normalized];
        }
    } else if (Array.isArray(raw)) {
        addresses = raw.flatMap((row, rowIndex) => {
            const unwrapped = unwrapProfileResponse(row);
            const fromRow = normalizeAddressSheetRow(unwrapped);
            if (fromRow.length > 0) return fromRow;
            const normalized = normalizeAddressRecord(unwrapped, rowIndex, displayName);
            return normalized ? [normalized] : [];
        });
    } else {
        addresses = normalizeAddressSheetRow(source);
        if (addresses.length === 0) {
            const normalized = normalizeAddressRecord(source, 0, displayName);
            if (normalized) addresses = [normalized];
        }
    }

    const seen = new Set();
    addresses = addresses.filter(addr => {
        const key = `${addr.label}|${addr.text}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return { uid, displayName, addresses };
}

// =====================================================
// ๐–ผ๏ธ RENDER
// =====================================================

/** Render เธฃเธฒเธขเธเธฒเธฃเธ—เธตเนเธญเธขเธนเนเนเธเธซเธเนเธฒ Address */
function renderAddressList() {
    const container = document.getElementById('address-list');

    if (state.addresses.length === 0) {
        container.innerHTML = `
            <div class="no-address-state">
                <span class="no-address-icon">๐“</span>
                <p>เธขเธฑเธเนเธกเนเธกเธตเธ—เธตเนเธญเธขเธนเนเธ—เธตเนเธเธฑเธเธ—เธถเธเนเธงเน<br>เธเธฃเธธเธ“เธฒเน€เธเธดเนเธกเธ—เธตเนเธญเธขเธนเนเนเธซเธกเนเธ”เนเธฒเธเธฅเนเธฒเธ</p>
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
                ${addr.contactName ? `<p class="address-contact">เธเธนเนเธ•เธดเธ”เธ•เนเธญ: ${escapeHtml(addr.contactName)}${addr.tel ? ` ยท ${escapeHtml(addr.tel)}` : ""}</p>` : ""}
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.address-card').forEach(card => {
        const pick = () => selectAddress(card.dataset.addrId);
        card.addEventListener('click', pick);
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') pick(); });
    });
}

/** เน€เธฅเธทเธญเธเธ—เธตเนเธญเธขเธนเน */
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
        const available = isProductAvailable(p.status);
        const statusBadge = available ? '' : '<span class="product-status-badge">เธซเธกเธ”</span>';
        const visual = p.imageUrl
            ? `<img class="product-image" src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.classList.add('is-hidden');this.nextElementSibling.classList.remove('is-hidden');"><span class="product-emoji is-hidden">${p.emoji}</span>`
            : `<span class="product-emoji">${p.emoji}</span>`;
        return `
            <div class="product-card${qty > 0 ? ' in-cart' : ''}${available ? '' : ' is-unavailable'}" id="prod-${p.id}">
                <div class="product-visual">${visual}${statusBadge}</div>
                <div>
                    <p class="product-name">${escapeHtml(p.name)}</p>
                    <p class="product-unit">/ ${escapeHtml(p.unit)}</p>
                </div>
                <p class="product-price">${fmt(p.price)}</p>
                <div class="qty-control">
                    <button class="qty-btn dec" data-pid="${p.id}" aria-label="เธฅเธ”" ${available ? '' : 'disabled'}>โ’</button>
                    <span class="qty-value" id="qty-${p.id}">${qty}</span>
                    <button class="qty-btn inc" data-pid="${p.id}" aria-label="เน€เธเธดเนเธก" ${available ? '' : 'disabled'}>+</button>
                </div>
            </div>`;
    }).join('');

    grid.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => changeQty(btn.dataset.pid, btn.classList.contains('inc') ? 1 : -1));
    });
}

/** เน€เธเธฅเธตเนเธขเธเธเธณเธเธงเธเธชเธดเธเธเนเธฒเนเธเธ•เธฐเธเธฃเนเธฒ */
function changeQty(pid, delta) {
    const product = state.products.find(p => p.id === pid);
    if (!product || !isProductAvailable(product.status)) return;

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

/** Sync เธเนเธญเธกเธนเธฅเธ•เธฐเธเธฃเนเธฒเธ—เธธเธ element */
function syncCartUI() {
    const total = countItems();
    const sub   = calcSubtotal();

    document.getElementById('cart-count').textContent      = total;
    document.getElementById('cart-items-count').textContent = `${total} เธฃเธฒเธขเธเธฒเธฃ`;
    document.getElementById('cart-total-price').textContent  = fmt(sub);

    const bar = document.getElementById('cart-action-bar');
    bar.style.display = total > 0 ? 'block' : 'none';
}

/** Render Summary */
function renderSummary() {
    // Address
    const addrEl = document.getElementById('summary-address-text');
    if (state.selectedAddress) {
        const contactLine = state.selectedAddress.contactName || state.selectedAddress.tel
            ? `<br><span>เธเธนเนเธ•เธดเธ”เธ•เนเธญ: ${escapeHtml(state.selectedAddress.contactName || '-')}${state.selectedAddress.tel ? ` ยท Tel. ${escapeHtml(state.selectedAddress.tel)}` : ''}</span>`
            : '';
        addrEl.innerHTML = `<strong style="color:var(--text-primary)">${escapeHtml(state.selectedAddress.label)}</strong><br>${escapeHtml(state.selectedAddress.text)}${contactLine}`;
    }

    // Items
    const list = document.getElementById('summary-items-list');
    const items = Object.entries(state.cart).filter(([,q]) => q > 0);
    list.innerHTML = items.map(([id, qty]) => {
        const p = state.products.find(x => x.id === id);
        return `
            <div class="summary-item">
                <span class="summary-item-name">${p.emoji} ${escapeHtml(p.name)}</span>
                <span class="summary-item-qty">ร—${qty} ${escapeHtml(p.unit)}</span>
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
// ๐€ INIT
// =====================================================

async function initApp() {
    const loadingText = document.getElementById('loading-text');

    // เนเธชเธ”เธ loading screen เธ—เธฑเธเธ—เธต
    const loadingScreen = document.getElementById('screen-loading');
    loadingScreen.classList.add('is-visible');
    requestAnimationFrame(() => requestAnimationFrame(() => loadingScreen.classList.add('is-active')));

    try {
        // 1๏ธโฃ Init LIFF (เธซเธฃเธทเธญ fallback เน€เธกเธทเนเธญเน€เธเธดเธ”เธเธฒเธ browser)
        loadingText.textContent = 'เธเธณเธฅเธฑเธเน€เธเธทเนเธญเธกเธ•เนเธญ LINE...';

        // ๐” Debug: เธฃเธญ LIFF SDK เนเธซเธฅเธ” (เธเนเธญเธเธเธฑเธ race condition เนเธ LINE WebView)
        loadingText.textContent = 'เธเธณเธฅเธฑเธเนเธซเธฅเธ” LIFF SDK...';
        const liffLoaded = await waitForLiff(10000);
        const isLineUA   = /Line\//i.test(navigator.userAgent);
        console.log(`[DEBUG] LIFF SDK loaded: ${liffLoaded} (after wait)`);
        console.log(`[DEBUG] Is LINE UA: ${isLineUA}`);
        console.log(`[DEBUG] User-Agent: ${navigator.userAgent}`);
        loadingText.textContent = 'เธเธณเธฅเธฑเธเน€เธเธทเนเธญเธกเธ•เนเธญ LINE...';

        if (CONFIG.IS_DEV_MODE) {
            // ๐งช Dev mode: Mock user, Mock data
            console.log('[DEV] Skipping LIFF.init()');
            await delay(500);
            state.user = { uid: MOCK_USER.uid, displayName: MOCK_USER.displayName };

        } else if (!liffLoaded) {
            // ๐ Browser mode: LIFF SDK เนเธซเธฅเธ”เนเธกเนเธชเธณเน€เธฃเนเธเธ เธฒเธขเนเธเน€เธงเธฅเธฒเธ—เธตเนเธเธณเธซเธเธ”
            console.warn(`[BROWSER] LIFF SDK unavailable after wait. UA: ${navigator.userAgent}`);
            const testUid = new URLSearchParams(window.location.search).get('uid') || CONFIG.TEST_UID;
            state.user = { uid: testUid, displayName: `Browser Test (${testUid.slice(-6)})` };
            showBrowserTestBanner(testUid, isLineUA);

        } else {
            // ๐“ฑ LINE mode: LIFF เธเธฃเธดเธ
            loadingText.textContent = 'เธเธณเธฅเธฑเธ Init LIFF...';
            await liff.init({ liffId: CONFIG.LIFF_ID });
            console.log(`[LIFF] isInClient: ${liff.isInClient()}, isLoggedIn: ${liff.isLoggedIn()}`);
            if (!liff.isLoggedIn()) {
                loadingText.textContent = 'เธเธณเธฅเธฑเธ Login LINE...';
                liff.login();
                return;
            }
            const profile = await liff.getProfile();
            state.user = { uid: profile.userId, displayName: profile.displayName };
        }

        // 2๏ธโฃ เธ”เธถเธเธเนเธญเธกเธนเธฅเธชเธฒเธเธฒ (เน€เธฃเธตเธขเธ webhook เธเธฃเธดเธเน€เธชเธกเธญ เธขเธเน€เธงเนเธ Dev mode)
        loadingText.textContent = 'เธเธณเธฅเธฑเธเธ”เธถเธเธเนเธญเธกเธนเธฅเธชเธฒเธเธฒ...';
        const userData = normalizeProfile(await apiGetProfile(state.user.uid));

        // 3๏ธโฃ Set state
        if (userData.displayName) state.user.displayName = userData.displayName;
        state.user.isBranch = Boolean(userData.branchName || userData.isBranch);
        state.addresses = userData.addresses;
        console.log('[PROFILE] normalized addresses:', state.addresses);

        loadingText.textContent = 'เธเธณเธฅเธฑเธเธ”เธถเธเธฃเธฒเธขเธเธฒเธฃเธชเธดเธเธเนเธฒ...';
        try {
            state.products = await apiGetProducts();
            if (state.products.length === 0) throw new Error('Products response is empty');
        } catch (productErr) {
            console.warn('[Products] fallback to mock products:', productErr);
            state.products = MOCK_PRODUCTS;
        }

        // 4๏ธโฃ เธญเธฑเธเน€เธ”เธ• greeting
        document.getElementById('user-greeting').textContent =
            `เธชเธงเธฑเธชเธ”เธตเธเธฃเธฑเธ, ${state.user.displayName}! ๐‘`;

        // 5๏ธโฃ Render เนเธฅเธฐเน€เธเธดเธ”เธซเธเนเธฒเน€เธฅเธทเธญเธเธ—เธตเนเธญเธขเธนเน
        renderAddressList();
        goTo('screen-address');

    } catch (err) {
        console.error('[LIFF Error]', err);
        loadingText.textContent = `เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”: ${err.message}`;
        loadingText.style.color = 'var(--red)';
    }
}

/** เนเธชเธ”เธ banner เนเธเนเธเธงเนเธฒเธเธณเธฅเธฑเธเธ—เธ”เธชเธญเธเธเธฒเธ browser เธซเธฃเธทเธญ LIFF SDK เนเธซเธฅเธ”เนเธกเนเธชเธณเน€เธฃเนเธ */
function showBrowserTestBanner(uid, isLineUA = false) {
    const banner = document.createElement('div');
    banner.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9999',
        'background:#f59e0b', 'color:#1a1a1a', 'font-size:10px',
        'font-weight:600', 'text-align:center', 'padding:4px 8px',
        'letter-spacing:0.3px', 'line-height:1.4',
    ].join(';');
    const context = isLineUA ? '๐“ฑ LINE Browser (SDK fail)' : '๐ External Browser';
    banner.textContent = `BROWSER TEST MODE | ${context} | UID: ${uid}`;
    document.body.prepend(banner);
}

// =====================================================
// ๐ฎ EVENT LISTENERS
// =====================================================

document.addEventListener('DOMContentLoaded', () => {

    // โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
    // SCREEN 1: ADDRESS
    // โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€

    /** เธเธธเนเธก "เน€เธเธดเนเธกเธ—เธตเนเธญเธขเธนเนเนเธซเธกเน" */
    document.getElementById('btn-add-address').addEventListener('click', () => {
        const form = document.getElementById('new-address-form');
        const isHidden = form.classList.toggle('hidden');
        if (!isHidden) document.getElementById('input-branch-name').focus();
    });

    /** เธเธธเนเธก "เธเธฑเธเธ—เธถเธเธ—เธตเนเธญเธขเธนเนเธเธตเน" */
    document.getElementById('btn-confirm-new-address').addEventListener('click', () => {
        const label = document.getElementById('input-branch-name').value.trim();
        const contactName = document.getElementById('input-contact-name').value.trim();
        const tel   = document.getElementById('input-contact-tel').value.trim();
        const text  = document.getElementById('input-address').value.trim();

        if (!label || !contactName || !tel || !text) {
            alert('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเธทเนเธญเธชเธฒเธเธฒ เธเธทเนเธญเธเธนเนเธ•เธดเธ”เธ•เนเธญ เน€เธเธญเธฃเนเธ•เธดเธ”เธ•เนเธญ เนเธฅเธฐเธ—เธตเนเธญเธขเธนเนเนเธซเนเธเธฃเธเธเนเธญเธเธเธฑเธเธ—เธถเธ');
            return;
        }

        const newAddr = { id: `new-${Date.now()}`, label, contactName, tel, text, isNew: true };
        state.addresses.push(newAddr);
        renderAddressList();
        selectAddress(newAddr.id);
        document.getElementById('new-address-form').classList.add('hidden');

        // Clear inputs
        document.getElementById('input-branch-name').value = '';
        document.getElementById('input-contact-name').value = '';
        document.getElementById('input-contact-tel').value = '';
        document.getElementById('input-address').value     = '';
    });

    /** เธเธธเนเธก "เธ–เธฑเธ”เนเธ โ€” เน€เธฅเธทเธญเธเธชเธดเธเธเนเธฒ" */
    document.getElementById('btn-next-to-products').addEventListener('click', () => {
        renderProducts();
        syncCartUI();
        goTo('screen-products');
    });

    // โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
    // SCREEN 2: PRODUCTS
    // โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€

    /** เธขเนเธญเธเธเธฅเธฑเธเนเธเธซเธเนเธฒเธ—เธตเนเธญเธขเธนเน */
    document.getElementById('btn-back-to-address').addEventListener('click', () => {
        goTo('screen-address');
    });

    /** เนเธเธซเธเนเธฒเธชเธฃเธธเธเธเธณเธชเธฑเนเธเธเธทเนเธญ */
    document.getElementById('btn-next-to-summary').addEventListener('click', () => {
        if (countItems() === 0) {
            alert('เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเธชเธดเธเธเนเธฒเธญเธขเนเธฒเธเธเนเธญเธข 1 เธฃเธฒเธขเธเธฒเธฃ');
            return;
        }
        renderSummary();
        goTo('screen-summary');
    });

    // โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
    // SCREEN 3: SUMMARY
    // โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€

    /** เธขเนเธญเธเธเธฅเธฑเธเนเธเธซเธเนเธฒเธชเธดเธเธเนเธฒ */
    document.getElementById('btn-back-to-products').addEventListener('click', () => {
        goTo('screen-products');
    });

    /** เนเธเนเนเธเธ—เธตเนเธญเธขเธนเน (เธเธฒเธเธซเธเนเธฒเธชเธฃเธธเธ) */
    document.getElementById('btn-edit-address').addEventListener('click', () => {
        goTo('screen-address');
    });

    /** เนเธเนเนเธเธฃเธฒเธขเธเธฒเธฃเธชเธดเธเธเนเธฒ (เธเธฒเธเธซเธเนเธฒเธชเธฃเธธเธ) */
    document.getElementById('btn-edit-products').addEventListener('click', () => {
        goTo('screen-products');
    });

    /** เธเธธเนเธก "เธขเธทเธเธขเธฑเธเธเธณเธชเธฑเนเธเธเธทเนเธญ" โ€” Submit */
    document.getElementById('btn-submit-order').addEventListener('click', async () => {
        if (!state.selectedAddress) { alert('เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเธ—เธตเนเธญเธขเธนเนเธเธฑเธ”เธชเนเธ'); return; }
        if (countItems() === 0)     { alert('เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเธชเธดเธเธเนเธฒเธญเธขเนเธฒเธเธเนเธญเธข 1 เธฃเธฒเธขเธเธฒเธฃ'); return; }

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

            // Build payload เธ•เธฒเธก spec เธเธญเธ n8n webhook POST /webhook/submit-order
            const payload = {
                lineUid:         state.user.uid,
                displayName:     state.user.displayName,
                deliveryAddress: {
                    id:    state.selectedAddress.id,
                    label: state.selectedAddress.label,
                    contactName: state.selectedAddress.contactName || '',
                    tel:   state.selectedAddress.tel || '',
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
            alert(`เธชเนเธเธเธณเธชเธฑเนเธเธเธทเนเธญเนเธกเนเธชเธณเน€เธฃเนเธ\n${err.message}\n\nเธเธฃเธธเธ“เธฒเธฅเธญเธเนเธซเธกเนเธญเธตเธเธเธฃเธฑเนเธ`);

            // Reset button
            btn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    // โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
    // SCREEN 4: SUCCESS
    // โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€

    /** เธเธดเธ”เธซเธเนเธฒเธ•เนเธฒเธ LIFF */
    document.getElementById('btn-close-liff').addEventListener('click', () => {
        if (CONFIG.IS_DEV_MODE) {
            // Dev: reload เนเธ—เธ close
            window.location.reload();
            return;
        }
        try {
            liff.closeWindow();
        } catch {
            window.close();
        }
    });

    // โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
    // START
    // โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
    if (!requestedScreen) initApp();
});
