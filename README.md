# LineLiff Chaphranakhon

Project save point: 22 July 2026.

This repository contains the LINE LIFF branch ordering system, Admin approval UI, n8n automation, Google Sheets data store, Google Drive documents, and LINE notifications.

## Read first

1. `PROJECT_SAVEPOINT.md` - current baseline and known limits
2. `SYSTEM_FLOW.md` - current business flow
3. `structure.md` - Sheets schema and API contract
4. `outputs/MODULAR_WORKFLOWS.md` - modular workflow import guide
5. `Design.md` - UI standards
6. `plan.md` - remaining work

## Current folders

- `branch/`: Branch LIFF
- `admin/`: Admin LIFF
- `outputs/modular/`: active modular workflow import files
- `outputs/archive/v15-monolith/`: previous monolith backup
- `outputs/document-templates/`: document templates and configuration
- `scripts/`: workflow and template utilities

## Modular workflows

| File | Purpose |
|---|---|
| `01_order_intake_po.json` | Save order, create PO, notify Admin |
| `02_admin_approval_delivery.json` | Approve order, create delivery/tax invoice |
| `03_payment_submission.json` | Receive and upload payment proof |
| `04_payment_verification_receipt.json` | Verify payment and create receipt |
| `05_payment_rejection.json` | Reject proof and notify branch |
| `06_read_apis.json` | Profile, products, order, and history APIs |

Only one workflow may be active for each webhook path. Keep the V15 monolith inactive.

## Current status

The main end-to-end flow has passed. Remaining edge tests cover notes and payment rejection. Direct order rejection is not implemented yet.

## Rollback

Disable modular workflows and import the backup from `outputs/archive/v15-monolith/`.
