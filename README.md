# 🍵 LineLiff Chaphranakhon

ระบบสั่งซื้อวัตถุดิบผ่าน LINE LIFF สำหรับร้านชาพระนคร ครอบคลุมการเลือกที่อยู่และผู้ติดต่อ การสั่งสินค้า การแจ้งผู้อนุมัติ การปรับจำนวน การคำนวณ VAT การสร้างใบส่งของ PDF และการแจ้งผลกลับสาขา

## เริ่มอ่านโปรเจกต์จากตรงไหน

แนะนำลำดับการอ่านสำหรับผู้ที่เข้ามาพัฒนาต่อ

1. `README.md` — ภาพรวม สถานะ และวิธีเริ่มต้น
2. `SYSTEM_FLOW.md` — Flow ธุรกิจตั้งแต่สาขาสั่งจนได้รับ PDF
3. `structure.md` — Architecture, Schema, Payload และ Webhook
4. `Design.md` — มาตรฐาน UI/UX ก่อนแก้ Branch/Admin
5. `plan.md` — สถานะงาน ความเสี่ยง และ Roadmap
6. ตรวจซอร์สใน `branch/`, `admin/` และ workflow ที่ active ก่อนแก้จริง

### แผนที่เอกสาร

| ไฟล์ | เก็บข้อมูลอะไร | ใช้เมื่อใด |
|   |   |   |
| `README.md` | ภาพรวม โครงสร้าง วิธีตั้งค่า และสถานะ | จุดเริ่มต้นของนักพัฒนาใหม่ |
| `SYSTEM_FLOW.md` | Flow ทั้งระบบ Role/Status/Notify, VAT/PDF และ Checklist | ทำความเข้าใจพฤติกรรมระบบ |
| `structure.md` | Architecture, Google Sheets schema และ API contract | พัฒนา workflow/backend |
| `Design.md` | สี ฟอนต์ component และกติกา UI | แก้หน้า Branch/Admin |
| `plan.md` | งานเสร็จ งานเสี่ยง และงานถัดไป | วางแผนพัฒนารอบใหม่ |

### Source of Truth

หากเอกสารขัดกับระบบ ให้ยึดตามลำดับนี้

1. ซอร์สที่ deploy และ workflow ที่ active
2. `SYSTEM_FLOW.md`
3. `structure.md`
4. `README.md`
5. `plan.md`

หลังเปลี่ยนซอร์ส, Schema หรือ workflow ต้องอัปเดตเอกสารใน PR เดียวกัน

## ภาพรวมการทำงาน

```text
Branch LIFF เลือกที่อยู่/ผู้ติดต่อ/สินค้า
→ POST /submit order
→ n8n บันทึก Orders และแจ้ง Admin
→ Admin LIFF ตรวจสอบและลดจำนวนได้
→ POST /admin approve
→ n8n ตรวจสิทธิ์ คำนวณยอด และบันทึกผู้อนุมัติ
→ Copy Google Sheets Delivery Note Template
→ เติมข้อมูลและ Export PDF
→ อัปโหลด Drive
→ แจ้งสาขาผ่าน LINE พร้อมลิงก์ PDF
```

รายละเอียดอยู่ใน [SYSTEM_FLOW.md](SYSTEM_FLOW.md)

## Tech Stack

| Layer | Technology | หน้าที่ |
|   |   |   |
| Frontend | HTML, CSS, JavaScript | Branch LIFF และ Admin LIFF |
| Identity | LINE LIFF SDK | อ่าน LINE UID/Profile |
| Orchestrator | n8n | Webhook, validation และ automation |
| Database | Google Sheets | Products, Users_Addresses, Admins, Orders |
| Document | Google Sheets Template + Drive API | เติมข้อมูล Export/Upload PDF |
| Messaging | LINE Messaging API | แจ้ง Admin และสาขา |

ระบบปัจจุบันยังไม่มี CSV/Email pipeline ที่ใช้งานจริง

## โครงสร้างโปรเจกต์

```text
├── branch/                 # LIFF สำหรับสาขา
├── admin/                  # LIFF สำหรับผู้อนุมัติ
├── outputs/                # Workflow/Template ที่สร้างเพื่อส่งมอบ
├── scripts/                # สคริปต์ปรับ workflow/template
├── SYSTEM_FLOW.md          # Flow ธุรกิจล่าสุด
├── structure.md            # Architecture และ API/DB schema
├── Design.md               # Design system
├── plan.md                 # Roadmap
└── README.md
```

## ความสามารถปัจจุบัน

### Branch LIFF

- อ่าน LINE UID ผ่าน LIFF
- โหลดที่อยู่เดิมได้สูงสุด 5 ที่อยู่
- เพิ่มชื่อสาขา `contactName` เบอร์โทร และที่อยู่
- โหลดสินค้า/สถานะจาก Google Sheets
- เพิ่มลดจำนวนและคำนวณตะกร้า real time
- ส่ง Order พร้อมสินค้า ราคา หน่วย ผู้ติดต่อ และหมายเหตุ

### Admin LIFF

- เปิด Order จาก `orderId`
- ลดจำนวนได้ แต่เพิ่มเกินจำนวนเดิมไม่ได้
- บังคับเหตุผลเมื่อปรับลด
- กรอกค่าขนส่ง ส่วนลด ค่าใช้จ่ายอื่น และหมายเหตุ
- คำนวณ VAT 7% จากค่าสินค้าหลังหักส่วนลด โดยค่าขนส่ง/ค่าใช้จ่ายอื่นไม่อยู่ในฐาน VAT
- ส่งรายการหลังปรับและข้อมูลผู้อนุมัติไป n8n

### n8n

- อ่าน Profile/ที่อยู่และสินค้า
- สร้าง Order บันทึกที่อยู่ และแจ้ง Admin หลายคน
- กรอง Admin ด้วย Role/Status/Notify_Order
- ตรวจสิทธิ์ผู้อนุมัติ
- บันทึกยอด ผู้อนุมัติ และ Approval History ใน workflow รุ่นที่รองรับ
- สร้างใบส่งของ PDF จาก Google Sheets Template และบันทึกในโฟลเดอร์ Drive `ใบส่งของ`
- แจ้งผลอนุมัติพร้อมลิงก์ PDF ให้สาขาและ Admin ทุกคนที่ `ACTIVE + Notify_Order=TRUE`

> การป้องกัน Admin สองคนกดพร้อมกันยังไม่เป็น transaction ที่สมบูรณ์ ดู `plan.md`

## Webhooks

| Method | Endpoint | หน้าที่ |
|   |   |   |
| GET | `/webhook/get user profile` | อ่านข้อมูลสาขา ที่อยู่ และผู้ติดต่อ |
| GET | `/webhook/get products` | อ่านสินค้า |
| POST | `/webhook/submit order` | สร้าง Order และแจ้ง Admin |
| GET | `/webhook/get order` | อ่าน Order สำหรับ Admin |
| POST | `/webhook/admin approve` | ตรวจสิทธิ์ อนุมัติ สร้าง PDF และแจ้งสาขา |

## Google Sheets

| Sheet | หน้าที่ |
|   |   |
| `Products` | รหัส ชื่อ หน่วย ราคา รูป สถานะ |
| `Users_Addresses` | สาขา ที่อยู่ ผู้ติดต่อ เบอร์โทร |
| `Admins` | Role, Status และ Notify_Order |
| `Orders` | Order ยอด สถานะ ผู้อนุมัติ และ PDF |

Schema ฉบับเต็มอยู่ใน [structure.md](structure.md)

## Workflow และ Template

ใน `outputs/` มีหลายรุ่นจากการแก้ปัญหา ห้ามเปิด active พร้อมกันเพราะ Webhook path ซ้ำ

  `n8n_workflow_current_template_mapping_fixed.json` — mapping Template A4 ถูกต้อง
  `n8n_workflow_chaphranakhon_admin_adjustment_history.json` — ปรับจำนวน เหตุผล และ Approval History
  `outputs/delivery-note-template/Chaphranakhon_Delivery_Note_Template_A4.xlsx` — Template ใบส่งของ A4 รองรับ 24 รายการต่อ PDF; รายการเกินจะสร้าง PDF หน้าต่อเนื่อง

  `vat template a4/Chaphranakhon_VAT_Template_A4.xlsx` — VAT Template เดิม ใช้เป็นต้นแบบการออกแบบ

ก่อน Production ต้องรวมความสามารถที่ต้องการใน workflow เดียว ทดสอบ End to End และเปิด active เพียงตัวเดียว

Template ต้องอัปโหลดเป็น Google Sheets Native, แชร์ให้ Google OAuth ของ n8n เป็น Editor และแทน `REPLACE_WITH_DELIVERY_NOTE_TEMPLATE_FILE_ID` ใน `Build Delivery Note Payload` ด้วย File ID ใหม่

## การตั้งค่าและรัน Local

ค่าหลักอยู่ใน `branch/app.js` และ `admin/app.js`

```javascript
const CONFIG = {
  LIFF_ID: 'YOUR_LIFF_ID',
  N8N_BASE_URL: 'https://your n8n.example',
  IS_DEV_MODE: false,
};
```

```bash
npx serve .   listen 3000
```

```text
http://localhost:3000/branch/
http://localhost:3000/admin/?orderId=PO YYYYMMDD XXX
```

## Checklist ก่อน Production

  Sheets มีหัวคอลัมน์ครบตาม `structure.md`
  LIFF IDs, n8n URL และ LINE credential ถูกต้อง
  Google OAuth เข้าถึง Template/Folder
  Template ใช้ mapping `B:J` รุ่นล่าสุด
  เปิด active workflow เพียงตัวเดียว
  ทดสอบ Branch → Notify Admin → Approve → PDF → Notify Branch
  วางแผนป้องกันอนุมัติพร้อมกันก่อนเพิ่ม Admin จำนวนมาก

## สถานะการพัฒนา

Branch/Admin, Webhook หลัก, LINE notification และ PDF pipeline มี implementation แล้ว งานที่ต้องทำให้แข็งแรงขึ้นอยู่ใน [plan.md](plan.md)

## ผู้พัฒนา

**KitjaR (beginTH)**  
GitHub: [@beginTH](https://github.com/beginTH)

## License

Private — สงวนสิทธิ์สำหรับร้านชาพระนคร