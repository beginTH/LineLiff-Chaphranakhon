> Save point: 22 July 2026. Active modular workflows are in `outputs/modular/`; the V15 monolith is archived in `outputs/archive/v15-monolith/`.

# โครงสร้างระบบสั่งซื้อวัตถุดิบ ชาพระนคร

เอกสารนี้เป็น Technical Reference ของระบบปัจจุบัน ใช้สำหรับพัฒนา LIFF, n8n workflow และ Google Sheets schema หากข้อมูลขัดกับ workflow ที่ active ให้ตรวจ implementation จริงและอัปเดตเอกสารนี้

## 1. System Architecture

```text
LINE User
├── Branch LIFF (branch/)
│   ├── GET get-user-profile
│   ├── GET get-products
│   └── POST submit-order
└── Admin LIFF (admin/)
    ├── GET get-order
    └── POST admin-approve
             ↓
            n8n
             ↓
Google Sheets ─ Google Drive/Sheets API ─ LINE Messaging API
```

### Components

| Component | Responsibility |
|---|---|
| `branch/` | Identity, address/contact selection, catalogue, cart, order submission |
| `admin/` | Order review, quantity reduction, fees, reason, approval |
| n8n | Validation, persistence, authorization, notifications, PDF pipeline |
| Google Sheets | Operational data store |
| Google Drive | Template, copied spreadsheet and exported PDF |
| LINE Messaging API | Push messages to Admin and Branch |

## 2. Google Sheets Schema

ชื่อหัวคอลัมน์ต้องตรงกับ workflow และควรรักษาชนิดข้อมูลให้สม่ำเสมอ

### 2.1 Products

| Field | Type | Description |
|---|---|---|
| `Product_ID` | string | รหัสสินค้า เช่น P001 |
| `Product_Name` | string | ชื่อสินค้า |
| `Unit` | string | หน่วย เช่น ถุง/แพ็ค |
| `Price` | number | ราคาต่อหน่วย |
| `Image_URL` | string | URL รูป หรือใช้รูป local fallback |
| `Status` | string | active/inactive/cancelled |

### 2.2 Users_Addresses

| Field | Description |
|---|---|
| `LINE_UID` | Primary lookup key ของสาขา |
| `Display_Name` | ชื่อผู้ใช้/ผู้สั่งซื้อ |
| `Branch_Name` | ชื่อสาขาหลัก |
| `Opening` | ข้อมูลเวลาเปิด (ถ้ามี) |
| `Tel` | เบอร์โทรหลัก |
| `Contact_Name` | ผู้ติดต่อหลัก |
| `Address_1..5` | ที่อยู่สูงสุด 5 รายการ |
| `Address_Label_1..5` | ชื่อจุดจัดส่งแต่ละรายการ |
| `Contact_Name_1..5` | ผู้ติดต่อของแต่ละที่อยู่ |

### 2.3 Admins

| Field | Description |
|---|---|
| `Admin_ID` | รหัสภายใน |
| `LINE_UID` | LINE UID สำหรับ authorize/push |
| `Display_Name` | ชื่อ Admin |
| `Role` | OWNER, APPROVER, VIEWER, ACCOUNTING |
| `Status` | ACTIVE/INACTIVE |
| `Notify_Order` | TRUE หากต้องรับออเดอร์ใหม่ |

Role ที่อนุมัติได้ควรตรวจแบบ exact match เฉพาะ `OWNER` และ `APPROVER` ไม่ควรใช้ substring match

### 2.4 Orders

| Field | Type | Description |
|---|---|---|
| `Order_ID` | string | PO-YYYYMMDD-XXX |
| `Timestamp` | datetime | เวลาสร้าง |
| `LINE_UID` | string | Branch UID |
| `Delivery_Address` | JSON string | label, contactName, tel, text |
| `Order_Details` | JSON string | displayName, orderItems, note |
| `Subtotal` | number | ยอดสินค้าหลังปรับจำนวน |
| `Shipping_Cost` | number | ค่าขนส่ง |
| `Discount` | number | ส่วนลด |
| `Other_Fee` | number | ค่าใช้จ่ายอื่น |
| `VAT_Amount` | number | VAT 7% |
| `Total_Amount` | number | ยอดรวมสุทธิ |
| `Status` | string | Pending/Approved ฯลฯ |
| `Admin_Note` | string | หมายเหตุ Admin |
| `Adjustment_Reason` | string | เหตุผลลดจำนวน |
| `Approved_By_UID` | string | UID ผู้อนุมัติ |
| `Approved_By` | string | ชื่อผู้อนุมัติ |
| `Approved_At` | datetime | เวลาอนุมัติ |
| `Approval_History` | JSON string | Audit trail ต่อ PO |
| `PO_PDF_File_ID` | string | Google Drive file ID |
| `PO_PDF_URL` | string | URL PDF |

### Order item object

```json
{
  "productId": "P001",
  "productName": "ชาไทยแดง",
  "unit": "ถุง",
  "pricePerUnit": 290,
  "originalQuantity": 7,
  "quantity": 5,
  "lineTotal": 1450
}
```

## 3. API Contract

### 3.1 GET `/webhook/get-user-profile`

Query:

```text
uid=LINE_UID
```

Response หลัก:

```json
{
  "uid": "Uxxx",
  "displayName": "สาขาตัวอย่าง",
  "addresses": [
    {
      "id": "addr-1",
      "label": "สาขาตัวอย่าง",
      "text": "ที่อยู่เต็ม",
      "contactName": "คุณเอ",
      "tel": "0812345678"
    }
  ]
}
```

### 3.2 GET `/webhook/get-products`

Response เป็นรายการสินค้า active พร้อม ID, Name, Unit, Price, Image และ Status

### 3.3 POST `/webhook/submit-order`

```json
{
  "lineUid": "Uxxx",
  "displayName": "ชื่อผู้สั่ง",
  "deliveryAddress": {
    "id": "addr-1",
    "label": "ชื่อสาขา",
    "contactName": "ชื่อผู้ติดต่อ",
    "tel": "0812345678",
    "text": "ที่อยู่เต็ม"
  },
  "isNewAddress": false,
  "orderItems": [],
  "subtotal": 2030,
  "note": "หมายเหตุ",
  "timestamp": "ISO-8601"
}
```

Response:

```json
{
  "success": true,
  "orderId": "PO-YYYYMMDD-XXX",
  "status": "Pending"
}
```

### 3.4 GET `/webhook/get-order`

Query `orderId=...` และตอบข้อมูลสาขา ที่อยู่ สินค้า ยอด สถานะ เหตุผล และ Approval History

> Workflow ปัจจุบันควรเพิ่มการตรวจ Admin UID ใน endpoint นี้ เพราะการรู้ Order ID เพียงอย่างเดียวไม่ควรเพียงพอสำหรับอ่าน Order

### 3.5 POST `/webhook/admin-approve`

Payload สำคัญ:

```json
{
  "orderId": "PO-...",
  "adminUid": "Uadmin",
  "adjustedOrderItems": [],
  "adjustmentReason": "สินค้าคงเหลือไม่พอ",
  "shippingCost": 100,
  "discount": 0,
  "otherFee": 0,
  "adminNote": "",
  "approvedAt": "ISO-8601",
  "branchUid": "Ubranch"
}
```

Server ต้องคำนวณ subtotal/VAT/total จากรายการที่อนุมัติ ไม่ควรเชื่อยอดจาก browser เพียงอย่างเดียว

## 4. n8n Node Flow

### Submit Order

```text
POST /submit-order
→ Build Order Row
→ Read Users For Submit
→ Build Address Update Row
→ Update User Address
→ Save New Order
→ Read Admins For Notify
→ Build Admin LINE Message
→ Send Line Admin02
→ Submit Order Response
```

### Get Order

```text
GET /get-order → Read Orders → Format Order Response
```

### Approve and Delivery Note PDF

```text
POST /admin-approve
→ Read Admins For Approve
→ Authorize Admin Approval
→ Build Approval Row
→ Update Shipping & Status
→ Read Orders For Delivery Note
→ Build Delivery Note Payload
→ Copy Delivery Note Template
→ Merge Delivery Note Template
→ Compact Delivery Note Layout
→ Restore Delivery Note Payload
→ Export Delivery Note PDF (A4 portrait, scale=4)
→ Upload Delivery Note PDF
→ Build PDF URL
→ Update PDF URL
→ Build Branch LINE Message
→ Notify Branch LINE
→ Read Admins For Approval Notify
→ Build Admin Approval LINE Message
→ Notify Admin Approval LINE (continueOnFail)
→ Summarize Admin Approval Notify
→ Approve Response
```

ผู้รับข้อความฝั่ง Admin คือทุกรายการที่ `Status = ACTIVE` และ `Notify_Order = TRUE` รวมผู้ที่กดอนุมัติเอง PDF ถูกอัปโหลดเข้า Google Drive Folder `1FHNyImK-lq254V6frA6XtguAyth9b0kv`

## 5. VAT Calculation

```text
Subtotal = Σ approvedQuantity × pricePerUnit
AmountBeforeVAT = max(0, Subtotal - Discount)
VAT_Amount = AmountBeforeVAT × 0.07
Total_Amount = AmountBeforeVAT + VAT_Amount + Shipping_Cost + Other_Fee
```

ค่าขนส่งและค่าใช้จ่ายอื่นแสดงในใบส่งของ แต่ไม่อยู่ในฐาน VAT

## 6. Template Mapping (A4)

| Data | Cell/Range |
|---|---|
| Buyer | `D14` |
| Branch | `D15` |
| Address | `D16` |
| Contact | `D17` |
| Tel | `G17` |
| PO Number | `J15` |
| Date | `J15` |
| Note | `D18` |
| Sequence | `B22:B38` |
| Product ID | `C22:C38` |
| Product Name | `E22:E38` |
| Quantity | `G22:G38` |
| Unit | `H22:H38` |
| Unit Price | `I22:I38` |
| Line Total | `J22:J38` |
| Summary | `J46:J52` |

Mapping รุ่น `B22:H36` เป็นของเก่าและใช้กับ Template ปัจจุบันไม่ได้

## 7. Status Model

ปัจจุบันใช้หลัก ๆ:

```text
Pending → Approved
```

แนะนำ Production model:

```text
Pending → Approving → Approved → Generating_Document → Completed
```

Failure states: `Document_Failed`, `Notify_Failed`, `Rejected`

## 8. Security and Concurrency

- ตรวจ Admin จากชีตทุกครั้งก่อน Approve
- ใช้ Role exact match
- ตรวจ Order status ก่อน update
- ห้ามอนุมัติซ้ำเมื่อ status ไม่ใช่ Pending
- Google Sheets ไม่มี transaction lock ที่แข็งแรง ควรใช้ Data Store/Database/queue สำหรับ lock `orderId`
- อย่ารับ Subtotal/Total/Admin name จาก client เป็น source of truth
- จำกัดการอ่าน Order เฉพาะ Admin ที่ authorize แล้ว

## 9. External Access Requirements

- LIFF และ Messaging API ควรอยู่ LINE Provider เดียวกัน
- ผู้รับข้อความต้องเป็นเพื่อน OA และไม่ Block
- Google OAuth ของ n8n ต้องเข้าถึง Template และ Folder
- Template ต้องเป็น Google Sheets Native
- เปิด active workflow เพียงตัวเดียวต่อ webhook path