# Project Save Point - 22 July 2026

## Status

The main end-to-end flow has passed: order creation, Admin approval, document generation, payment proof, payment verification, and receipt creation.

## Completed capabilities

- Branch LIFF order with products, address, contact, and notes
- Admin approval with quantity adjustment, shipping, discount, and VAT
- PO after order submission
- Delivery/tax invoice after approval
- Payment proof upload and Admin notification
- Payment verification and rejection
- Receipt after verification
- Thai Admin LIFF and payment review screen
- Six modular workflows under `outputs/modular/`

## File layout

- Active modular workflows: `outputs/modular/`
- Previous monolith backup: `outputs/archive/v15-monolith/`
- Import guide: `outputs/MODULAR_WORKFLOWS.md`
- Document setup: `outputs/DOCUMENTS_SHEET_SETUP.md`

## Modular workflow list

1. `01_order_intake_po.json`
2. `02_admin_approval_delivery.json`
3. `03_payment_submission.json`
4. `04_payment_verification_receipt.json`
5. `05_payment_rejection.json`
6. `06_read_apis.json`

Workflow 02 was checked and repaired so its document-generation path is connected end to end.

## Test status

- Main end-to-end flow: passed
- Thai Admin LIFF: passed
- Main PDF pipelines: passed
- Paid-order filtering: fixed
- Payment CORS: fixed
- Notes: edge-case test remaining
- Payment rejection: edge-case test remaining
- Direct order rejection: not implemented

## Save point rules

Keep the archived monolith. Do not activate duplicate webhook paths. Record edge-test results before adding a new feature.
