# Production Workflow Baseline

Created: 30 July 2026
Git baseline: `d41f25f757670928121de49e9132787bcd8bbfe6`
Purpose: read-only rollback reference before security hardening. This file does not prove which workflows are active in the live n8n instance.

## Confirmed repository baseline

These files are tracked and documented as the current core/Admin workflow set.

| Workflow | Nodes | Public webhook paths | SHA-256 |
|---|---:|---|---|
| `01_order_intake_po.json` | 22 | `POST /submit-order` | `3f91c0cc08287eb36e698572bd50808a65522ab44e2ca48fdc3f65db463a6ab3` |
| `02_admin_approval_delivery.json` | 29 | `POST /admin-approve` | `1170f55ba1cf432b4b9588ecfa9158a1b0658761e8f1a9cc28b76ede5529f606` |
| `03_payment_submission.json` | 10 | `POST /submit-payment-proof` | `d46e94d95fab3af97631662b704a530c00ab7cb215b5565f46c86ea225afd0e2` |
| `04_payment_verification_receipt.json` | 20 | `POST /admin-verify-payment` | `36997f2b8463f8186e664d4fc729f14a53018e48cb25b1785770887bc147f4d8` |
| `05_payment_rejection.json` | 9 | `POST /admin-reject-payment` | `cebb9fb0b4d712a206e451fb0b3fa4251cec2f2b13715638c492d92cca43b0e4` |
| `06_read_apis.json` | 13 | `GET /get-user-profile`, `GET /get-order`, `GET /get-products`, `GET /get-order-history` | `2214b46e06d33a346468a9e468570eef836f55c65439cc85b00ceaa7dfa60cf4` |
| `13_admin_read_apis.json` | 18 | `GET /admin-orders`, `GET /admin-payments`, `GET /admin-products`, `GET /admin-users` | `7715b66c9555275b1c16c49bee9d3335b55aea90de324ba95a2aafc161886632` |
| `14_admin_write_apis.json` | 10 | `POST /admin-product-update`, `POST /admin-user-role-update` | `70f5fe1652447a5b6089491a6d83786a488ed0cafb1db9b0f6dd9fd76bff6f31` |

## Live status must be confirmed in n8n

The following files are present locally, but repository state alone cannot confirm that the same version is active in n8n.

| Workflow | Git state | SHA-256 |
|---|---|---|
| `00_line_users_sync.json` | untracked | `1d892a769f35215af7650d9b3f2f72afc1d50335f81f75facc61a58807d7c622` |
| `01_line_users_processor_subworkflow.json` | untracked | `733799545d7a7a10ee47d779bccace52d13b066dd6e08c467c2e4d9489a89755` |
| `07_branch_application_registration_v6_approval_liff.json` | retained latest version | `c1fefb82ee05c03da9dd372bc9d3067aa1598ebfb19f2d46e63a34cb63f5a1a9` |
| `08_branch_approval_review_v4_activate_and_link_branch_menu.json` | tracked | `c45957ebe93e29f216e0131dc9cd9c458b2fac8a72c6a688297599cd8ed88ead` |
| `08a_get_branch_application_v2.json` | retained latest version | `ca67a193b329557b171151faf1b41ceaaf0719b8154e8edcc49528ed06d08a6d` |
| `10_assign_role_rich_menu.json` | tracked | `7671443709fa42852df03ab744d66be4ae29f1ed6cf263300a99d201bd6682ed` |
| `12_role_rich_menu_reconcile.json` | tracked | `22ccb208368da64ed30519182736291222c70e3a5230a69ecee44138944fbd2f` |
| `15_create_and_link_admin_dashboard_rich_menu.json` | tracked | `53449976ec780cf2e5bd03eaa4e3ed1afe004b4b069383a6856102280f82a5b8` |

## Required live backup before phase 2 deployment

1. Export every active workflow from n8n immediately before changing authentication.
2. Record workflow ID, name, active status and last-updated timestamp.
3. Store the exports outside the public Git repository because exports may contain credentials or sensitive configuration.
4. Verify that only one active workflow owns each webhook path.
5. Compare exported SHA-256 values with this manifest; a mismatch means Git is not the production source of truth.

## Rollback procedure

1. Do not modify the existing workflow in place during the first authentication rollout; import the hardened workflow under a new name.
2. Keep the old workflow inactive but available during the observation window.
3. To roll back, deactivate the hardened workflow, reactivate the exact exported baseline and confirm the webhook path is owned by only one active workflow.
4. Test one Admin read request and one rejected unauthorized request after either rollout or rollback.

## Current decision gate

Do not deploy phase 2 until the live exports for workflows 13 and 14 are confirmed to match the intended production behavior. No secrets, tokens or credential payloads should be committed to this repository.

## Duplicate cleanup record

On 30 July 2026, clear version duplicates were moved to `outputs/archive/retired-modular-2026-07-30/`. No workflow was deleted. The modular directory now keeps only v6 of workflow 07, v4 of workflow 08, v2 of workflow 08a, and the canonical names for workflows 13–14. One-time Rich Menu utilities were deliberately left in place pending a separate review.

The supplied active n8n exports were archived with these hashes:

- Workflow 13: `9b3d9df268e23f0123d5dcdef20b2040326aea9c7750f9d464a18aec075d5c17`
- Workflow 14: `3cd556b7a56cc73f685f7b637922aab631551c4898b1216759f5b77293620dd2`