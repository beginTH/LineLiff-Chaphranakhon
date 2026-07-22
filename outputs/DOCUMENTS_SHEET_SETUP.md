# Documents sheet setup

Create a new Google Sheet tab named exactly `Documents` in `Chaphranakhon_DB`.
Paste this header row into row 1, from column A through J:

`Document_ID,Order_ID,Document_Type,File_ID,File_URL,Created_At,Created_By_UID,Created_By_Name,Status,Note`

V15 uses this sheet as a document register for the internal Purchase Order, Delivery Note / Tax Invoice, and Receipt. This prevents the `Orders` sheet from needing additional document URL columns.

For payment verification, add these three headers in the existing `Orders` sheet after the current last column:

`Payment_Verified_At,Payment_Verified_By,Payment_Verified_By_UID`

The webhook `POST /admin-verify-payment` accepts `orderId`, `adminUid`, and `adminName`. It only creates a receipt when `Payment_Status` is `Submitted` and the requester is an active admin.

## เพิ่มคอลัมน์ใน Orders สำหรับการตรวจสอบการชำระเงิน

Payment_Rejection_Reason, Payment_Rejected_At, Payment_Rejected_By, Payment_Rejected_By_UID
