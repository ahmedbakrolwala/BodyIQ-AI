# BodyIQ authentication implementation contract

Extend the existing Expo/React Native app, Express backend and managed MySQL database. Preserve Manus login, signed project JWT/cookie compatibility, existing user/profile IDs and native identifiers. Credentials for Google and Resend were cancelled by the user; provider-dependent requests must return explicit unavailable errors, never fake success or bypass verification.

## Runtime API

`GET /api/auth/capabilities`: `{ google: boolean, emailPassword: true, emailDelivery: boolean, accountDeletion: true }`.

`POST /api/auth/register`: `{name,email,password}` → 202 `{message,email}` only after actual mail delivery. No session until email is verified. Missing delivery configuration → 503 `email_unavailable`. Duplicate email has a generic response and never overwrites a password.

`POST /api/auth/login`: `{email,password}` → `{user,sessionToken?}`. On web set the fixed HttpOnly application cookie, not JS/localStorage token; return native token only for native client. Invalid credentials 401; correct credentials for unverified account 403 `email_unverified`.

`POST /api/auth/verify-email`: `{token}` → `{message}`. `POST /api/auth/resend-verification`: `{email}` → generic `{message}`. Token is random, SHA256-hashed at rest, single-use, expires in 24 hours.

`POST /api/auth/forgot-password`: `{email}` → generic `{message}` after eligible-account request. `POST /api/auth/reset-password`: `{token,password}` → `{message}`. Reset token expires in 30 minutes, is single-use, and resetting revokes all sessions and other reset tokens. Never auto-login after reset.

`GET /api/auth/google/start` for web → OAuth redirect. `POST /api/auth/google/start` for native `{redirectUri,verifier}` → `{authorizationUrl}`. Google always redirects to fixed configured backend `/api/auth/google/callback`, with persisted one-use state/nonce and PKCE binding. Validate RS256 Google ID token signature, issuer, audience, exp, nonce, verified email and subject. Native completion uses a one-use verifier-bound bridge code, not a JWT in a URL: `POST /api/auth/google/exchange` `{code,verifier}` → `{sessionToken,user}`. Frontend native callback route `/auth/google-callback` receives `code` only. Web success redirects to existing `/oauth/callback` which validates `/api/auth/me`. Missing Google credentials → 503 `google_unavailable`. No automatic linking of different identities by matching email.

`GET /api/auth/me`: retain existing shape `{user:{id,openId,name,email,loginMethod,lastSignedIn,...}}`, optionally include `emailVerified` and `requiresReauthentication`/`canDeleteWithPassword` metadata if supplied. `POST /api/auth/logout` revokes server-side session before clearing existing cookies. `POST /api/auth/account/delete`: `{confirmation:'DELETE MY ACCOUNT',password?}` → `{success:true}`. Require credential proof for password accounts or managed session authenticated within 10 minutes for OAuth. Reject older sessions with `reauth_required`. Delete only current user's account/profile/fitness/auth data through cascades, record a non-PII revocation marker to prevent old legacy JWTs from silently recreating deleted accounts, and clear cookies. Never delete the user's Google/Manus provider account.

## Shared safety

Password minimum 12 and maximum 128 characters; allow spaces, never trim passwords. Names 1–60 characters. Normalize email with trim/lowercase only. Request schemas strict. Use Node scrypt N=131072,r=8,p=1, random16-byte salt, output64-byte hash; allow sufficient maxmem. Use constant-time comparisons and an expensive dummy hash for unknown-email login. SQL transaction/atomic token consumption handles races. Persistent rate limits cover registration, login, token emails, reset and deletion. HTTP auth bodies should be limited (32 KiB) before the starter's large JSON body parser. Cookie writes protected by CORS/Origin plus JSON or an application client header; native bearer callers supported.

Store credentials, sessions, action tokens, Google state/bridge and throttling records in new additive Drizzle tables. Revocable 30-day signed application sessions include random `sid`; store hashed SID server-side, check expiry/revocation/user binding in SDK authentication. Preserve existing Manus identities but issue managed sessions on new Manus logins; handle old tokens through persisted token revocation/deletion checks.

Main agent owns frontend, client auth wrappers, docs, root routes and final integration. Backend agent owns schema, server/auth (except adapters listed below), SDK/oauth/session integration and auth tests. Adapter agent owns server/auth/password.ts, mail.ts, google-provider.ts plus adapter tests only. No concurrent edits across these ownership boundaries.
