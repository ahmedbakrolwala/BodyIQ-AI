# Authentication adapter contract

These adapters are deliberately provider-facing only. They do not create users, sessions, database records, or account links. The backend owns request validation, rate limits, token persistence/consumption, OAuth state and nonce persistence, native bridge codes, and HTTP error mapping.

## Password adapter

`server/auth/password.ts` exports:

```ts
hashPassword(password: string): Promise<string>
verifyPassword(password: string, encoded: string): Promise<boolean>
DUMMY_PASSWORD_HASH: string
```

Hashes use Node’s built-in `crypto.scrypt` with `N=131072`, `r=8`, `p=1`, a random 16-byte salt, a 64-byte digest, and `maxmem=256 MiB`. The encoded form is strict and self-describing:

```text
scrypt$N=131072,r=8,p=1$<base64url-16-byte-salt>$<base64url-64-byte-digest>
```

Verification rejects malformed hashes, alternate cost parameters, oversized encodings, and passwords longer than the application limit before any expensive derivation. A valid process-static dummy hash is derived from random startup material and is intended for the backend’s unknown-email login path so that the path still performs a comparable expensive derivation. Password comparison uses a constant-time comparison after exact-length validation. Password policy (minimum 12 characters, maximum 128 characters, and no trimming) remains a backend request-schema responsibility.

## Email adapter

`server/auth/mail.ts` exports:

```ts
isEmailDeliveryConfigured(): boolean
sendAuthEmail(input: {
  to: string
  purpose: "verify" | "reset"
  token: string
}): Promise<void>
```

Delivery is configured only when all of these are valid:

- `RESEND_API_KEY`
- `AUTH_EMAIL_FROM` as a verified sender address (plain email or safe display-name format)
- one fixed frontend origin, selected in this order: `AUTH_PUBLIC_FRONTEND_URL`, `EXPO_WEB_PREVIEW_URL`, then `EXPO_PUBLIC_FRONTEND_URL`

The adapter calls `https://api.resend.com/emails` with the API key in the authorization header and sends a minimal HTML/text message. Verification links use `/verify-email?token=...`; reset links use `/reset-password?token=...`. Tokens must be canonical base64url with at least 32 decoded bytes. The adapter never derives a link from a request host and never logs credentials or tokens.

All requests have a ten-second abort timeout. Missing/invalid configuration raises an `AuthEmailConfigurationError` with code `email_configuration_unavailable`. Network failures, timeouts, malformed provider responses, and non-2xx Resend responses raise an `AuthEmailProviderError` with code `email_provider_error`. A provider failure is never converted into a successful send result. The backend should map these safe errors to its public `email_unavailable` response without exposing their internal details.

## Google OIDC adapter

`server/auth/google-provider.ts` exports:

```ts
isGoogleConfigured(): boolean
getGoogleCallbackUri(): string
getFrontendAuthUri(path: string): string
buildGoogleAuthorizationUrl(input: {
  state: string
  nonce: string
  codeChallenge: string
}): string
exchangeGoogleCode(input: {
  code: string
  codeVerifier: string
  nonce: string
}): Promise<{
  subject: string
  email: string
  name: string
}>
```

Google credentials are read from `AUTH_GOOGLE_CLIENT_ID` / `AUTH_GOOGLE_CLIENT_SECRET`, with `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` accepted as deployment aliases. The callback API origin is selected from `AUTH_PUBLIC_API_URL`, then `EXPO_PUBLIC_API_BASE_URL`, and is normalized to its fixed origin before appending `/api/auth/google/callback`. No caller-supplied redirect URI is accepted by this adapter.

The frontend origin is selected from `AUTH_PUBLIC_FRONTEND_URL`, then `EXPO_WEB_PREVIEW_URL`, then `EXPO_PUBLIC_FRONTEND_URL`. Only `/oauth/callback` and `/auth/google-callback` are accepted by `getFrontendAuthUri`; arbitrary hosts, paths, query strings, and fragments cannot be supplied as redirect destinations. The preview URL is preferred over Metro’s local development port when it is the configured frontend origin.

Authorization URLs use Google’s authorization endpoint with `response_type=code`, `scope=openid email profile`, `code_challenge_method=S256`, the supplied state/nonce, the supplied PKCE challenge, `prompt=select_account`, and the fixed backend callback. Token exchange uses Google’s token endpoint, the client secret, the authorization code, the fixed callback, and the verifier. It has a ten-second abort timeout and does not log request bodies or provider responses.

The ID token is verified with `jose` and Google’s remote JWKS at `https://www.googleapis.com/oauth2/v3/certs`. Verification requires `RS256`, issuer `https://accounts.google.com`, the configured audience, a present unexpired `exp`, a present subject, `email_verified === true`, and a constant-time nonce match. The return value contains the Google subject, email, and display name only; identity linking or user/session creation is intentionally left to the backend, and matching email addresses must not automatically link different provider identities.

When credentials or required public origins are unavailable, capability checks return `false` and provider operations raise a safe `GoogleConfigurationError` with code `google_configuration_unavailable`. Provider/network/token-validation failures raise a safe `GoogleProviderError` with code `google_provider_error`. The backend should map configuration errors to its public `google_unavailable` response.

## Test boundary

`tests/auth-adapters.test.ts` uses mocked `fetch` and mocked `jose` verification. It does not call Resend, Google, or a live JWKS endpoint, and test assertions avoid printing secret values or action-token contents. The tests cover fresh password salts, wrong passwords, malformed/altered-cost hashes, unavailable providers, non-success provider responses, fixed redirect construction, PKCE/state/nonce parameters, and rejection of unverified or nonce-mismatched Google claims.
