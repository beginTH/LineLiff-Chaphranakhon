# Documents Sheet Setup

Use the `Documents` sheet as the register for generated documents.

Columns: `Document_ID`, `Order_ID`, `Document_Type`, `File_ID`, `File_URL`, `Created_At`, `Created_By_UID`, `Created_By_Name`, `Note`.

Document types: `Purchase Order`, `Delivery Tax Invoice`, `Receipt`.

Payment rejection columns in `Orders`: `Payment_Rejection_Reason`, `Payment_Rejected_At`, `Payment_Rejected_By`, `Payment_Rejected_By_UID`.

Receipt creation requires `Payment_Status=Submitted` and an active Admin.
