# Save Point — 24 July 2026

## สถานะปัจจุบัน

ระบบสมัครสาขา อนุมัติสาขา และแยก Rich Menu ตาม Role ทำงานครบตามลำดับหลักแล้ว

## การทำงานที่ยืนยันแล้ว

- ผู้ใช้ LINE ถูกบันทึกและอัปเดตในชีต `Users`
- LIFF สมัครบัญชีสาขาส่งข้อมูลเข้า `Branch_Applications` ได้
- Admin ได้รับ LINE แจ้งเตือนคำขอสาขาใหม่ พร้อมลิงก์ตรวจสอบ
- หน้า LIFF ตรวจสอบคำขอสาขาแสดงรายละเอียด และกดอนุมัติ/ปฏิเสธได้
- เมื่อลองอนุมัติแล้ว สถานะใน `Branch_Applications` เปลี่ยนเป็น `Approved` พร้อมผู้อนุมัติและเวลา
- เมื่ออนุมัติ ระบบ V4 จะสร้าง/อัปเดตข้อมูลสาขาและเปลี่ยน `Users.Role` เป็น `branch`
- สร้าง Rich Menu ผ่าน LINE Messaging API สำเร็จ 2 เมนู

## Rich Menu IDs ที่ใช้งาน

| Role | Rich Menu ID | การแสดงผล |
| --- | --- | --- |
| `admin` / `superadmin` | `richmenu-b964646053223519d82c60f15aaf2b5e` | เมนูผู้ดูแล |
| `branch` / `owner` | `richmenu-9e24dce8c6b1bc140f5d3f0c4c05ee75` | เมนูสาขา |
| `customer` หรือ Role ว่าง | ไม่มีการผูกเฉพาะราย | ใช้ Default Rich Menu จาก LINE OA Manager |

## Workflow สำคัญ

| Workflow | หน้าที่ | สถานะ |
| --- | --- | --- |
| `01 - LINE Users Processor` | เก็บ Friend/Message event ลง Users | ใช้งานแล้ว |
| `07 - Branch Application Registration` | รับใบสมัครและแจ้ง Admin | ใช้งานแล้ว |
| `08a - Get Branch Application v2` | ให้ LIFF อ่านใบสมัคร | ใช้งานแล้ว |
| `08 - Branch Approval Review v4` | อนุมัติ/ปฏิเสธ, เปิดสาขา, ผูกเมนูสาขา | ต้องเป็นเวอร์ชันที่ Publish |
| `09b - Create Role Rich Menus` | สร้าง/อัปโหลดเมนู API | รันสำเร็จแล้ว |
| `10 - Assign LINE Rich Menu by Role` | Endpoint สำหรับผูก/คืน Default ตาม Role | พร้อมใช้งาน |
| `11 - Sync Existing Role Rich Menus` | ผูกเมนูให้ผู้ใช้เดิมตามชีต Users | รันสำเร็จแล้ว |

## ไฟล์ workflow ล่าสุด

- `outputs/modular/08_branch_approval_review_v4_activate_and_link_branch_menu.json`
- `outputs/modular/09b_create_role_rich_menus.json`
- `outputs/modular/10_assign_role_rich_menu.json`
- `outputs/modular/11_sync_existing_role_rich_menus.json`

## วิธีดูแลต่อ

1. ตรวจ Role จากชีต `Users` คอลัมน์ `Role`.
2. เปลี่ยน Role ด้วยมือ เช่น `branch` เป็น `admin` แล้วรัน workflow 11 หนึ่งครั้ง.
3. ใบสมัครสาขาใหม่ที่อนุมัติผ่าน workflow 08 V4 ไม่ต้องรัน workflow 11 เพราะระบบผูก Branch Rich Menu ให้อัตโนมัติ.
4. หากเมนู LINE ยังไม่เปลี่ยนทันที ให้ปิดและเปิดห้องแชต OA ใหม่ หรือรอสักครู่.

## ข้อควรระวัง

- Default Rich Menu ถูกจัดการใน LINE OA Manager; ไม่ต้องลบหรือแก้เพื่อใช้กับ Role อื่น.
- เมนู Admin และ Branch ที่สร้างผ่าน Messaging API จะไม่ปรากฏในรายการ Rich Menu ของ OA Manager เป็นปกติ.
- ก่อน Publish workflow 08 V4 ให้ปิด Publish ของ workflow 08 เวอร์ชันเดิมเพื่อไม่ให้ Webhook path ซ้ำ.

## Git Save Point

- Branch: `agent/admin-adjustment-vat-a4`
- Save point นี้บันทึกหลังจาก Rich Menu role-based ทำงานและทดสอบการผูก Role แล้ว
