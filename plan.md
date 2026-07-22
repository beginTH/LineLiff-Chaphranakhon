# Plan and Save Point

Updated: 22 July 2026.

## Completed

- Branch order, address, product, contact, and note flow
- Admin approval, quantity adjustment, shipping, discount, and VAT
- PO, delivery/tax invoice, and receipt document pipelines
- Payment proof upload, Admin notification, verification, and rejection
- Modular split into six workflow files
- Monolith archived under `outputs/archive/v15-monolith/`
- Syntax and connection checks for modular workflows

## Remaining tests

- Branch order note
- Admin approval note
- Payment submission note
- Payment rejection: underpayment, overpayment, missing transfer, invalid proof
- Resubmission after payment rejection
- Unauthorized Admin and invalid order ownership/status

## Not implemented

- Direct order rejection workflow
- Atomic lock for simultaneous Admin approvals
- CSV/email accounting pipeline
- Credit dashboard/reporting

## Change rules

Update the relevant modular JSON and Markdown in the same commit. Never activate duplicate webhook paths.
