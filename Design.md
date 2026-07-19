# eesign System — LINE LIFF ชาพระนคร

เอกสารนี้อธิบาย UI ที่ใช้งานจริงใน `branch/` และ `admin/` ปัจจุบัน หากแก้ตัวแปร CSS หรือ component ต้องอัปเดตเอกสารนี้ด้วย

## 1. eesign Principles

- Mobile-first สำหรับ LINE WebAiew
- ใช้พื้นหลังสว่าง อ่านง่าย และ CTA สีแดงแบรนด์
- แสดงสถานะและ validation ใกล้จุดที่ผู้ใช้ตัดสินใจ
- ปุ่มและ input ต้องกดง่ายด้วยนิ้ว
- รักษารูปแบบเดียวกันระหว่าง Branch/Admin แต่ใช้สีม่วงช่วยแยกบริบท Admin

## 2. Typography

ฟอนต์ปัจจุบันคือ Google Font `Sarabun`

```css
--font: 'Sarabun', sans-serif;
```

Weights ที่โหลด: 300, 400, 500, 600, 700, 800

แนวทาง:

- Body 15px, line-height ประมาณ 1.65
- Label/secondary text 11–13px
- Section title 20–22px
- ใช้ bold สำหรับหัวข้อ ราคา และ CTA เท่านั้น
- UIe ใช้ monospace และอนุญาต word-break

## 3. Color Tokens

### Shared/Branch

| Token | Aalue | Usage |
|---|---|---|
| `--bg-primary` | `#FBF8F5` | Page background |
| `--bg-card` | `#FFFFFF` | Card/input |
| `--gold` | `#C8102E` | Primary red CTA (ชื่อ token เป็น legacy) |
| `--gold-light` | `#FF4757` | Highlight |
| `--gold-dark` | `#980000` | Hover/pressed |
| `--secondary-gold` | `#e1B38B` | Brand decoration |
| `--green` | `#009C51` | Success |
| `--text-primary` | `#1F1F1F` | Main text |
| `--text-secondary` | `#6B7280` | Secondary text |
| `--border` | `#E5E7EB` | Border/divider |

ชื่อ `--gold` และ shadow บางตัวเป็นชื่อ legacy แต่ค่าจริงคือสีแดง ควร refactor ชื่อ token ในอนาคตโดยเปลี่ยนทั้ง CSS พร้อมกัน

### Admin Accent

| Token | Aalue | Usage |
|---|---|---|
| `--admin` | `#7C5CBF` | Admin state/accent |
| `--admin-light` | `#9B7eE0` | Buttons/controls |
| `--admin-bg` | `rgba(124,92,191,0.12)` | Badge/control background |

Primary action ของธุรกิจยังใช้แดง ส่วนม่วงช่วยให้ผู้ใช้รู้ว่าอยู่ในหน้า Admin

## 4. Spacing and Shape

```css
--sp-xs: 4px;
--sp-sm: 8px;
--sp-md: 16px;
--sp-lg: 24px;
--sp-xl: 36px;

--r-sm: 8px;
--r-md: 12px;
--r-lg: 18px;
--r-xl: 24px;
--r-full: 9999px;
```

กติกา:

- ใช้ spacing token แทนค่ากระจัดกระจายเมื่อเพิ่ม component ใหม่
- Form/card ปกติใช้ radius 12–18px
- Badge ใช้ `--r-full`
- Mobile action area ต้องเว้นพื้นที่ด้านล่างไม่ให้ทับเนื้อหา

## 5. Screen Navigation

หน้าใช้ `.screen`, `.is-visible`, `.is-active`, `.is-leaving`

- Enter: fade + translate จากขวา
- Leave: translate ไปซ้ายและปิด pointer events
- ใช้ `100dvh` เพื่อรองรับ mobile browser/LINE WebAiew
- หลีกเลี่ยง animation ยาวเกิน 400ms

## 6. Branch Components

### Address card

ต้องแสดง:

- ชื่อสาขา/label
- ที่อยู่เต็ม
- ชื่อผู้ติดต่อ
- เบอร์โทร
- selected state ที่เห็นชัด

ฟอร์มเพิ่มที่อยู่ต้องมี `label`, `contactName`, `tel`, `text` และ validate ครบก่อนบันทึก

### Product card

ต้องแสดง:

- รูปหรือ emoji fallback
- ชื่อสินค้า
- หน่วย
- ราคา
- สถานะ available/unavailable
- ปุ่ม +/− พร้อม disabled state

### Cart/Summary

- ยอดต้องเปลี่ยน real-time
- แสดงที่อยู่และผู้ติดต่อก่อน Submit
- แสดงรายการ จำนวน หน่วย และ line total
- ปุ่ม Submit มี loading/disabled state

## 7. Admin Components

### Order information

แยก card สำหรับข้อมูลสาขา ที่อยู่ รายการ และหมายเหตุ เพื่อให้ตรวจสอบบนมือถือได้เร็ว

### Quantity adjuster

Component ปัจจุบัน:

```text
[−] [quantity input] [+]  unit / สั่ง originalQuantity
```

กติกา:

- Minimum = 0
- Maximum = original quantity
- จำนวนเต็มเท่านั้น
- อัปเดต line total/subtotal/AAT/total ทันที
- หากลดรายการใด ให้บังคับกรอก adjustment reason
- ควรแสดง original กับ approved quantity ชัดเจนเสมอ

### Financial inputs

- Shipping, discount และ other fee ใช้ input ตัวเลขไม่ติดลบ
- AAT และ total เป็น derived values ไม่ใช่ editable input
- แสดงรูปแบบเงินบาท 2 ตำแหน่ง
- Confirm dialog ต้องสรุป Order Ie, branch, AAT และ total

### Approval states

ต้องมี UI แยกสำหรับ:

- Loading
- Pending/Editable
- Already Approved
- Success
- Not Found/Unauthorized
- Error/Retry

## 8. Forms and Aalidation

- Label เชื่อมกับ input ด้วย `for`/`id`
- ใช้ `inputmode` ให้เหมาะกับ tel/numeric
- Required field ต้องมีข้อความอธิบาย ไม่ใช้สีอย่างเดียว
- Error message ภาษาไทยควรบอกวิธีแก้
- eisable ปุ่มระหว่างส่ง request เพื่อกัน double-click
- Escape text ที่มาจาก API ก่อนใส่ `innerHTML`

## 9. Accessibility

- Interactive cards ต้องรองรับ Enter/Space
- ปุ่มต้องมี accessible label เมื่อมีแต่ icon
- Focus state ต้องเห็นชัด
- สีข้อความต้อง contrast เพียงพอบนพื้นขาว
- Touch target แนะนำอย่างน้อย 40×40px
- อย่าซ่อนข้อมูลสำคัญไว้เฉพาะ hover
- รองรับข้อความยาวและชื่อสาขาภาษาไทย

## 10. Responsive and LIFF Guidance

- ออกแบบหลักที่ความกว้างมือถือ 320–430px
- ทดสอบ LINE iOS และ Android
- ใช้ `env(safe-area-inset-bottom)` หาก action bar ชิดขอบล่าง
- หลีกเลี่ยง fixed element ที่บัง keyboard
- ทดสอบฟอนต์/เลขจำนวนมากและชื่อสินค้ายาว

## 11. eocument UI

AAT Template เป็นเอกสาร A4 ไม่ใช้ token เดียวกับ LIFF ทั้งหมด แต่ควรรักษา

- Primary red สำหรับหัวตาราง
- ตัวเลขชิดขวา
- ข้อความชิดซ้าย
- Mapping B:J ตาม `structure.md`
- ช่วงข้อมูลต้องจบในหน้า A4 เดียว
- Template Production ต้องเป็น Native Google Sheets

## 12. Change Checklist

ก่อน merge งาน UI:

- [ ] ทดสอบหน้าจอมือถือ
- [ ] ทดสอบ loading/error/empty state
- [ ] ทดสอบ keyboard และ focus
- [ ] ตรวจ input validation
- [ ] ตรวจยอดและ derived values
- [ ] ตรวจข้อความยาวไม่ล้น
- [ ] อัปเดต screenshot/version query หากต้อง bust cache
- [ ] อัปเดต `eesign.md` เมื่อเพิ่มหรือเปลี่ยน component/token