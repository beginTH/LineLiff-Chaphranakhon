# Save Point — 29 July 2026

## สถานะสรุป

งาน Rich Menu สำหรับผู้ดูแล, ระบบ n8n และหน้า Admin ได้รับการแก้ไขและพัฒนาต่อเรียบร้อยในระดับโค้ดและ Workflow หลัก โดย GitHub branch `main` ถูก push แล้วที่ commit `a0fb30c`.

## สิ่งที่พัฒนาและยืนยันแล้ว

### 1. n8n / Server

- อัปเดต n8n จาก `2.26.8` เป็น `2.32.6` สำเร็จ
- Container ปัจจุบันชื่อ `n8n` ทำงานด้วย image `docker.n8n.io/n8nio/n8n:latest`
- คงข้อมูลเดิมไว้ที่ bind mount `/home/ubuntu/.n8n`
- ตั้งค่าการเก็บ execution เพื่อลดการใช้พื้นที่:
  - เปิด execution pruning
  - เก็บ execution สูงสุด 168 ชั่วโมง
  - เก็บสูงสุด 2,000 รายการ
  - ไม่เก็บ success/manual execution
- ลบ Docker image และ container เก่าที่ไม่ใช้งานแล้ว
- ลบ cache `camoufox` และ `uv` ที่ไม่จำเป็น
- สถานะพื้นที่ดิสก์ล่าสุด: ว่างประมาณ `1.7 GB` (ใช้งาน 91%)

### 2. Admin Rich Menu

- สร้างและอัปโหลด Admin Rich Menu ใหม่สำเร็จ
- Rich Menu ID ที่ใช้งานปัจจุบัน:

  ```text
  richmenu-f2b991c0d0009f560f38ef78b034c606
  ```

- Workflow 15 (`15 - Create, Reset and Link Admin Dashboard Rich Menu`) ทำงานสำเร็จ และเชื่อมเมนูให้ผู้ดูแลแล้ว
- แก้ Workflow 10 (`10 - Assign LINE Rich Menu by Role`) ใน n8n แล้ว:
  - `admin` และ `superadmin` ใช้ Rich Menu ID ใหม่
  - ผู้ใช้ยืนยันว่า Save และ Publish แล้ว
- เตรียม/แก้ไฟล์ Workflow 12 (`12 - Reconcile Role Rich Menus (Admins + Users)`) ให้ใช้ Rich Menu ID ใหม่ เพื่อป้องกันการย้อนกลับไปเมนูเก่าเมื่อรัน reconcile ในอนาคต

### 3. การแก้ LIFF Routing

- พบว่า LIFF คืนค่า `view` หลัง `liff.init()` เท่านั้น
- แก้ `admin/index.html` ให้รอ LIFF initialize ก่อนเลือกปลายทาง
- ส่งต่อ `LINE UID` ไปยังหน้าที่แยก เพื่อให้หน้าใหม่เรียก Admin API ได้โดยไม่ต้อง initialize LIFF ซ้ำใน URL ที่ต่างจาก Endpoint
- Rich Menu 4 ช่องยังเรียก LIFF URL เดิมด้วย `view` แต่หน้า `index.html` จะส่งต่อไปยังหน้าที่ถูกต้อง

### 4. หน้า Admin แยก 4 หน้า ตาม Design.md

สร้างชุด UI กลางสำหรับ Admin ตาม token และหลักการใน `Design.md`:

- `admin/admin-pages.css` — layout/token/component กลาง
- `admin/admin-page.js` — การยืนยันสิทธิ์, โหลด API, loading/empty/error/retry และ render รายการ
- `admin/orders.html` — ประวัติ Order
- `admin/payments.html` — รายการชำระเงิน
- `admin/inventory.html` — จัดการวัตถุดิบ
- `admin/members.html` — จัดการสมาชิก

มาตรฐานที่ใช้ร่วมกัน:

- Mobile-first สำหรับ LINE WebView
- Sarabun, spacing, radius และสี Admin ตาม Design System
- Header ผู้ดูแล, สถานะสิทธิ์, card list, badge สถานะ
- รองรับข้อความและ LINE UID ยาว
- มีสถานะ loading, empty, error และปุ่มลองใหม่

`Design.md` ได้เพิ่มหัวข้อ **Standalone Admin List Pages** เพื่อเป็นเอกสารอ้างอิงของรูปแบบใหม่นี้แล้ว

## Commit สำคัญวันนี้

| Commit | รายละเอียด |
| --- | --- |
| `12154a3` | เปลี่ยน Workflow 10/12 ให้ใช้ Admin Rich Menu ใหม่ |
| `7a5349d` | รอ LIFF initialize ก่อน route หน้า Admin |
| `ef7b111` | สร้างหน้า Admin แยก 4 หน้าและ UI กลาง |
| `92b6890` | ส่งต่อ LINE UID จาก LIFF ไปหน้าที่แยก |
| `a0fb30c` | บันทึกมาตรฐานหน้า Admin แยกใน Design.md |

## งานที่ค้าง / ทำต่อครั้งหน้า

1. รอ GitHub Pages deploy แล้วทดสอบ Rich Menu 4 ช่องอีกครั้ง เพื่อยืนยันว่าแต่ละช่องเปิด **หน้าแยกใหม่** ไม่ใช่ dashboard รวม
2. ทดสอบบน LINE Android/iOS อย่างน้อย 1 รอบ:
   - Order
   - Payment
   - Inventory
   - Members
3. หากต้องการเพิ่มการจัดการจริงในแต่ละหน้า ให้กำหนดขอบเขตต่อไป:
   - Order: ดูรายละเอียด / filter / export
   - Payment: อนุมัติหรือปฏิเสธรายการ
   - Inventory: แก้จำนวน ราคา หรือสถานะ
   - Members: แก้ Role / เปิด-ปิดสิทธิ์
4. ตรวจสอบ Workflow 12 ใน n8n ว่าแก้ Rich Menu ID ใหม่และ Publish แล้วก่อนนำไปใช้จริง
5. เฝ้าดูพื้นที่ดิสก์ n8n; หากต่ำกว่า 1 GB ให้ตรวจ Docker/cache ก่อนรัน Workflow ที่ดาวน์โหลดไฟล์

## ข้อควรระวัง

- ไม่ต้องรัน Workflow 15 ซ้ำเพื่อทดสอบหน้า Admin เพราะจะสร้าง Rich Menu ใหม่ทุกครั้ง
- หากเปลี่ยน Rich Menu ID ในอนาคต ต้องอัปเดต Workflow 10 และ Workflow 12 ให้ใช้ ID เดียวกันด้วย
- ไฟล์ untracked ที่มีอยู่ก่อนหน้าใน workspace ไม่ได้ถูกรวมใน commit วันนี้
