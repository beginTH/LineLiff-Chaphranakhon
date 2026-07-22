# Payment Proof

Use `outputs/modular/03_payment_submission.json` for proof submission and `outputs/modular/06_read_apis.json` for order history.

Approved orders only may submit proof. Orders already Submitted, Verified, or Paid are excluded. JPG, PNG, and WEBP files up to 5 MB are supported.

After submission, Admin uses workflow 04 to verify or workflow 05 to reject. A rejected proof may be submitted again.
