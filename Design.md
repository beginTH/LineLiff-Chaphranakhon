# 🎨 Design System & Guidelines (อ้างอิงจาก cha-phranakhon-web)

เอกสารนี้รวบรวมแนวทางการออกแบบ (Design Guidelines) ที่แกะมาจากโปรเจคหลัก `cha-phranakhon-web` เพื่อให้โปรเจค **LineLiffชาพระนคร** สามารถนำไปประยุกต์ใช้และมีหน้าตา (UI/UX) ที่เป็นไปในทิศทางเดียวกัน (Brand Consistency)

---

## 1. 🎨 ชุดสี (Color Palette)

สีหลักของแบรนด์ชาพระนครจะเน้นความหรูหรา คลาสสิก โดยใช้ **สีแดง (Primary)** ตัดกับ **สีทอง (Secondary)** บนพื้นหลังที่สะอาดตา

| ชื่อสี | ตัวอย่างการใช้งาน | รหัสสี (Hex) |
| :--- | :--- | :--- |
| **Primary (Red)** | ปุ่มกดหลัก, สีเน้น, โลโก้ | `#C8102E` |
| **Primary Dark** | สีตอน Hover ปุ่มกด (เข้มขึ้น) | `#980000` |
| **Primary Light** | สีแดงอ่อนสำหรับไฮไลท์ | `#FF4757` |
| **Secondary (Gold)** | ไอคอน, เส้นคั่น, ของตกแต่ง | `#D1B38B` |
| **Accent (Green)** | ป้ายสถานะสำเร็จ, ปุ่มยืนยัน | `#009C51` |
| **Text (Dark)** | สีตัวหนังสือหลัก | `#1F1F1F` |
| **Text Muted** | สีตัวหนังสือรอง, รายละเอียดเล็กๆ | `#6B7280` |
| **Background** | พื้นหลังหลัก (ขาว) | `#FFFFFF` |
| **Background Soft** | พื้นหลังส่วนเนื้อหารอง (ครีม) | `#FBF8F5` หรือ `#F9F5F0` |

---

## 2. 🔤 ฟอนต์ (Typography)

โปรเจคหลักใช้ฟอนต์ **LINE Seed Sans TH** เป็นฟอนต์หลัก เพื่อให้อ่านง่ายและดูทันสมัย

*   **Primary Font:** `LINE Seed Sans TH`
*   **Fallback Fonts:** `Inter`, `system-ui`, `sans-serif`
*   **Font Weights:** 
    *   `100` (Thin)
    *   `400` (Regular - สำหรับเนื้อหาทั่วไป)
    *   `700` (Bold - สำหรับหัวข้อ)
    *   `800` (ExtraBold)
    *   `900` (Black)

> **💡 คำแนะนำสำหรับ LIFF:** สามารถ import ฟอนต์ `LINE Seed Sans TH` ผ่าน CDN หรือนำไฟล์ฟอนต์มาใส่ในโฟลเดอร์ `/fonts` ได้ เพื่อให้แอปดูเป็นหนึ่งเดียวกับเว็บไซต์หลัก

---

## 3. 🧩 สไตล์และเอฟเฟกต์ (Styles & Effects)

### 3.1 Shadows (เงา)
เพื่อเพิ่มมิติให้กับการ์ดสินค้าหรือปุ่มกด
*   **Soft Shadow:** `0 2px 15px -3px rgba(0, 0, 0, 0.07)`
*   **Card Shadow:** `0 4px 20px rgba(0, 0, 0, 0.06)` (ใช้กับการ์ดสินค้าปกติ)
*   **Card Hover:** `0 20px 40px rgba(0, 0, 0, 0.08)` (เงาเมื่อเอาเมาส์ชี้ หรือแอนิเมชันปุ่ม)
*   **Red Glow:** `0 0 20px rgba(200, 16, 46, 0.15)` (เงาเรืองแสงสีแดง สำหรับปุ่ม Call-to-action ที่สำคัญ)

### 3.2 Glassmorphism (พื้นหลังกระจก)
เหมาะสำหรับ Navbar, Header หรือ Popup ที่ลอยอยู่ด้านบน
```css
.glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
```

### 3.3 Gradient Text (ตัวหนังสือไล่สี)
สำหรับหัวข้อที่ต้องการความโดดเด่น
```css
.gradient-text {
  background: linear-gradient(135deg, #C8102E, #980000);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 4. 💫 แอนิเมชัน (Animations)

โปรเจคหลักมีการใช้ CSS Animations เพื่อให้หน้าเว็บดูลื่นไหล สามารถนำมาปรับใช้กับ LIFF App ได้:

*   **Fade In Up (`fadeInUp 0.6s`):** เลื่อนจากล่างขึ้นบน เหมาะสำหรับตอนโหลดรายการสินค้า
*   **Scale In (`scaleIn 0.5s`):** ขยายขนาดจาก 90% เป็น 100% เหมาะสำหรับปุ่มยืนยัน หรือ Popup สรุปออเดอร์
*   **Card Hover:** เมื่อ hover การ์ด (บน Desktop) จะเลื่อนขึ้นเล็กน้อย (`translateY(-6px)`)

---

## 5. 📱 แนวทางการนำไปใช้ใน LIFF App (ชาพระนคร)

เพื่อให้ LineLiff เข้ากับเว็บไซต์หลัก แนะนำให้ปรับแก้ไฟล์ CSS (เช่น `branch/style.css` และ `admin/style.css`) ดังนี้:

1.  **เปลี่ยนสีพื้นหลังและสีปุ่ม** ให้ตรงกับ `Primary (#C8102E)` และ `Secondary (#D1B38B)` แทนธีมสี Dark/Gold เดิม (ถ้าต้องการให้แบรนด์ตรงกันเป๊ะๆ)
2.  **ปรับฟอนต์** เป็น `LINE Seed Sans TH`
3.  **ใส่ความโค้ง (Border Radius):** โปรเจคหลักมักใช้ขอบมน (เช่น `8px` หรือ `12px` สำหรับการ์ด)
4.  **ปรับดีไซน์ปุ่ม (Buttons):**
    *   **ปุ่มหลัก (Primary):** พื้นหลังสี `#C8102E`, ตัวหนังสือสีขาว, ไม่มีขอบ
    *   **ปุ่มรอง (Outline):** พื้นหลังใส, ขอบสี `#D1B38B` หรือ `#C8102E`, ตัวหนังสือสีเข้ม
5.  **Navbar / Header:** ใช้เทคนิค Glassmorphism แบบสีขาวสว่างแทนแบบทึบ เพื่อให้แอปดูโมเดิร์นและสะอาดตา
