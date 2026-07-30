# Admin LINE ID Token Hardening — Phase 2

Status: backend and frontend drafts complete; not deployed.

## Authentication contract

Admin endpoints no longer trust `uid`, `adminUid` or `lineUid` as proof of identity. The client must send:

```http
Authorization: Bearer <LIFF ID token>
```

Each webhook extracts the bearer token and verifies it server-side with:

```text
POST https://api.line.me/oauth2/v2.1/verify
id_token=<token>
client_id=2010570929
```

Only the verified `sub` claim is used as the LINE UID. LINE's verify endpoint validates the token signature, issuer, audience and expiry.

Official references:

- https://developers.line.biz/en/docs/line-login/verify-id-token/
- https://developers.line.biz/en/docs/liff/using-user-profile/

## Frontend contract

The Admin frontend now initializes LIFF on every Admin page, obtains the ID token with `liff.getIDToken()`, and sends it in the `Authorization` header for all Workflow 13 and 14 requests.

- The Admin UID is no longer accepted from the URL.
- Legacy `uid` query parameters are removed from the visible URL after LIFF initialization.
- Product and user-role update payloads no longer contain the acting Admin UID.
- The display name from `liff.getProfile()` is used for UI context only, never for authorization.
- Updated assets use cache version `20260730-auth1`.

CORS preflight was verified against the production n8n host on 2026-07-30. `admin-orders` allowed `authorization`; `admin-product-update` allowed `authorization,content-type`; both restricted the allowed origin to `https://beginth.github.io`.

## Authorization policy

| Operation | Required authorization |
|---|---|
| Admin read APIs | UID exists in `Admins` and `Status=active` |
| Product update | Active Admin with exact Role `owner` or `approver` |
| User Role update | Active Admin with exact Role `owner` |
| Change own Role | Denied |

## Safe rollout order

1. Do not activate the hardened workflows yet.
2. Frontend change is prepared locally; do not publish it against the legacy workflows.
3. Import hardened workflows 13 and 14 under temporary names.
4. Test using n8n test webhooks or temporary non-production paths.
5. Test missing, malformed, expired and wrong-audience tokens.
6. Test Viewer/Accounting/Approver/Owner authorization boundaries.
7. Switch production webhook ownership only after all tests pass.
8. Publish the Admin frontend immediately after the hardened production webhooks are active.

## Required tests

- Missing Authorization header returns an error and performs no sheet read/write.
- Random bearer token is rejected by LINE.
- Valid non-Admin token is rejected after LINE verification.
- Inactive Admin is rejected.
- Active Admin can read Admin pages.
- Approver can update a product but cannot update a user Role.
- Owner can update a product and another user's Role.
- Owner cannot change their own Role.
- Invalid product status, negative price and invalid image URL are rejected.

## Rollback

Deactivate the hardened workflows and reactivate the exact live exports stored under `outputs/archive/retired-modular-2026-07-30/live-exports/`. Never keep both old and hardened workflows active on the same webhook path.
