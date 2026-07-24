# สมัครบัญชีสาขา — ขั้นตอนติดตั้ง

ไฟล์ที่เกี่ยวข้อง:

- `branch-registration/` คือหน้า LIFF สำหรับผู้สมัคร
- `07_branch_application_registration.json` คือ workflow บันทึกคำขอลงชีต `Branch_Applications`

## 1. นำเข้าและตั้งค่า workflow

1. Import ไฟล์ `07_branch_application_registration.json` ใน n8n
2. เปิด node Google Sheets ทั้ง 2 จุด แล้วกด Refresh หาก n8n แจ้งให้รีเฟรชฟิลด์
3. ยืนยันว่าเลือก Spreadsheet `Chaphranakhon_DB` และ Sheet `Branch_Applications`
4. ที่ node `Append Pending Application` หากยังไม่จับคอลัมน์อัตโนมัติ ให้เลือก **Map Automatically** แล้วกด Refresh; ชื่อฟิลด์ตรงกับหัวคอลัมน์ A:T ที่สร้างไว้แล้ว
5. Publish workflow

Webhook ที่ได้คือ:

`https://n8n.n8n-kokujapan.org/webhook/submit-branch-application`

คำขอที่ส่งเข้ามาจะเริ่มด้วย `Status = Pending` เสมอ และจะไม่เขียนลง `Users_Addresses` ในขั้นนี้

## 2. เผยแพร่หน้า LIFF

อัปโหลดโฟลเดอร์ `branch-registration` ไปยังเว็บไซต์เดียวกับ LIFF เดิม เพื่อให้ URL เป็นตัวอย่าง:

`https://beginth.github.io/<ชื่อ-repository>/branch-registration/`

## 3. สร้าง LIFF ใหม่ใน LINE Developers

สร้าง LIFF app ใหม่ใน Messaging API channel เดียวกัน:

- ชื่อ: `ชาพระนคร - สมัครบัญชีสาขา`
- Endpoint URL: URL ของข้อ 2
- Scope: `profile` และ `openid`

จากนั้นนำ LIFF ID มาแทนข้อความ `REPLACE_WITH_BRANCH_REGISTRATION_LIFF_ID` ใน `branch-registration/app.js` และเผยแพร่ไฟล์อีกครั้ง

## 4. ตั้งค่า Rich Menu

กำหนดพื้นที่ **B = สมัครบัญชีสาขา** ของ Default Rich Menu ให้เป็นประเภท **LIFF** แล้วใส่ LIFF ID ใหม่จากข้อ 3

## การทดสอบ

1. เปิด LIFF จาก LINE ของผู้ใช้จริง
2. กรอกแบบฟอร์มและกดส่ง
3. ตรวจว่าเพิ่ม 1 แถวใน `Branch_Applications` พร้อม LINE UID และ Status `Pending`
4. กดส่งซ้ำด้วย UID เดิม จะเห็นข้อความว่ามีคำขอรอตรวจสอบอยู่ และจะไม่เพิ่มแถวใหม่

หลังทดสอบผ่าน ขั้นตอนต่อไปคือสร้างหน้าจอ Admin เพื่ออนุมัติ/ปฏิเสธ และเมื่ออนุมัติค่อยย้าย/สร้างข้อมูลที่ `Users_Addresses` พร้อมเปลี่ยน Role ใน `Users` เป็น `branch`.
