# BodyIQ AI authentication

## Delivery status

The existing Expo/React Native/TypeScript application now has backend-connected email/password account screens, verification/resend, forgot/reset, account security, persistent sign-in, sign-out, deletion, and a separate Google OpenID Connect flow. Manus sign-in, guest exploration, the five fitness tabs, sample-mode controls, and real cloud profile editing are preserved.

**Live external-provider activation is blocked.** The protected Google/email configuration form was cancelled. `GET /api/auth/capabilities` currently reports `google: false`, `emailPassword: true`, and `emailDelivery: false`. Google and new email registration/verification/recovery are not simulated. Existing verified password accounts can sign in; Manus access remains available. No real verification or reset emails were sent during this task.

## Authentication architecture

`server/auth/` separates routes, lifecycle services, the transactional Drizzle store, scrypt, Resend delivery, Google identity validation, and encrypted OAuth state. `lib/account-auth.ts` calls the backend; `hooks/use-auth.tsx` shares authenticated state and removes private query caches when the account changes or signs out. `components/bodyiq/auth-form.tsx` supplies reusable accessible fields, password visibility, loading, errors and account-screen layout.

Eight additive authentication tables were migrated to managed MySQL using `drizzle/0002_lowly_colleen_wing.sql`. Existing user/fitness tables were retained. Credentials, sessions, action tokens, provider identities and bridge codes reference the owning user; account deletion cascades through that user's records. Rate limits and non-PII revocation hashes persist separately.

## Security behavior

Passwords use salted scrypt (`N=131072`, `r=8`, `p=1`, 16-byte salts, 64-byte digests), never plaintext. Registration and reset require 12–128 characters; password whitespace is not trimmed. Unknown-email login performs a dummy password derivation. Credentials are separate from public user/profile responses.

New sessions last up to 30 days and carry a signed, app-bound JWT transporting a random SID. Only the SID hash is retained in the session table. JWT validity alone does not authorize access: the live SID, expiry, revocation, user ID and identity binding are checked. Native JWTs use Expo SecureStore; browser authentication uses HttpOnly cookies with `SameSite=None; Secure` on public HTTPS Preview. Browser user-profile caches are not kept in localStorage. Cookies remain subject to browser third-party-cookie policies.

Verification links expire after 24 hours; reset links after 30 minutes. Tokens have 256-bit entropy and are hashed in MySQL. Verification completion is transactional and consumes sibling verification tokens. Password reset atomically changes the hash, consumes reset tokens and revokes all sessions. Credential-bound login insertion prevents a concurrent old-password login from creating a session after reset.

Deletion requires the exact `DELETE MY ACCOUNT` phrase and current-password proof, or a provider sign-in within ten minutes. A controlled modal asks for final confirmation. The backend ignores client-supplied user IDs and rechecks the session owner/proof inside the deletion transaction. User deletion and its tombstone are committed atomically; other users are preserved. Old deleted Manus identities cannot silently recreate records through legacy callbacks. Deleting BodyIQ does not delete the external Google or Manus account.

Google uses server-side authorization-code exchange, PKCE S256, a nonce, a fixed callback origin and RS256 OIDC validation against Google JWKS. Verified email, subject, issuer, audience, expiration and nonce are checked. OAuth state is authenticated/encrypted using AES-256-GCM; raw PKCE verifiers never appear in state URLs or database state records. Web callbacks require an HttpOnly browser-binding cookie. Native return URIs are restricted to this application's scheme or exact managed Expo host. Native bridge codes are short-lived, one-use and verifier-bound; they do not place session JWTs in deep-link URLs. Matching email addresses do not automatically merge distinct provider accounts.

REST and legacy Manus auth JSON bodies are limited to 32 KiB. Strict body fields, allowlisted CORS origins, cookie-request protections, persistent per-email/per-IP throttles, no-store auth responses and no-referrer token pages are included. The existing tRPC logout also revokes the current session and clears both session cookie names. Errors returned to clients are sanitized human-readable messages plus stable machine codes. No password or token logging is added.

## Provider setup

Configure protected backend secrets—not React Native public variables:

| Name | Requirement |
| --- | --- |
| `AUTH_GOOGLE_CLIENT_ID` | Google Web OAuth client ID (`GOOGLE_CLIENT_ID` alias supported) |
| `AUTH_GOOGLE_CLIENT_SECRET` | Corresponding secret (`GOOGLE_CLIENT_SECRET` alias supported) |
| `RESEND_API_KEY` | Transactional email API key |
| `AUTH_EMAIL_FROM` | A Resend-verified sender; plain email or `BodyIQ AI <auth@your-domain>` |

The frontend/backend public origins must resolve to the correct fixed deployment. `AUTH_PUBLIC_FRONTEND_URL` and `AUTH_PUBLIC_API_URL` may be set for production; otherwise managed public preview values are used. Public auth links/callbacks require HTTPS; HTTP is permitted only for loopback development. Native packager addresses remain supplied by Manus, not hardcoded.

Register the exact `<public API origin>/api/auth/google/callback` in the Google OAuth console. The client secret must never be embedded in native builds. Restart the API after protected environment synchronization, confirm capabilities, then test actual Google consent, email delivery and native deep links. Sandbox Preview addresses are temporary; configure stable published origins for a released app.

## Validation and limits

Deterministic tests use isolated memory stores, real scrypt and real signed JWT transport, and mocked provider calls. They cover registration/verification, login, cookie/native session transport, restart persistence, logout, reset, expired/replayed/tampered tokens, ownership, deletion, atomic-failure preservation, throttling-related behavior, and fail-closed providers. Google regressions cover encrypted state tampering, native callback allowlists, browser binding and the original PKCE verifier. The SQL transaction code was reviewed; tests do not mutate live user data to simulate SQL races.

The auth database schema and fail-closed provider responses were checked against the real API. New auth layouts were checked at narrow mobile widths, and the public account UI was checked for provider messages and navigation. All 67 tests across 11 suites pass with no skipped tests. TypeScript, targeted ESLint and backend compilation pass. Web/Android/iOS JavaScript exports were built; no signed APK/AAB/IPA or physical-phone OAuth test is claimed. External Google/email end-to-end testing must follow configuration.

Operational release work should include verified sender/domain setup, provider consent configuration, production HTTPS origins, device testing, trusted-proxy review, appropriate memory sizing for scrypt, and retention/cleanup policies for expired authentication records. This is not a third-party security certification.
