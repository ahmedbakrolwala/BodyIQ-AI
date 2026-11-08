# Authentication security references

Passwords use random salts and Node’s memory-hard scrypt at N=131072,r=8,p=1, following OWASP’s scrypt fallback guidance. Raw passwords are never persisted, logged or included in emails. [1]

Verification/reset actions use cryptographically random, hashed, expiring, single-use tokens. Password reset revokes existing sessions and does not automatically log the user in. Email URLs are built only from configured public origins, never an incoming Host header. Generic account-recovery responses and persistent throttling reduce enumeration and inbox flooding. [2]

Google uses server-side authorization-code exchange, state/nonce binding and PKCE. ID-token signature, issuer, audience, expiry, nonce, subject and verified email are validated before account lookup. Google subject, not matching email alone, identifies the account. [3]

## References

[1]: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html "OWASP Password Storage Cheat Sheet"
[2]: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html "OWASP Forgot Password Cheat Sheet"
[3]: https://developers.google.com/identity/openid-connect/openid-connect "Google OpenID Connect server-side identity guide"
