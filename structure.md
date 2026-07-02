# โครงสร้างระบบสั่งซื้อวัตถุดิบ (System Structure) - ชาพระนคร

## 1. สถาปัตยกรรมระบบ (System Architecture & Tech Stack)
- **Frontend (หน้าจอใช้งาน):** LINE LIFF App (เปิดผ่าน LINE ไม่ต้องลงแอปเพิ่ม)
- **Backend / Orchestrator:** n8n (ตัวกลางเชื่อมต่อ ดึงข้อมูล ทำ Automation ทั้งหมด)
- **Database (ฐานข้อมูล):** Google Sheets (ใช้งานง่าย ยืดหยุ่น แอดมินจัดการง่าย)
- **Document Generator (ระบบออกเอกสาร):** Google Docs Template (แปลงเป็น PDF)
- **Messaging (ระบบแจ้งเตือน):** LINE Messaging API (แจ้งเตือนสาขา และ แอดมิน)
- **Email Service:** Gmail หรือ SMTP (ผ่าน n8n Node สำหรับส่งเอกสารให้ฝ่ายบัญชี)

---

## 2. โครงสร้างฐานข้อมูล (Database Design - Google Sheets)

แบ่งออกเป็น 3 แผ่นงาน (Sheets) ดังนี้:

### Sheet 1: Products (แคตตาล็อกวัตถุดิบ)
ทำหน้าที่เก็บข้อมูลสินค้า เพื่อให้หน้า LIFF ดึงไปแสดงผลให้ลูกค้าเลือก
- **Product_ID** (รหัสวัตถุดิบ เช่น RM001)
- **Product_Name** (ชื่อวัตถุดิบ)
- **Price** (ราคาต่อหน่วย)
- **Image_URL** (ลิงก์รูปภาพวัตถุดิบ)
- **Status** (สถานะการขาย: เปิด/ปิด)

### Sheet 2: Users_Addresses (ข้อมูลสาขาและที่อยู่จัดส่ง)
ทำหน้าที่เก็บที่อยู่ของแต่ละสาขา โดยอิงตาม LINE UID เพื่อให้ลูกค้าไม่ต้องพิมพ์ใหม่ทุกครั้ง
- **LINE_UID** (รหัสผู้ใช้ LINE - **Primary Key**)
- **Display_Name** (ชื่อไลน์ของลูกค้า)
- **Branch_Name** (ชื่อสาขาหลัก)
- **Address_1** (ที่อยู่จัดส่งที่ 1)
- **Address_2** (ที่อยู่จัดส่งที่ 2)
- **Address_3** (ที่อยู่จัดส่งที่ 3)

### Sheet 3: Orders (ข้อมูลคำสั่งซื้อ)
ทำหน้าที่เก็บออเดอร์ทั้งหมด สถานะ และค่าขนส่ง
- **Order_ID** (รหัสคำสั่งซื้อ เช่น PO-20231001-001)
- **Timestamp** (วันเวลาที่ทำรายการ)
- **LINE_UID** (รหัส LINE ของสาขาที่สั่งซื้อ)
- **Delivery_Address** (ที่อยู่ที่เลือกใช้สำหรับจัดส่ง)
- **Order_Details** (รายละเอียดสินค้าที่สั่ง - เก็บเป็น JSON หรือข้อความยาว)
- **Subtotal** (ยอดรวมค่าวัตถุดิบ)
- **Shipping_Cost** (ค่าขนส่ง - *รอแอดมินมากรอกในภายหลัง*)
- **Total_Amount** (ยอดรวมสุทธิ)
- **Status** (สถานะคำสั่งซื้อ เช่น Pending, Approved, Completed)

---

## 3. โครงสร้างการเชื่อมต่อ Webhook ของ n8n

เพื่อจัดการการไหลของข้อมูลระหว่าง LIFF Frontend และ Google Sheets จะต้องสร้าง API Endpoints ผ่าน n8n ดังนี้:

### 1. `GET /webhook/get-user-profile`
- **หน้าที่:** หน้า LIFF จะเรียก API นี้ตอนโหลดเว็บ โดยแนบ `LINE_UID` มาด้วย
- **Process:** n8n ค้นหา (Lookup) `LINE_UID` ในชีท `Users_Addresses`
- **Response:** ส่งข้อมูลที่อยู่ (Address 1, 2, 3) คืนไปให้เว็บ LIFF นำไปทำเป็นเมนูตัวเลือก (Dropdown) ให้ลูกค้า

### 2. `POST /webhook/submit-order`
- **หน้าที่:** รับข้อมูลตอนลูกค้ากด Submit สั่งซื้อใน LIFF
- **Process:** 1. บันทึกข้อมูลคำสั่งซื้อลงชีท `Orders`
  2. *เช็คเงื่อนไข:* หากใน Payload ระบุว่า "เป็นที่อยู่ใหม่" n8n จะทำการอัปเดต (Update Row) ที่อยู่ใหม่นั้นลงในชีท `Users_Addresses` ตามช่องที่ว่างอยู่
  3. ยิง LINE Flex Message แจ้งเตือนแอดมินว่ามีออเดอร์ใหม่ พร้อมแนบปุ่มลัดไปยังหน้าประเมินค่าขนส่ง
- **Response:** Success Message กลับไปที่ LIFF ปิดหน้าต่าง

### 3. `POST /webhook/admin-approve`
- **หน้าที่:** รับข้อมูลเมื่อแอดมินกรอกค่าขนส่งและกดอนุมัติออเดอร์ผ่าน LIFF ฝั่งแอดมิน
- **Process:**
  1. ค้นหา `Order_ID` ในชีท `Orders` และอัปเดตช่อง `Shipping_Cost`, `Total_Amount` และเปลี่ยน `Status` เป็น Approved
  2. ทริกเกอร์ระบบออกเอกสาร (Google Docs -> PDF และ Spreadsheet -> CSV)
  3. ทริกเกอร์ระบบส่งอีเมล (Send Email) ไปยังฝ่ายบัญชี พร้อมแนบไฟล์ PDF/CSV
  4. ส่งข้อความ LINE ยืนยันยอดรวมกลับไปให้สาขา
- **Response:** Success Message แสดงให้แอดมินทราบว่าจบกระบวนการ
