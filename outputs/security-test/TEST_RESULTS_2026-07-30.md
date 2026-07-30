# Admin Security Test Results — 2026-07-30

Status: local, external token-rejection, and selected n8n end-to-end tests passed; production rollout pending.

## Result summary

- 51 local workflow tests passed.
- 0 local workflow tests failed after remediation.
- A fake token was rejected by LINE with HTTP 400 and `JWS format error`.
- Two isolated TEST workflows were imported into n8n and kept inactive; neither was published.
- Google Sheets reads occurred only in valid-token test-mode executions. Two authorized Product writes ran: the reversible P002 price test and its restoration.
- No production webhook, Admin frontend or production workflow was deployed; the temporary LIFF test page was removed after testing.

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

## n8n test-mode results

The imported inactive TEST workflows were exercised through `/webhook-test/`:

- Workflow 13 rejected a missing token at `Extract LINE Token for Orders` before any Google Sheets node.
- Workflow 13 rejected a fake token at `Verify LINE Token for Orders` before any Google Sheets node.
- Workflow 14 rejected fake tokens in both Product Update and Role Update branches before reading Admins or reaching an Update node.
- Workflow 13 accepted a valid LIFF ID token, read Admins, authorized the active Admin, and only then read Orders and Branches. The request completed with HTTP 200.
- Workflow 13 accepted a valid LIFF ID token for Payments, authorized the active Admin before reading Orders and Branches, and completed the formatted Payments response.
- Workflow 13 accepted a valid LIFF ID token for Products, authorized the active Admin before reading all 41 Products, and completed the formatted Products response.
- Workflow 13 accepted a valid LIFF ID token for Users, authorized the active Admin before reading both Users, and completed the formatted Users response.
- Workflow 14 accepted a valid LIFF ID token and read Admins, but exposed an operational Role-name mismatch: the sheet uses `approve`, while the draft allowed only `owner` and `approver`.

The Role-name mismatch was remediated in both canonical and TEST Workflow 14 files. Product update authorization now accepts exact active roles `owner`, `approve`, or `approver`; all other roles remain denied. Local regression tests confirmed that an active `approve` reaches payload validation while the intentionally invalid test payload stops before `Update Product`.

The updated Workflow 14 TEST was then exercised with a valid LIFF token. The active `approve` account reached product validation, stopped with `Invalid product data`, and did not run `Update Product`. A valid-token Role Update request from the same `approve` account stopped with `Only an active owner may update user roles`, and did not run `Update User Role`.

A production-data compatibility mismatch was then found before the write test: P002 uses the existing Thai status `พร้อม`, while Workflow 14 and the Admin editor initially allowed only English status values. The canonical Workflow, TEST Workflow, Admin editor and temporary test page were updated to accept only the known status aliases already supported by the storefront. Eleven status regression cases passed, including rejection of an unknown status and preservation of the original Thai value.

The active `approve` account then updated P002 from THB 490.00 to THB 490.01 through the full Product Update path and received HTTP 200. A second authorized execution restored the original price, unit and status. A fresh Workflow 13 read confirmed P002 at THB 490.00, unit `ถุง` and status `พร้อม`.

## End-to-end tests still required

- If suitable accounts are available, confirm real valid-token executions for inactive and non-Admin users stop at `Authorize Active Admin`.

- Use an active `owner` account and a disposable member record before testing a successful user-Role write.


Browser and Windows UI automation could not connect in this session because the
Windows sandbox stopped the automation runtime before it opened n8n. This did
not change n8n or production state.
