# Admin Security Test Workflows

These workflows are isolated copies of the hardened Admin Workflows 13 and 14.
They are preparation artifacts only and must not replace the production workflows.

## Files

- `13_admin_read_apis_security_test.json`
- `14_admin_write_apis_security_test.json`

All webhook paths end with `-security-test`, and both workflows are exported with
`active: false`.

## Manual test endpoints

Use these only after opening the imported workflow and selecting
`Listen for test event` in n8n:

Read-only:

- `GET /webhook-test/admin-orders-security-test`
- `GET /webhook-test/admin-payments-security-test`
- `GET /webhook-test/admin-products-security-test`
- `GET /webhook-test/admin-users-security-test`

Write:

- `POST /webhook-test/admin-product-update-security-test`
- `POST /webhook-test/admin-user-role-update-security-test`

The `/webhook/` form is a production URL and works only when a workflow is
active. Keep both TEST workflows inactive during the initial test rounds.

## Safe import and test order

1. Import both files into n8n without activating them.
2. Confirm the six webhook paths end in `-security-test`.
3. Confirm the LINE Login `client_id` is `2010570929`.
4. Run the read workflow in manual test mode first.
5. Verify a missing bearer token is rejected before any Google Sheets node runs.
6. Verify a random bearer token is rejected by LINE before any Google Sheets node runs.
7. Verify a valid non-Admin token cannot read Admin data.
8. Verify an inactive Admin cannot read Admin data.
9. Verify an active Admin can read all four endpoints.
10. Test write authorization boundaries only after selecting disposable test records.

## Write-test safety

The write-test workflow uses the same Google Sheets credentials and sheets as the
production workflow. A successful authorized request can change real data.

Do not test a successful product or Role update until a disposable product and
member have been explicitly selected. Negative tests with missing, malformed,
non-Admin, or unauthorized tokens should be run first.

## Cleanup

After production rollout and verification, deactivate and delete the two TEST
workflows from n8n. Then archive or remove this folder so it cannot be mistaken
for another production workflow set.
