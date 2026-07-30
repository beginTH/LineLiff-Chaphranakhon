# Admin LINE ID Token Hardening — Phase 2

Status: backend workflow draft only; not deployed.

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

## Authorization policy

| Operation | Required authorization |
|---|---|
| Admin read APIs | UID exists in `Admins` and `Status=active` |
| Product update | Active Admin with exact Role `owner` or `approver` |
| User Role update | Active Admin with exact Role `owner` |
| Change own Role | Denied |

## Safe rollout order

1. Do not activate the hardened workflows yet.
2. Update the Admin frontend to send a LIFF ID token.
3. Import hardened workflows 13 and 14 under temporary names.
4. Test using n8n test webhooks or temporary non-production paths.
5. Test missing, malformed, expired and wrong-audience tokens.
6. Test Viewer/Accounting/Approver/Owner authorization boundaries.
7. Switch production webhook ownership only after all tests pass.

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
