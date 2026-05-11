# Phase 1 — SSO / OIDC Authentication

Provider-agnostic OpenID Connect client. Works with **any** standards-compliant
IdP — Lions Member Service Center, Auth0, Keycloak, Okta, Google Workspace,
Microsoft Entra ID — once you fill in the environment variables.

> ⚠️ Lions Clubs International does not publish an open OIDC issuer for
> arbitrary third parties. You must request credentials through LCI / your
> Multiple District or stand up your own IdP that federates Lions members.

## Environment variables

```dotenv
LIONS_OIDC_ISSUER=https://login.example.com/realms/lions
LIONS_OIDC_DISCOVERY_URL=             # optional override
LIONS_OIDC_CLIENT_ID=lcr-crm
LIONS_OIDC_CLIENT_SECRET=
LIONS_OIDC_REDIRECT_URI=https://YOUR_DOMAIN/api/auth/oidc/callback
LIONS_OIDC_SCOPES=openid profile email
LIONS_OIDC_AUDIENCE=                  # optional
LIONS_OIDC_PROVIDER_LABEL=Lions
```

When all of `LIONS_OIDC_ISSUER`, `LIONS_OIDC_CLIENT_ID`, and
`LIONS_OIDC_REDIRECT_URI` are set, `/api/auth/oidc/*` becomes live.
Otherwise those routes return `503 oidc_not_configured`.

## Endpoints

| Method | Path                                  | Purpose                              |
|--------|---------------------------------------|--------------------------------------|
| GET    | `/api/auth/oidc/login?return_to=...`  | Begin SSO. Redirects to the IdP.     |
| GET    | `/api/auth/oidc/callback`             | OIDC callback — code exchange & userinfo. |
| GET    | `/api/auth/oidc/logout?return_to=...` | Local + RP-initiated logout.         |
| POST   | `/api/auth/oidc/refresh`              | Refresh stored tokens (server-side). |

### Login flow

1. `GET /api/auth/oidc/login` — generates PKCE verifier, state, and nonce;
   stores them in short-lived HttpOnly cookies; redirects to the IdP's
   `authorization_endpoint`.
2. IdP authenticates the member and redirects back with `?code=...&state=...`.
3. Callback verifies `state`, exchanges `code` for tokens (PKCE proof),
   fetches `userinfo`, validates the `nonce` claim in the ID token, and
   upserts the row in `public.oauth_accounts`.
4. An `oauth.login` entry is written to `public.audit_logs`.
5. Browser is redirected back to `return_to` (default `/admin`).

### Token refresh

`POST /api/auth/oidc/refresh` accepts `{ subject, provider? }` and uses
the stored `refresh_token` to mint a new access token, updating
`oauth_accounts` in place.

## Security notes

- All transient cookies are `HttpOnly`, `SameSite=Lax`, and TLS-only in
  production.
- PKCE (`S256`) is mandatory — no plain code flow is supported.
- `state` and `nonce` are 24-byte CSPRNG values, base64url encoded.
- ID-token signatures are **not** JWKS-verified yet — only the payload is
  parsed for the nonce binding. The code-flow exchange itself rides on
  TLS and the PKCE challenge; tightening to full JWS verification is a
  Phase 12 item.
- Tokens are stored in `oauth_accounts` and only retrievable via the
  service-role client (RLS forbids client-side reads of other rows).

## Mapping Lions claims to local records

The IdP is expected to surface these custom claims in `userinfo` (names
are configurable on the IdP side):

| Claim              | Maps to                       |
|--------------------|-------------------------------|
| `sub`              | `oauth_accounts.subject`      |
| `email`            | `members.email`               |
| `lions_member_id`  | `members.lions_member_id`     |
| `district_code`    | resolve → `members.district_id` |
| `club_id`          | resolve → `members.club_id`   |
| `roles[]`          | promoted to `lions_role`      |

Mapping logic lives in `src/lib/oidc/persistence.ts` (and will be
extended in Phase 2 to set `members.lions_role` from the claims).
