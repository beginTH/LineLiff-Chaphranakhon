# Rich Menu: ส่งหลักฐานการโอนเงิน

ไฟล์ภาพ `rich_menu_transfer_proof_2500x1686.png` ใช้อัปโหลดเป็น Rich Menu แบบ Large ของ LINE Official Account ได้ทันที

ก่อนสร้าง Rich Menu ด้วย LINE Messaging API ให้แก้ 2 ค่าใน `rich_menu_transfer_proof.json`:

1. `REPLACE_WITH_ORDER_HISTORY_LIFF_ID` เป็น LIFF ID ของหน้าประวัติออเดอร์ (ถ้ามี)
2. `REPLACE_WITH_PAYMENT_PROOF_LIFF_ID` เป็น LIFF ID ของหน้าแนบสลิป/ส่งหลักฐานการโอนเงิน

พื้นที่กดถูกแบ่งเป็น 4 ส่วนเท่ากัน: สั่งซื้อ, ประวัติออเดอร์, ติดต่อเรา, และส่งหลักฐานการโอนเงิน

## Branch pages

The two new menu areas use the existing Branch LIFF ID with ?screen=history and ?screen=payment-proof. Import the V10 workflow before use. In node **Upload Payment Proof**, replace REPLACE_WITH_PAYMENT_PROOF_FOLDER_ID with the Google Drive folder ID for payment slips, and add the required payment columns to the Orders sheet.
