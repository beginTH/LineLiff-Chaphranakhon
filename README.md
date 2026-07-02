# 🍵 LineLiff-Chaphranakhon

> **ระบบสั่งซื้อวัตถุดิบผ่าน LINE LIFF** สำหรับร้านชาพระนคร  
> สาขาสั่งซื้อวัตถุดิบผ่าน LINE ได้เลย — ไม่ต้องลงแอปเพิ่ม

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![LINE LIFF](https://img.shields.io/badge/LINE_LIFF-06C755?style=flat-square&logo=line&logoColor=white)
![n8n](https://img.shields.io/badge/n8n-EA4B71?style=flat-square&logo=n8n&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google_Sheets-34A853?style=flat-square&logo=google-sheets&logoColor=white)

---

## 📋 ภาพรวมระบบ

ระบบนี้ช่วยให้สาขาของ **ชาพระนคร** สามารถสั่งซื้อวัตถุดิบผ่าน LINE ได้โดยตรง โดยไม่ต้องโทรหรือส่งข้อความแบบ Manual อีกต่อไป ครอบคลุมตั้งแต่การสั่งซื้อ, อนุมัติ, ออกเอกสาร ไปจนถึงแจ้งเตือนทุกฝ่ายอัตโนมัติ

```
สาขา กด LINE  →  LIFF App (สาขา)  →  n8n Webhook  →  Google Sheets
                                          ↓
                               แจ้งแอดมินผ่าน Flex Message
                                          ↓
                         LIFF App (แอดมิน) ใส่ค่าขนส่ง + อนุมัติ
                                          ↓
                     ออก PDF + CSV + ส่ง Email ฝ่ายบัญชี + แจ้งสาขา
```

---

## 🏗️ Tech Stack

| Layer | Technology | หน้าที่ |
|-------|-----------|--------|
| **Frontend** | LINE LIFF (HTML/CSS/JS) | หน้าจอสำหรับสาขาและแอดมิน |
| **Backend / Orchestrator** | n8n | รับ Webhook, ประมวลผล, Automation |
| **Database** | Google Sheets | เก็บข้อมูลสินค้า, ที่อยู่, ออเดอร์ |
| **Document** | Google Docs → PDF | ออกเอกสารใบ PO อัตโนมัติ |
| **Messaging** | LINE Messaging API | แจ้งเตือน Flex Message |
| **Email** | Gmail / SMTP | ส่งเอกสารให้ฝ่ายบัญชี |

---

## 📁 โครงสร้างโปรเจค

```
LineLiff-Chaphranakhon/
│
├── branch/                     # LIFF App สำหรับสาขา (ลูกค้า)
│   ├── index.html              # 5 Screens: Loading → ที่อยู่ → สินค้า → ยืนยัน → Success
│   ├── style.css               # Dark/Gold theme, Mobile-first
│   └── app.js                  # State management + API stubs + LIFF SDK
│
├── admin/                      # LIFF App สำหรับแอดมิน
│   ├── index.html              # 4 States: Loading → รายละเอียด → Approved → Success
│   ├── style.css               # Dark/Purple admin theme
│   └── app.js                  # Order detail + Shipping input + Approve
│
├── plan.md                     # แผนการดำเนินงาน 4 เฟส
├── structure.md                # สถาปัตยกรรมระบบ + DB Schema + Webhooks
├── .gitignore
└── README.md
```

---

## ✨ ฟีเจอร์หลัก

### 🏪 หน้าสาขา (`/branch/`)
- ✅ เชื่อมต่อ LINE LIFF SDK — ดึง UID อัตโนมัติ
- ✅ แสดงที่อยู่จัดส่งที่เคยบันทึกไว้ (สูงสุด 3 ที่อยู่ต่อสาขา)
- ✅ เพิ่มที่อยู่จัดส่งใหม่ได้ในแอป
- ✅ เลือกสินค้าจากแคตตาล็อกวัตถุดิบ พร้อมปุ่ม +/−
- ✅ Cart Summary Bar แสดงยอดรวม Real-time
- ✅ หน้าสรุปคำสั่งซื้อพร้อม Order ID
- ✅ ส่งข้อมูลไปยัง n8n ผ่าน Webhook

### 🛠️ หน้าแอดมิน (`/admin/`)
- ✅ รับ `orderId` จาก URL Query Param (จากปุ่มใน Flex Message)
- ✅ แสดงรายละเอียดออเดอร์ครบถ้วน (สาขา, ที่อยู่, รายการ, ราคา)
- ✅ กรอกค่าขนส่ง — คำนวณยอดรวมแบบ Real-time
- ✅ ป้องกัน Approve ซ้ำ (ตรวจสอบ Status ก่อน)
- ✅ ส่งการอนุมัติไปยัง n8n พร้อม Payload ครบถ้วน
- ✅ แสดงรายการ Auto-task ที่ระบบจะทำหลัง Approve

---

## 🔌 n8n Webhooks

| Endpoint | Method | หน้าที่ |
|----------|--------|--------|
| `/webhook/get-user-profile` | `GET` | ดึงที่อยู่จัดส่งของสาขา → ส่งกลับ LIFF |
| `/webhook/submit-order` | `POST` | บันทึกออเดอร์ + อัปเดตที่อยู่ใหม่ + แจ้งแอดมิน Flex Message |
| `/webhook/get-order` | `GET` | ดึงรายละเอียดออเดอร์ตาม Order ID (สำหรับแอดมิน) |
| `/webhook/admin-approve` | `POST` | อนุมัติออเดอร์ + ออก PDF/CSV + ส่ง Email + แจ้งสาขา |

---

## 🗄️ โครงสร้างฐานข้อมูล (Google Sheets)

**Sheet 1: Products**
| Product_ID | Product_Name | Price | Image_URL | Status |
|-----------|-------------|-------|-----------|--------|

**Sheet 2: Users_Addresses**
| LINE_UID | Display_Name | Branch_Name | Address_1 | Address_2 | Address_3 |
|---------|-------------|------------|----------|----------|----------|

**Sheet 3: Orders**
| Order_ID | Timestamp | LINE_UID | Delivery_Address | Order_Details | Subtotal | Shipping_Cost | Total_Amount | Status |
|---------|----------|---------|----------------|--------------|---------|--------------|-------------|--------|

---

## 🚀 การติดตั้ง & ใช้งาน

### 1. Clone โปรเจค

```bash
git clone https://github.com/beginTH/LineLiff-Chaphranakhon.git
cd LineLiff-Chaphranakhon
```

### 2. ตั้งค่า Config ใน `app.js` (ทั้ง branch และ admin)

```javascript
// branch/app.js และ admin/app.js
const CONFIG = {
    LIFF_ID:      'YOUR_LIFF_ID_HERE',        // จาก LINE Developers Console
    N8N_BASE_URL: 'https://your-n8n.com',     // URL n8n ของคุณ
    IS_DEV_MODE:   false,                     // เปลี่ยนจาก true เป็น false
};
```

### 3. Deploy ขึ้น Hosting

อัปโหลดโฟลเดอร์ทั้งหมดขึ้น Hosting ที่รองรับ **HTTPS** เช่น:
- [Vercel](https://vercel.com) (แนะนำ — ฟรี)
- [Netlify](https://netlify.com)
- GitHub Pages

### 4. ตั้งค่า LIFF บน LINE Developers

1. ไปที่ [LINE Developers Console](https://developers.line.biz)
2. สร้าง LIFF App 2 ตัว:
   - **Branch LIFF** → Endpoint: `https://your-domain.com/branch/`
   - **Admin LIFF** → Endpoint: `https://your-domain.com/admin/`
3. นำ LIFF ID ไปใส่ใน `app.js` ของแต่ละหน้า

### 5. ทดสอบใน Dev Mode (Local)

```bash
# ติดตั้ง serve (ครั้งแรกครั้งเดียว)
npm install -g serve

# รัน Local Server
serve . --listen 3000

# เปิดที่
# http://localhost:3000/branch/       ← หน้าสาขา
# http://localhost:3000/admin/?orderId=PO-20260702-001  ← หน้าแอดมิน
```

> **Dev Mode** (`IS_DEV_MODE: true`) จะใช้ Mock Data แทน API จริง ไม่ต้องเชื่อมต่อ LINE หรือ n8n

---

## 📅 แผนการพัฒนา (4 เฟส)

- [x] **เฟส 1** — เตรียมฐานข้อมูล Google Sheets + LINE Channel + Google Docs Template
- [x] **เฟส 2** — พัฒนา LIFF Frontend (สาขา + แอดมิน) ✅ **เสร็จแล้ว**
- [ ] **เฟส 3** — สร้าง n8n Workflows + เชื่อมต่อ Webhook ทั้งหมด
- [ ] **เฟส 4** — ระบบออกเอกสาร PDF/CSV + ส่ง Email อัตโนมัติ

---

## 👤 ผู้พัฒนา

**KitjaR (beginTH)**  
GitHub: [@beginTH](https://github.com/beginTH)

---

## 📄 License

Private — สงวนสิทธิ์สำหรับร้านชาพระนคร
