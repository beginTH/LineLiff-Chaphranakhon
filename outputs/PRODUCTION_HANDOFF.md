# Production handoff — Chaphranakhon

## สิ่งที่เตรียมไว้แล้ว

- `n8n_workflow_chaphranakhon_production_credit_bundle_v13_hardened.json` รวม workflow สั่งซื้อ, อนุมัติ, สร้างใบส่งของ/ใบกำกับภาษี, ประวัติออเดอร์ และส่งหลักฐานการโอนเงินไว้ในไฟล์เดียว (ปิดการทำงานไว้เพื่อป้องกัน webhook ซ้ำ)
- เครดิตกำหนด 7 วันหลังอนุมัติ
- รุ่น V13 ตรวจสถานะ Order ล่าสุดจาก Google Sheets ว่าต้องเป็น `Pending`, สร้างยอดจากรายการที่บันทึกไว้ใน Order และตรวจจำนวน/ส่วนลด/เหตุผลการปรับลดก่อนอนุมัติ
- โฟลเดอร์เอกสารใหม่และ Template ID อยู่ใน `outputs/document-templates/GOOGLE_SHEETS_CONFIG.md`
- สินค้ารองรับ `Customer_Type`: `all`, `general`, `branch` โดย Branch เห็นทั้งหมด และลูกค้าทั่วไปเห็นเฉพาะ `all/general`

## คอลัมน์ที่ต้องเพิ่มใน Google Sheet ก่อนเปิดใช้

### Products

เพิ่มคอลัมน์ `Customer_Type` และกำหนดค่าเป็น `all` (ทุกคน), `general` (ลูกค้าทั่วไป), หรือ `branch` (เฉพาะสาขา) หากเว้นว่างระบบถือเป็น `all`.

### Orders

เพิ่มคอลัมน์เหล่านี้ต่อท้ายได้โดยไม่กระทบข้อมูลเดิม:

`Customer_Type`, `Credit_Terms_Days`, `Credit_Due_Date`, `Payment_Status`, `Payment_Proof_File_ID`, `Payment_Proof_URL`, `Payment_Submitted_At`, `Payment_Verified_By_UID`, `Payment_Verified_By`, `Payment_Verified_At`, `Payment_Verification_Note`, `Cancelled_At`, `Cancelled_By_UID`, `Cancellation_Reason`, `PO_PDF_File_ID`, `PO_PDF_URL`, `Delivery_Tax_Invoice_File_ID`, `Delivery_Tax_Invoice_URL`, `Receipt_File_ID`, `Receipt_URL`.

### Admins

เพิ่มคอลัมน์แจ้งเตือนรายบุคคล:

`Notify_New_Order`, `Notify_Order_Approval`, `Notify_Credit_Overdue`, `Notify_Payment_Submitted`, `Notify_Payment_Verification`.

ใช้ค่า `TRUE`/`FALSE`; ระบบจะส่งเฉพาะ Admin ที่ `Status=active` และสิทธิ์ตรงกับงาน.

## ขั้นตอนนำไปใช้งาน

1. Import ไฟล์ production bundle เป็น workflow ใหม่ใน n8n และตรวจ Credential ของ Google/LINE ทุก node.
2. ปิด workflow เก่าที่ใช้ path ซ้ำทั้งหมดก่อนเปิด workflow ใหม่นี้.
3. ตรวจ Template/Folder ID จาก `GOOGLE_SHEETS_CONFIG.md`.
4. เพิ่มคอลัมน์ DB ตามรายการด้านบน แล้วทดสอบด้วย Order ใหม่ 1 รายการ.
5. ตั้ง Schedule รายงานเครดิตค้างชำระเป็น `0 9 * * *` และ timezone `Asia/Bangkok` ใน workflow รายงานประจำวัน.

## ข้อจำกัดที่ต้องทดสอบใน n8n จริง

Google Sheets ไม่มี transaction lock; ควรป้องกันการกดอนุมัติซ้ำด้วยการตรวจ `Status` ล่าสุดก่อน update และทดสอบกรณี Admin สองคนกดพร้อมกัน. ยังไม่ควรเปิดใช้งาน production จนกว่าจะตรวจ execution ของทุกเส้นทาง.
