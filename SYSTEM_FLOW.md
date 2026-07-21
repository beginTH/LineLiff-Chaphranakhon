# Flow การทำงานระบบสั่งซื้อวัตถุดิบ ชาพระนคร

เอกสารนี้อธิบายการทำงานของระบบตั้งแต่สาขาสร้างคำสั่งซื้อจนถึงผู้ดูแลอนุมัติ สร้างเอกสาร PDF และแจ้งผลกลับไปยังสาขา

> สถานะเอกสาร: อ้างอิงซอร์สและไฟล์ workflow ใน repository ณ วันที่ 19 กรกฎาคม 2026 โดยก่อนแก้ Production ต้องตรวจ workflow ที่ active ใน n8n อีกครั้ง

## 1. ภาพรวมระบบ

ระบบประกอบด้วย 5 ส่วนหลัก

1. **Branch LIFF** — หน้าสำหรับสาขาเลือกที่อยู่และสั่งสินค้า
2. **Admin LIFF** — หน้าสำหรับผู้อนุมัติตรวจสอบและปรับออเดอร์
3. **n8n** — รับ Webhook และควบคุมขั้นตอนอัตโนมัติทั้งหมด
4. **Google Sheets / Google Drive** — เก็บข้อมูลและเอกสาร
5. **LINE Messaging API** — แจ้งออเดอร์ให้ Admin และแจ้งผลให้สาขา

```text
สาขาเปิด Branch LIFF
        ↓
เลือกที่อยู่ + ผู้ติดต่อ + สินค้า
        ↓
POST /submit-order
        ↓
n8n บันทึก Orders และแจ้ง Admin
        ↓
Admin เปิด Admin LIFF
        ↓
ตรวจสอบ/ลดจำนวน/ใส่เหตุผล/ค่าขนส่ง
        ↓
POST /admin-approve
        ↓
n8n อนุมัติ + สร้าง VAT/PDF + อัปโหลด Drive
        ↓
แจ้งสาขาผ่าน LINE พร้อมลิงก์ PDF
```

---

## 2. Flow ฝั่งสาขา (Branch LIFF)

### 2.1 เปิดแอปและยืนยันตัวตน

1. ผู้ใช้เปิด Branch LIFF ผ่าน LINE
2. LIFF SDK อ่าน `LINE_UID` และชื่อผู้ใช้
3. หน้า Branch เรียก `GET /webhook/get-user-profile?uid=...`
4. n8n อ่านชีต `Users_Addresses`
5. ระบบส่งชื่อสาขา ที่อยู่ ชื่อผู้ติดต่อ และเบอร์โทรกลับมา

### 2.2 เลือกหรือเพิ่มที่อยู่

สาขาสามารถเลือกที่อยู่เดิมหรือเพิ่มที่อยู่ใหม่ โดยข้อมูลที่อยู่ประกอบด้วย

- ชื่อสาขา/จุดจัดส่ง (`label`)
- ชื่อผู้ติดต่อ (`contactName`)
- เบอร์โทร (`tel`)
- ที่อยู่เต็ม (`text`)

หากเป็นที่อยู่ใหม่ ระบบส่ง `isNewAddress: true` เพื่อให้ n8n บันทึกกลับลง `Users_Addresses`

### 2.3 โหลดสินค้า

1. หน้า Branch เรียก `GET /webhook/get-products`
2. n8n อ่านชีต `Products`
3. ส่งเฉพาะข้อมูลสินค้าที่ใช้แสดง เช่น รหัส ชื่อ หน่วย ราคา รูป และสถานะ
4. สาขาเพิ่มหรือลดจำนวนสินค้าในตะกร้า

รายการสินค้าใน Payload มีรูปแบบดังนี้

```json
{
  "productId": "P001",
  "productName": "ชาไทยแดง",
  "unit": "ถุง",
  "pricePerUnit": 290,
  "quantity": 7,
  "lineTotal": 2030
}
```

### 2.4 ส่งคำสั่งซื้อ

เมื่อกดยืนยัน หน้า Branch ส่ง `POST /webhook/submit-order` พร้อมข้อมูล

- LINE UID ของสาขา
- ชื่อผู้สั่งซื้อ
- ที่อยู่และผู้ติดต่อ
- รายการสินค้า
- ยอดค่าวัตถุดิบ
- หมายเหตุ
- วันเวลา

---

## 3. Flow สร้าง Order และแจ้ง Admin

เส้นทางใน n8n คือ

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

### 3.1 สร้าง Order

`Build Order Row` สร้างเลขที่ประมาณ

```text
PO-YYYYMMDD-XXX
```

แล้วบันทึกออเดอร์ลงชีต `Orders` ด้วยสถานะเริ่มต้น `Pending`

### 3.2 บันทึกที่อยู่ใหม่

หาก `isNewAddress = true` ระบบจะหาช่องที่อยู่ว่างและบันทึก

- `Address_1..5`
- `Address_Label_1..5`
- `Contact_Name_1..5`
- `Tel`

### 3.3 เลือก Admin ที่ต้องแจ้ง

n8n อ่านชีต `Admins` และเลือกเฉพาะแถวที่

- มี `LINE_UID`
- `Status = ACTIVE`
- `Notify_Order = TRUE`
- `Role = OWNER` หรือ `APPROVER`

Admin ทุกคนที่ผ่านเงื่อนไขจะได้รับข้อความพร้อม Order ID และลิงก์เปิด Admin LIFF

> หาก `Send Line Admin02` ตอบ `Authorization failed` ต้องแก้ LINE Messaging credential แม้ execution อาจยังแสดงเป็นสีเขียว

---

## 4. Role และสิทธิ์ Admin

ชีต `Admins` ควรมีข้อมูลอย่างน้อย

| Field | ความหมาย |
|---|---|
| `Admin_ID` | รหัส Admin |
| `LINE_UID` | LINE UID ที่ใช้ตรวจตัวตน |
| `Display_Name` | ชื่อผู้ดูแล |
| `Role` | `OWNER`, `APPROVER`, `VIEWER`, `ACCOUNTING` |
| `Status` | `ACTIVE` หรือ `INACTIVE` |
| `Notify_Order` | รับแจ้งออเดอร์ใหม่หรือไม่ |

สิทธิ์ที่แนะนำ

- `OWNER` — ดูและอนุมัติได้ทุกออเดอร์
- `APPROVER` — ดู ปรับลดจำนวน และอนุมัติ
- `VIEWER` — ดูอย่างเดียว
- `ACCOUNTING` — ตรวจสอบเอกสารหลังอนุมัติ

---

## 5. Flow ฝั่ง Admin

### 5.1 เปิดรายละเอียดออเดอร์

Admin เปิดลิงก์ในรูปแบบ

```text
https://liff.line.me/{ADMIN_LIFF_ID}?orderId={ORDER_ID}
```

หน้า Admin เรียก `GET /webhook/get-order?orderId=...` เพื่ออ่านข้อมูลจากชีต `Orders`

### 5.2 ตรวจสอบและปรับจำนวน

Admin สามารถ

- ตรวจสอบสาขา ที่อยู่ และรายการสินค้า
- ลดจำนวนสินค้าได้ตั้งแต่ `0` ถึงจำนวนที่ลูกค้าสั่ง
- ไม่สามารถเพิ่มเกินจำนวนเดิม
- ใส่ค่าขนส่ง ส่วนลด และค่าใช้จ่ายอื่น
- ใส่หมายเหตุ Admin

หากลดสินค้ารายการใด ระบบบังคับให้กรอก `adjustmentReason`

ตัวอย่าง

```text
ลูกค้าสั่ง 5
Admin อนุมัติ 2
สาเหตุ: สินค้าคงเหลือไม่เพียงพอ
```

### 5.3 คำนวณยอดใหม่

```text
ยอดสินค้า = Σ (จำนวนที่อนุมัติ × ราคาต่อหน่วย)
ยอดก่อน VAT = max(0, ยอดสินค้า - ส่วนลด)
VAT = ยอดก่อน VAT × 7%
ยอดรวม = ยอดก่อน VAT + VAT + ค่าขนส่ง + ค่าใช้จ่ายอื่น
```

ค่าขนส่งและค่าใช้จ่ายอื่นแสดงให้ลูกค้าเห็นในเอกสาร แต่ไม่รวมอยู่ในฐาน VAT

### 5.4 ส่งคำขออนุมัติ

หน้า Admin ส่ง `POST /webhook/admin-approve` พร้อม

- Order ID
- Admin UID และชื่อ
- รายการสินค้าหลังปรับจำนวน
- จำนวนเดิมและจำนวนที่อนุมัติ
- เหตุผลการปรับลด
- ค่าขนส่ง ส่วนลด ค่าใช้จ่ายอื่น และยอดใหม่
- หมายเหตุ Admin
- เวลาอนุมัติ

---

## 6. Flow อนุมัติและบันทึกประวัติ

เส้นทางใน n8n คือ

```text
POST /admin-approve
→ Read Admins For Approve
→ Authorize Admin Approval
→ Build Approval Row
→ Update Shipping & Status
```

### 6.1 ตรวจสิทธิ์

`Authorize Admin Approval` ตรวจว่า

- `adminUid` มีอยู่ในชีต `Admins`
- Admin เป็น `ACTIVE`
- Role มีสิทธิ์อนุมัติ

### 6.2 บันทึกผลการอนุมัติ

ระบบอัปเดตใน `Orders`

- `Order_Details` — รายการหลังปรับจำนวน
- `Subtotal`
- `Shipping_Cost`
- `Discount`
- `Other_Fee`
- `VAT_Amount`
- `Total_Amount`
- `Adjustment_Reason`
- `Admin_Note`
- `Approved_By_UID`
- `Approved_By`
- `Approved_At`
- `Approval_History`
- `Status = Approved`

`Approval_History` เป็น JSON audit trail ต่อ PO เช่น

```json
[
  {
    "action": "APPROVED",
    "adminUid": "Uxxxx",
    "adminName": "ผู้อนุมัติ",
    "adminRole": "APPROVER",
    "approvedAt": "2026-07-19T10:00:00.000Z",
    "adjustmentReason": "สินค้าคงเหลือไม่เพียงพอ",
    "items": [
      {
        "productId": "P001",
        "originalQuantity": 5,
        "approvedQuantity": 2
      }
    ]
  }
]
```

---

## 7. Flow สร้างใบส่งของ PDF

หลังอัปเดตออเดอร์ ระบบทำงานต่อดังนี้

```text
Read Orders For Delivery Note
→ Build Delivery Note Payload
→ Copy Delivery Note Template
→ Merge Delivery Note Template
→ Fill Delivery Note Template
→ Restore Delivery Note Payload
→ Export Delivery Note PDF
→ Upload Delivery Note PDF
→ Build PDF URL
→ Update PDF URL
```

### 7.1 Copy Template

`Build Delivery Note Payload` ระบุ

```javascript
templateFileId: '1Iveod-7q7TpIZAkfHGARHgkJdvq96NxxL64i3ubMIr4'
```

Template ต้องเป็น Google Sheets แบบ Native ไม่ใช่ไฟล์ที่ยังมีป้าย `XLSX` และต้องแชร์ให้บัญชี Google OAuth ที่ n8n ใช้เป็น `Editor`

### 7.2 Mapping Template A4 ปัจจุบัน

| ข้อมูล | Cell/Range |
|---|---|
| ชื่อผู้สั่งซื้อ | `D14` |
| ชื่อสาขา | `D15` |
| ที่อยู่ | `D16` |
| ผู้ติดต่อ | `D17` |
| เบอร์โทร | `G17` |
| เลขที่เอกสาร | `J14` |
| วันที่ | `J15` |
| หมายเหตุ | `D18` |
| ลำดับ | `B22:B45` |
| รหัสสินค้า | `C22:C45` |
| ชื่อสินค้า | `E22:E45` |
| จำนวน | `G22:G45` |
| หน่วย | `H22:H45` |
| ราคาต่อหน่วย | `I22:I45` |
| จำนวนเงิน | `J22:J45` |
| ค่าวัตถุดิบรวม | `J46` |
| ส่วนลด | `J47` |
| ยอดก่อน VAT | `J48` |
| VAT 7% | `J49` |
| ค่าขนส่ง/ค่าใช้จ่ายอื่น (ไม่คิด VAT) | `J50` |
| ยอดรวมทั้งสิ้น | `J52` |

> ห้ามใช้ mapping รุ่นเก่า `C15:C19`, `B22:H36` หรือ `H37:H43` เพราะข้อมูลจะเลื่อนไปผิดคอลัมน์

### 7.3 แบ่งหน้า Export และจัดเก็บ

1. แบ่งสินค้าเป็นชุดละ 24 รายการ; ถ้าเกินให้สร้างสำเนา Template และ PDF เพิ่มตามจำนวนหน้า
3. ยุบแถวว่าง 11–13 และแถวคั่น 21 ในสำเนา Template
5. อัปโหลด PDF ไป Google Drive
6. รวม File ID/URL ทุกหน้าแล้วบันทึก `PO_PDF_File_ID` และ `PO_PDF_URL` กลับลง `Orders`

---

## 8. แจ้งผลกลับสาขาและ Adminและ Admin

เส้นทางสุดท้ายคือ

```text
Build Branch LINE Message
→ Notify Branch LINE
→ Read Admins For Approval Notify
→ Build Admin Approval LINE Message
→ Notify Admin Approval LINE
→ Summarize Admin Approval Notify
→ Approve Response
```

สาขาจะได้รับข้อความว่าออเดอร์ได้รับอนุมัติ พร้อม

- Order ID
- ชื่อสาขา
- ยอดรวมสุทธิ
- ลิงก์เปิด PDF

สาขาต้องเพิ่ม LINE Official Account เป็นเพื่อน และ Branch LIFF กับ Messaging API ควรอยู่ใน LINE Provider เดียวกัน

หลังส่งให้สาขา ระบบจะอ่านชีต `Admins` และแจ้ง Admin ทุกคนที่ `Status = ACTIVE` และ `Notify_Order = TRUE` รวมผู้อนุมัติ ข้อความประกอบด้วยผู้อนุมัติ รายการที่ปรับลด เหตุผล ยอดต่าง ๆ และลิงก์ใบส่งของ การส่งแต่ละคนตั้ง `continueOnFail` และสรุปผลไว้ใน `adminNotification` ของ Approve Response

ไฟล์ PDF ถูกจัดเก็บใน Google Drive Folder `ใบส่งของ` (`1FHNyImK-lq254V6frA6XtguAyth9b0kv`)

---

## 9. ข้อจำกัด Production ปัจจุบัน

- มี workflow รวมความสามารถล่าสุดที่ `outputs/n8n_workflow_chaphranakhon_delivery_note_24_items.json` แต่ยังต้อง Import และทดสอบใน n8n ก่อนเปิด Production
- ต้องเปิด active เพียง workflow เดียวต่อ webhook path เพื่อป้องกันการทำงานซ้ำหรือเรียกเวอร์ชันผิด
- การป้องกัน Approve ซ้ำแบบ transaction/atomic ยังไม่สมบูรณ์ จึงต้องทดสอบกรณี Admin หลายคนอนุมัติพร้อมกัน
- `GET /get-order` ต้องเพิ่มการตรวจสิทธิ์ Admin จาก LINE UID ฝั่ง server ก่อนถือว่าพร้อม Production
- CSV Export และ Email notification ยังไม่ได้ implement

---

## 10. สถานะ Order

สถานะขั้นต่ำที่ระบบปัจจุบันใช้

```text
Pending → Approved
```

สถานะที่แนะนำสำหรับระบบ Production

```text
Pending
→ Approving
→ Approved
→ Generating_Document
→ Completed
```

สถานะผิดพลาดที่แนะนำ

- `Document_Failed`
- `Notify_Failed`
- `Rejected`

ควรตรวจ Status ล่าสุดก่อนอนุมัติเพื่อป้องกัน Admin หลายคนอนุมัติ PO เดียวกันซ้ำ

---

## 11. โครงสร้าง Google Sheets ที่สำคัญ

### Products

```text
Product_ID, Product_Name, Unit, Price, Image_URL, Status
```

### Users_Addresses

```text
LINE_UID, Display_Name, Branch_Name, Tel,
Address_1..5, Address_Label_1..5, Contact_Name_1..5
```

### Admins

```text
Admin_ID, LINE_UID, Display_Name, Role, Status, Notify_Order
```

### Orders

```text
Order_ID, Timestamp, LINE_UID, Delivery_Address, Order_Details,
Subtotal, Shipping_Cost, Discount, Other_Fee, VAT_Amount, Total_Amount,
Status, Admin_Note, Adjustment_Reason,
Approved_By_UID, Approved_By, Approved_At, Approval_History,
PO_PDF_File_ID, PO_PDF_URL
```

---

## 12. Webhook ทั้งหมด

| Method | Endpoint | หน้าที่ |
|---|---|---|
| GET | `/webhook/get-user-profile` | อ่านข้อมูลสาขาและที่อยู่ |
| GET | `/webhook/get-products` | อ่านรายการสินค้า |
| POST | `/webhook/submit-order` | สร้าง Order และแจ้ง Admin |
| GET | `/webhook/get-order` | อ่านรายละเอียด Order สำหรับ Admin |
| POST | `/webhook/admin-approve` | ตรวจสิทธิ์ อนุมัติ สร้าง PDF และแจ้งสาขา |

---

## 13. Checklist ก่อนใช้งาน Production

- เปิดใช้งาน workflow เพียงตัวเดียว เพื่อป้องกัน Webhook ซ้ำ
- ใช้ workflow ที่มี mapping Template `B:J` รุ่นล่าสุด
- Template เป็น Google Sheets Native และแชร์ให้ n8n OAuth account
- Folder ปลายทางแชร์ให้ n8n OAuth account เป็น Editor
- Google Sheets มีคอลัมน์ใหม่ครบ
- LINE credential ใช้ Channel Access Token ที่ยังใช้งานได้
- Admin เพิ่ม LINE OA เป็นเพื่อนและไม่ Block
- Branch/Admin LIFF ID ถูกต้อง
- `IS_DEV_MODE = false`
- ทดสอบ Order ใหม่ตั้งแต่ต้นจนได้รับ LINE และเปิด PDF ได้
- ตรวจป้องกัน Approve ซ้ำก่อนใช้งานหลาย Admin พร้อมกัน

---

## 14. ไฟล์ Workflow ที่เกี่ยวข้อง

- `outputs/n8n_workflow_current_template_mapping_fixed.json` — แก้ mapping Template จาก workflow ที่ใช้งานจริง
- `outputs/n8n_workflow_chaphranakhon_admin_adjustment_history.json` — รองรับปรับจำนวน เหตุผล และ Approval History
- outputs/n8n_workflow_chaphranakhon_vat_fields_fixed.json — แก้ field และสูตรที่ใช้สร้างเอกสาร VAT
- `outputs/n8n_workflow_chaphranakhon_delivery_note_24_items.json` — workflow ใบส่งของ 24 รายการต่อ PDF พร้อมแบ่งหน้าต่อเนื่อง สูตร VAT ไม่รวมค่าขนส่ง และรวม Admin Adjustment/Approval History

สำหรับ Production ควรรวมความสามารถทั้งสองส่วนไว้ใน workflow เดียว และเปิดใช้งานเพียง workflow เดียวเท่านั้น

## Delivery Note V4 FONT10 (2026-07-19)

The active import candidate is `outputs/n8n_workflow_chaphranakhon_delivery_note_v4_font10_clean_import.json`. The approval flow compacts the Google Sheet layout before filling data, uses 10pt item text with 17px item rows, exports A4 portrait at scale 2, and supports 24 items per PDF page. Import this as a new n8n workflow and keep earlier workflows inactive to avoid duplicate webhook paths.

## Delivery Note V5 NEW TEMPLATE (2026-07-19)

Import candidate: `outputs/n8n_workflow_chaphranakhon_delivery_note_v5_new_template_clean_import.json`. Google Template File ID is `16hyVHs6HfqyZpj8zriDl_cMbq3f0bnFMLjLjuc4sZxg` and Sheet ID is `906132224`. The Google OAuth account used by n8n must have Editor access to both the template and destination folder. The document keeps 10pt item text, 17px item rows, 24 items per page, and A4 portrait scale 2.

## Delivery Note V6 ACTUAL SIZE (2026-07-19)

Import candidate: `outputs/n8n_workflow_chaphranakhon_delivery_note_v6_actual_size_zero_margins_clean_import.json`. PDF export uses A4 portrait at `scale=1` with top, bottom, left, and right margins set to `0`. Item text remains 10pt and each document page supports up to 24 items. Physical printers may still impose their own non-printable margin.

## Delivery Note V7 20 ITEMS FIT A4 (2026-07-19)

Import candidate: `outputs/n8n_workflow_chaphranakhon_delivery_note_v7_20_items_fit_a4_clean_import.json`. The PDF diagnosis showed horizontal overflow at scale 1: the right-side document number, amount column, and totals moved to page 2. V7 sets explicit A:J column widths totaling 717px, limits each document page to 20 product rows (B22:J41), hides unused template rows 42:45, and retains A4 portrait, scale 1, zero margins, and 10pt item text.

## Delivery Note V8 SIGNATURE SPACE (2026-07-19)

Import candidate: `outputs/n8n_workflow_chaphranakhon_delivery_note_v8_20_items_signature_space_clean_import.json`. V7 compacted all footer rows to 18px, clipping the multi-line receiver and deliverer blocks. V8 keeps 20 item rows but sets row 53 to 24px, row 54 to 4px, rows 55-57 to 25px each, row 58 to 4px, and row 59 to 18px.

## Delivery Note V9 HIDE ZERO QUANTITY (2026-07-19)

Import candidate: `outputs/n8n_workflow_chaphranakhon_delivery_note_v9_hide_zero_quantity_clean_import.json`. Before pagination and template fill, the Delivery Note filters its order-item list to approved quantities greater than zero. Items reduced to zero by an admin are not printed. The pricing summary still uses the approved order totals. If every item is reduced to zero, one Delivery Note is still generated with an empty product section.

## Payment proof and branch history V10 (2026-07-20)

The existing Branch LIFF routes ?screen=history to the order-history screen and ?screen=payment-proof to the proof-upload screen. GET /get-order-history returns only the caller's orders by LINE UID. POST /submit-payment-proof accepts JPG/PNG/WEBP proof images up to 5MB, checks ownership plus approved order status, uploads to the configured Drive folder, and updates payment columns in Orders. PO order IDs remain unchanged.
