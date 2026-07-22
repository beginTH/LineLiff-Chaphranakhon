# Current System Flow

Save point: 22 July 2026.

```text
Branch creates order
 -> Order Intake saves Orders, creates PO, and notifies Admin
 -> Admin Approval validates and approves the order
 -> Delivery/Tax Invoice is created and sent to branch
 -> Branch submits payment proof
 -> Payment Submission uploads proof and notifies Admin
 -> Admin verifies or rejects proof
    -> Verify: mark Verified, create receipt, notify branch
    -> Reject: mark Rejected, save reason, notify branch for resubmission
```

## Status rules

- `Orders.Status`: `Pending`, `Approved`, `Rejected`, `Cancelled`
- `Orders.Payment_Status`: `Credit Pending`, `Submitted`, `Verified`, `Rejected`
- Proof upload is allowed only for an approved order.
- Verified or paid orders must not appear in the proof selector.
- Receipt creation requires submitted proof and an active Admin.
- Direct order rejection is not part of this save point.

## Notifications

- New order: active Admins with `Notify_Order`
- Submitted proof: Admins with `Notify_Payment_Submitted` or `Notify_Payment_Verification`
- Verified/rejected proof: the branch that owns the order

## Operational checks

- Credentials for Google Sheets, Drive, and LINE are configured.
- `Allowed Origins` is `https://beginth.github.io`.
- No duplicate active webhook paths exist.
- Test Order -> Approve -> Payment -> Verify/Reject before release.
