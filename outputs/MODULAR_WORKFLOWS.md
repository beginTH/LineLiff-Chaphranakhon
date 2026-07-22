# Modular n8n Workflows

The modular files separate the business events while keeping the existing Sheets, Drive, LINE credentials, and webhook paths.

| File | Purpose | Nodes |
|---|---|---:|
| `01_order_intake_po.json` | Order, PO, Admin notification | 22 |
| `02_admin_approval_delivery.json` | Approval and delivery/tax invoice | 29 |
| `03_payment_submission.json` | Payment proof upload and Admin notice | 10 |
| `04_payment_verification_receipt.json` | Verification and receipt | 20 |
| `05_payment_rejection.json` | Rejection and branch notice | 9 |
| `06_read_apis.json` | Read APIs | 13 |

## Import

1. Keep a backup of the current n8n workflows.
2. Import all six files from `outputs/modular/`.
3. Reconnect credentials and check `Allowed Origins=https://beginth.github.io`.
4. Disable the V15 monolith and any duplicate webhook paths.
5. Publish and test Order -> Approval -> Payment -> Verify/Reject.

## Rollback

Disable modular workflows and import `outputs/archive/v15-monolith/n8n_workflow_chaphranakhon_production_credit_bundle_v15_document_flow.json`.

## Payload contract

Pass small identifiers such as `orderId`, `lineUid`, `adminUid`, `adminName`, `documentType`, and `fileId`. Avoid passing full Sheets or Base64 between workflows.
