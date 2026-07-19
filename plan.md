# Roadmap ระบบสั่งซื้อวัตถุดิบ ชาพระนคร

เอกสารนี้ติดตามสถานะการพัฒนาปัจจุบัน ไม่ใช่ specification หลักของ Flow หรือ Schema ให้ดู `SYSTEM_FLOW.md` และ `structure.md` ประกอบ

## 1. สถานะภาพรวม

| Area | Status | หมายเหตุ |
|   |   |   |
| Branch LIFF | ใช้งานได้ | ที่อยู่ 5 รายการ, contactName, catalogue, cart, submit |
| Admin LIFF | ใช้งานได้/กำลังเชื่อม workflow | ลดจำนวน เหตุผล ค่าขนส่ง VAT |
| Core n8n Webhooks | ใช้งานได้ | มี 5 endpoints |
| Admin notification | ใช้งานได้ | ขึ้นกับ LINE credential และ OA friendship |
| PDF pipeline | ใช้งานได้หลังตั้งค่า | ต้องใช้ Native Google Sheets Template และ mapping ล่าสุด |
| Approval History | มี implementation รุ่นใหม่ | ต้องใช้ workflow/schema รุ่นที่รองรับ |
| Duplicate approval protection | ยังไม่สมบูรณ์ | Google Sheets ไม่มี transaction lock |
| CSV/Email accounting | ยังไม่ได้ทำ | เป็นงานอนาคต |

## 2. งานที่เสร็จแล้ว

### Foundation

  [x] LINE Login/LIFF สำหรับ Branch และ Admin
  [x] n8n instance และ production webhook URL
  [x] Google Sheets สำหรับ Products, Users_Addresses, Admins และ Orders
  [x] LINE Messaging integration
  [x] Google Drive/Sheets API สำหรับเอกสาร

### Branch LIFF

  [x] อ่าน LINE Profile
  [x] โหลดที่อยู่เดิมสูงสุด 5 รายการ
  [x] เพิ่มชื่อสาขา contactName เบอร์โทร และที่อยู่
  [x] โหลดสินค้าและสถานะ
  [x] ตะกร้าและคำนวณ subtotal
  [x] ส่ง orderItems พร้อม Product_ID/Name/Unit/Price/Quantity/LineTotal
  [x] ส่ง Order ไป n8n

### Admin LIFF

  [x] อ่าน `orderId` จาก URL
  [x] แสดงรายละเอียด Order
  [x] กรอกค่าขนส่ง ส่วนลด และค่าใช้จ่ายอื่น
  [x] ลดจำนวนสินค้าโดยไม่เพิ่มเกินจำนวนเดิม
  [x] บังคับเหตุผลเมื่อปรับลด
  [x] คำนวณ VAT 7% จากค่าสินค้าหลังหักส่วนลด และแยกค่าขนส่งออกจากฐาน VAT
  [x] ส่ง adjustedOrderItems และ approvalHistory

### n8n and Documents

- [x] GET get user profile
- [x] GET get products
- [x] POST submit order
- [x] GET get order
- [x] POST admin approve
- [x] อ่าน Admins ตาม Role/Status/Notify_Order
- [x] แจ้ง Admin หลายคน
- [x] ตรวจสิทธิ์ Admin ตอน Approve
- [x] สร้าง Template ใบส่งของ A4 รองรับ 24 รายการต่อ PDF พร้อมราคาและ VAT

- [x] เตรียม workflow Copy/Fill/Export/Upload ใบส่งของ PDF
- [x] แจ้งสาขาพร้อม PDF URL
- [x] จัดเก็บใบส่งของ PDF ใน Google Drive Folder `ใบส่งของ`
- [x] แจ้งผลอนุมัติให้ Admin ทุกคนที่ ACTIVE/Notify_Order รวมผู้อนุมัติ
- [x] สรุปผลสำเร็จ/ข้อผิดพลาดการส่งราย Admin โดยไม่หยุดทั้ง workflow
- [x] สร้าง Template A4 หน้าเดียว
- [x] แก้ mapping Template เป็น B:J

## 3. งานเร่งด่วนก่อน Production ที่เสถียร

### P0 — Workflow consolidation

  [ ] รวม document mapping และ Admin adjustment/history เป็น workflow เดียว
  [ ] ตั้งชื่อไฟล์ Production ให้ชัดเจน เช่น `n8n_workflow_production.json`
  [ ] เปิด active เพียง workflow เดียว
  [ ] Archive/Delete workflow รุ่นทดสอบใน n8n หลังยืนยัน
  [ ] Export active workflow ล่าสุดกลับเข้า repository ทุกครั้ง

### P0 — Duplicate approval protection

  [ ] อ่าน Status ล่าสุดก่อน update
  [ ] อนุญาต approve เฉพาะ `Pending`
  [ ] เปลี่ยนเป็น `Approving` ก่อนเริ่ม document pipeline
  [ ] ทำ lock ต่อ `orderId` ด้วย n8n Data Store, database หรือ queue
  [ ] ตอบ `409 Already Approved` พร้อมชื่อและเวลาให้ Admin คนถัดไป

### P0 — Server side trust

  [ ] อ่านราคาสินค้าและ subtotal จาก server/Sheets ไม่เชื่อค่าจาก browser
  [ ] ใช้ชื่อ/Role Admin จากชีต ไม่ใช้ `adminName` จาก request
  [ ] ตรวจ `adjustedQuantity <= originalQuantity` ใน n8n
  [ ] ปฏิเสธ quantity ติดลบหรือไม่เป็นจำนวนเต็ม

### P1 — Authorization

  [ ] เพิ่ม `adminUid` ใน GET get order
  [ ] ตรวจ Admin Active/Role ก่อนส่งรายละเอียด Order
  [ ] เปลี่ยน Role check เป็น exact match
  [ ] แยก Role ที่ดูได้กับ Role ที่อนุมัติได้

### P1 — Error handling

  [ ] แยก `Approved` ออกจาก `Completed`
  [ ] เพิ่ม `Generating_Document`, `Document_Failed`, `Notify_Failed`
  [ ] ทำ retry สำหรับ LINE/Drive/Sheets
  [ ] อย่าให้ notification failure ทำ submit order ล้มเหลวโดยไม่มีสถานะอธิบาย
  [ ] บันทึก error และ execution ID ใน Orders/Log sheet

## 4. งานด้านข้อมูลและเอกสาร

  [ ] ตรวจหัวคอลัมน์ Production Sheets ให้ตรง `structure.md`
  [ ] เพิ่ม Data Validation ให้ Role/Status/Notify_Order
  [ ] กำหนดชนิดตัวเลขและวันที่สม่ำเสมอ
  [ ] ทดสอบ Template กับสินค้า 1, 5, 15, 24 และมากกว่า 24 รายการผ่าน n8n/Google Sheets จริง
  [x] แบ่งสินค้าเกิน 24 รายการเป็น PDF หน้าต่อเนื่องและรวมลิงก์ก่อนแจ้งผล
  [ ] ตรวจสิทธิ์ Native Google Sheets Template และ Folder
  [ ] ลบสำเนา spreadsheet ชั่วคราวเมื่อไม่ต้องเก็บ
  [ ] กำหนด retention policy ของ PDF/PO

## 5. Testing Plan

### Frontend

  [ ] Branch LIFF ใน LINE iOS/Android
  [ ] ที่อยู่เดิม/ใหม่พร้อม contactName
  [ ] สินค้า inactive และรูป fallback
  [ ] Admin ลดจำนวนเป็น 0/บางส่วน/เท่าเดิม
  [ ] เหตุผลบังคับเฉพาะเมื่อมีการลด
  [ ] ป้องกันกรอกจำนวนเกินต้นฉบับ

### End to End

  [ ] Submit Order แล้ว Admin ทุกคนที่ควรได้รับข้อความได้รับจริง
  [ ] Admin ที่ไม่มีสิทธิ์ Approve ไม่ได้
  [ ] ยอดใน Admin, Orders และ PDF เท่ากัน
  [ ] VAT ไม่รวมค่าขนส่งและค่าใช้จ่ายอื่น
  [ ] PDF แต่ละไฟล์อยู่ A4 หน้าเดียว ไม่เกิน 24 รายการ และ field ไม่เลื่อน
  [ ] สาขาได้รับ LINE และเปิด PDF ได้
  [ ] ทดสอบ Admin 2 คนกดพร้อมกัน

### Regression

  [ ] Syntax check ของ `branch/app.js` และ `admin/app.js`
  [ ] Parse Code nodes ทั้งหมดใน workflow
  [ ] ตรวจ `git diff   check`
  [ ] ตรวจว่าไม่มี token/credential ใน repository

## 6. งานอนาคต

  [ ] CSV สำหรับระบบบัญชี
  [ ] Email ส่งเอกสารให้ฝ่ายบัญชี
  [ ] Order dashboard/search/history
  [ ] Reject/Cancel workflow
  [ ] Partial fulfillment หลายรอบ
  [ ] Inventory deduction
  [ ] Automated tests/CI
  [ ] Configuration แยกจาก source code

## 7. Definition of Done

งานหนึ่งถือว่าเสร็จเมื่อ

1. Implementation และ workflow ทำงานจริง
2. มี validation/error state
3. ทดสอบ End to End แล้ว
4. Schema/credential/deploy steps ถูกบันทึก
5. อัปเดต README, SYSTEM_FLOW, structure และ plan ที่เกี่ยวข้อง
6. Export workflow ที่ active กลับเข้า repository
7. ไม่มี workflow webhook path ซ้ำ active อยู่

## 8. ลำดับแนะนำสำหรับ Sprint ถัดไป

1. รวม workflow Production ให้เหลือไฟล์เดียว
2. เพิ่ม lock และตรวจ Status ป้องกัน Approve ซ้ำ
3. ทำ server side recalculation/validation
4. ป้องกัน GET order ด้วย Admin authorization
5. เพิ่มสถานะและ error handling
6. ทำ E2E test matrix
7. จึงเริ่ม CSV/Email หรือ dashboard