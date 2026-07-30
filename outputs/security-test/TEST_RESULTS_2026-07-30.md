# Admin Security Test Results — 2026-07-30

Status: local and external token-rejection tests passed; n8n end-to-end tests pending.

## Result summary

- 51 local workflow tests passed.
- 0 local workflow tests failed after remediation.
- A fake token was rejected by LINE with HTTP 400 and `JWS format error`.
- No workflow was imported or activated in n8n.
- No Google Sheets read or write was performed by these tests.
- No production webhook, frontend or workflow was deployed.

## Tests passed

- Missing Authorization header is rejected on all six Admin endpoints.
- A non-Bearer authorization scheme is rejected.
- An implausibly short bearer token is rejected before LINE verification.
- All six extraction nodes accept a plausibly shaped bearer token for subsequent
  server-side verification.
- Active Admin authorization succeeds before Orders, Payments, Products or
  Users are read.
- Inactive Admin and non-Admin UIDs stop before business-data sheets are read.
- Active Owner and Approver product-update boundaries are enforced.
- Ordinary Admin and inactive Owner product updates are rejected.
- Negative price and unsafe image URL inputs are rejected.
- Only an active Owner may update another user's Role.
- Approver, inactive Owner, self-Role update and unknown Role inputs are
  rejected.
- Workflow graphs, Code node syntax and canonical/security-test parity are
  valid.

## Defect found and remediated

The first test run passed 35 cases and failed four topology checks. Workflow 13
originally authorized the Admin in its final formatting nodes, after reading the
business-data sheets.

Four `Authorize Active Admin` nodes were inserted immediately after the Admins
sheet reads and before the Orders, Payments, Products and Users sheet reads.
The duplicate authorization logic was removed from the formatting nodes.

The second test run passed all 51 cases.

## External verification

The LINE token verification endpoint was called with a generated fake token and
the configured client ID `2010570929`. LINE returned HTTP 400 with
`invalid_request` and `JWS format error`, confirming that the external verifier
rejects the malformed token.

## End-to-end tests still required

- Import both TEST workflows into n8n while keeping them inactive.
- Run the `/webhook-test/` endpoints with a real LIFF ID token.
- Confirm execution stops at the expected node for inactive and non-Admin
  accounts.
- Confirm an active Admin can read all four Admin datasets.
- Select disposable product and member records before testing successful writes.
- Confirm no unauthorized request reaches an Update node.

Browser and Windows UI automation could not connect in this session because the
Windows sandbox stopped the automation runtime before it opened n8n. This did
not change n8n or production state.
