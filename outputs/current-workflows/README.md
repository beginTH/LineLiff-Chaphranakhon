# Current n8n workflows

Import or maintain production workflows from this folder only. For any webhook path, keep exactly one active workflow in n8n.

## Production workflows

| Workflow | File | Purpose |
|---|---|---|
| 00 | `00_line_users_sync.json` | Receive LINE events and update users |
| 01 Users processor | `01_line_users_processor_subworkflow.json` | Called by Workflow 00 |
| 01 Orders | `01_order_intake_po_v10_branch-notice-after-admin.json` | Submit order, create PO, notify admin, then notify branch |
| 02 Approval | `02_admin_approval_delivery_v6_print-layout.json` | Admin order approval and delivery/tax invoice |
| 03 Payment proof | `03_payment_submission.json` | Receive payment proof and notify admin |
| 04 Payment verify | `04_payment_verification_receipt_v7_order-data-fix.json` | Verify payment and create receipt |
| 05 Payment reject | `05_payment_rejection_v6_reason-fallback.json` | Reject payment proof and send reason to branch |
| 06 Read APIs | `06_read_apis.json` | Read user, order, product, and order-history APIs |
| 07 Branch application | `07_branch_application_registration_v7_line-display-name.json` | Branch registration and admin notification |
| 08 Branch review | `08_branch_approval_review_v5_line-token.json` | Securely approve/reject branch registration |
| 08a Branch read | `08a_get_branch_application_v2.json` | Securely read a branch registration for review |
| 13 Admin reads | `13_admin_read_apis.json` | Secure dashboard read APIs |
| 14 Admin writes | `14_admin_write_apis.json` | Secure dashboard write APIs |

## Maintenance only

Files under `maintenance/` are for Rich Menu setup, re-linking, or reconciliation. Do not activate them as production webhooks unless the workflow itself requires activation.

## Archived superseded versions

Superseded releases have been moved to `../archive/superseded-security-release-2026-07-31/`. They are retained for rollback only and must remain inactive in n8n.
