import { createHash, randomBytes } from "node:crypto";
import type { User } from "../../drizzle/schema";
import { authStore as defaultStore, generateOpenId } from "./store";
import type { AuthAdapters, AuthClock, AuthStore } from "./types";

export const GENERIC_AUTH_MESSAGE =
  "If the account is eligible, an email will be sent.";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 30 * 60 * 1000;
export const BRIDGE_TTL_MS = 2 * 60 * 1000;

export class AuthFailure extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message = code,
  ) {
    super(message);
  }
}

export const normalizeEmail = (value: unknown): string => {
  if (typeof value !== "string") throw new AuthFailure("invalid_email", 400);
  const email = value.trim().toLowerCase();
  if (
    email.length < 3 ||
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new AuthFailure("invalid_email", 400);
  }
  return email;
};

export const validatePassword = (value: unknown): string => {
  if (typeof value !== "string" || value.length < 12 || value.length > 128) {
    throw new AuthFailure("invalid_password", 400);
  }
  return value;
};

export const validateName = (value: unknown): string => {
  if (typeof value !== "string" || value.length < 1 || value.length > 60) {
    throw new AuthFailure("invalid_name", 400);
  }
  return value;
};

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");
export const randomToken = (bytes = 32): string =>
  randomBytes(bytes).toString("base64url");

export function publicUser(
  user: User,
  credential?: { emailVerifiedAt: Date | null } | null,
) {
  return {
    id: user.id,
    openId: user.openId,
    name: user.name,
    email: user.email,
    loginMethod: user.loginMethod,
    lastSignedIn: user.lastSignedIn.toISOString(),
    emailVerified: credential ? Boolean(credential.emailVerifiedAt) : undefined,
  };
}

export class AuthService {
  constructor(
    private readonly store: AuthStore = defaultStore,
    private readonly adapters: AuthAdapters,
    private readonly now: AuthClock = () => new Date(),
    private readonly sessionIssuer?: (
      userId: number,
      user: User,
      sid: string,
    ) => Promise<string>,
  ) {}

  private async rateLimit(
    action: string,
    key: string,
    maxAttempts: number,
    windowMs = 15 * 60 * 1000,
  ) {
    const allowed = await this.store.consumeRateLimit(
      hashToken(`${action}:${key}`),
      this.now(),
      windowMs,
      maxAttempts,
    );
    if (!allowed) throw new AuthFailure("rate_limited", 429);
  }

  private async issueSession(
    userId: number,
    reauthenticatedAt?: Date,
    passwordHash?: string,
  ) {
    const sid = randomToken(32);
    const now = this.now();
    const record = {
      sidHash: hashToken(sid),
      userId,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      reauthenticatedAt,
    };
    if (passwordHash) {
      if (
        !(await this.store.createSessionForCredential({
          ...record,
          passwordHash,
        }))
      )
        throw new AuthFailure("invalid_credentials", 401);
    } else await this.store.createSession(record);
    if (!this.sessionIssuer) return sid;
    const user = await this.store.getUserById(userId);
    if (!user) throw new AuthFailure("not_authenticated", 401);
    // The persisted SID is the revocation authority; the signed token only transports it.
    return this.sessionIssuer(userId, user, sid);
  }

  async register(input: { name: unknown; email: unknown; password: unknown }) {
    const name = validateName(
      typeof input.name === "string" ? input.name.trim() : input.name,
    );
    const email = normalizeEmail(input.email);
    const password = validatePassword(input.password);
    await this.rateLimit("register", email, 5, 60 * 60 * 1000);
    if (!this.adapters.isEmailDeliveryConfigured())
      throw new AuthFailure("email_unavailable", 503);
    const existing = await this.store.getCredentialByEmail(email);
    if (existing) return { message: GENERIC_AUTH_MESSAGE, email };
    const passwordHash = await this.adapters.hashPassword(password);
    let user: User;
    try {
      user = await this.store.createEmailUser({
        name,
        email,
        passwordHash,
        openId: generateOpenId("email"),
      });
    } catch (error) {
      if (await this.store.getCredentialByEmail(email))
        return { message: GENERIC_AUTH_MESSAGE, email };
      throw error;
    }
    const token = randomToken();
    await this.store.createActionToken({
      tokenHash: hashToken(token),
      userId: user.id,
      purpose: "verify",
      expiresAt: new Date(this.now().getTime() + VERIFY_TTL_MS),
    });
    try {
      await this.adapters.sendAuthEmail({
        to: email,
        purpose: "verify",
        token,
      });
    } catch {
      await this.store.rollbackUnverifiedRegistration(user.id);
      throw new AuthFailure("email_unavailable", 503);
    }
    return { message: GENERIC_AUTH_MESSAGE, email };
  }

  async login(input: { email: unknown; password: unknown }) {
    const email = normalizeEmail(input.email);
    const password =
      typeof input.password === "string" &&
      input.password.length > 0 &&
      input.password.length <= 128
        ? input.password
        : "";
    if (!password) throw new AuthFailure("invalid_credentials", 401);
    await this.rateLimit("login", email, 10);
    const credential = await this.store.getCredentialByEmail(email);
    if (!credential) {
      await this.adapters.verifyPassword(
        password,
        this.adapters.dummyPasswordHash,
      );
      throw new AuthFailure("invalid_credentials", 401);
    }
    if (
      !(await this.adapters.verifyPassword(password, credential.passwordHash))
    )
      throw new AuthFailure("invalid_credentials", 401);
    if (!credential.emailVerifiedAt)
      throw new AuthFailure("email_unverified", 403);
    const user = await this.store.getUserById(credential.userId);
    if (!user) throw new AuthFailure("invalid_credentials", 401);
    const sessionToken = await this.issueSession(
      user.id,
      this.now(),
      credential.passwordHash,
    );
    return { user: publicUser(user, credential), sessionToken };
  }

  async verifyEmail(token: unknown) {
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new AuthFailure("invalid_token", 400);
    await this.rateLimit("verify-token", hashToken(token), 10);
    if (
      !(await this.store.completeEmailVerification(
        hashToken(token),
        this.now(),
      ))
    )
      throw new AuthFailure("invalid_token", 400);
    return { message: "Email verified. You can now sign in." };
  }

  async resendVerification(emailInput: unknown) {
    const email = normalizeEmail(emailInput);
    await this.rateLimit("verification-email", email, 5, 60 * 60 * 1000);
    if (!this.adapters.isEmailDeliveryConfigured())
      throw new AuthFailure("email_unavailable", 503);
    const credential = await this.store.getCredentialByEmail(email);
    if (credential && !credential.emailVerifiedAt) {
      const token = randomToken();
      await this.store.createActionToken({
        tokenHash: hashToken(token),
        userId: credential.userId,
        purpose: "verify",
        expiresAt: new Date(this.now().getTime() + VERIFY_TTL_MS),
      });
      try {
        await this.adapters.sendAuthEmail({
          to: email,
          purpose: "verify",
          token,
        });
      } catch {
        throw new AuthFailure("email_unavailable", 503);
      }
    }
    return { message: GENERIC_AUTH_MESSAGE };
  }

  async forgotPassword(emailInput: unknown) {
    const email = normalizeEmail(emailInput);
    await this.rateLimit("forgot-password", email, 5, 60 * 60 * 1000);
    if (!this.adapters.isEmailDeliveryConfigured())
      throw new AuthFailure("email_unavailable", 503);
    const credential = await this.store.getCredentialByEmail(email);
    if (credential) {
      const token = randomToken();
      await this.store.createActionToken({
        tokenHash: hashToken(token),
        userId: credential.userId,
        purpose: "reset",
        expiresAt: new Date(this.now().getTime() + RESET_TTL_MS),
      });
      try {
        await this.adapters.sendAuthEmail({
          to: email,
          purpose: "reset",
          token,
        });
      } catch {
        throw new AuthFailure("email_unavailable", 503);
      }
    }
    return { message: GENERIC_AUTH_MESSAGE };
  }

  async resetPassword(input: { token: unknown; password: unknown }) {
    if (
      typeof input.token !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(input.token)
    )
      throw new AuthFailure("invalid_token", 400);
    const password = validatePassword(input.password);
    await this.rateLimit("reset-token", hashToken(input.token), 5);
    const passwordHash = await this.adapters.hashPassword(password);
    if (
      !(await this.store.completePasswordReset({
        tokenHash: hashToken(input.token),
        passwordHash,
        now: this.now(),
      }))
    )
      throw new AuthFailure("invalid_token", 400);
    return {
      message:
        "Password reset. Existing sessions are signed out. Please sign in again.",
    };
  }

  async authenticateSession(sid: string) {
    const record = await this.store.getSession(hashToken(sid));
    if (!record || record.revokedAt || record.expiresAt <= this.now())
      throw new AuthFailure("not_authenticated", 401);
    const user = await this.store.getUserById(record.userId);
    if (!user) throw new AuthFailure("not_authenticated", 401);
    await this.store.touchSession(record.sidHash, this.now());
    const credential = await this.store.getCredentialByUserId(user.id);
    const identities = await this.store.getIdentitiesByUserId(user.id);
    const authProvider = credential
      ? "email"
      : identities.some((identity) => identity.provider === "google")
        ? "google"
        : "manus";
    return { user, session: record, credential, identities, authProvider };
  }

  async logout(sid: string | undefined) {
    if (sid) await this.store.revokeSession(hashToken(sid), this.now());
    return { success: true } as const;
  }

  async deleteAccount(input: {
    userId: number;
    password?: unknown;
    sessionReauthenticatedAt?: Date | null;
    sessionSidHash: string;
  }) {
    await this.rateLimit("delete-account", String(input.userId), 5);
    const credential = await this.store.getCredentialByUserId(input.userId);
    if (credential) {
      const password = validatePassword(input.password);
      if (
        !(await this.adapters.verifyPassword(password, credential.passwordHash))
      )
        throw new AuthFailure("invalid_credentials", 401);
    } else {
      if (
        !input.sessionReauthenticatedAt ||
        this.now().getTime() - input.sessionReauthenticatedAt.getTime() >
          10 * 60 * 1000
      )
        throw new AuthFailure("reauth_required", 403);
    }
    const user = await this.store.getUserById(input.userId);
    if (!user) throw new AuthFailure("not_authenticated", 401);
    if (
      !(await this.store.deleteAccountData({
        userId: user.id,
        identityHash: hashToken(user.openId),
        sidHash: input.sessionSidHash,
        now: this.now(),
        passwordHash: credential?.passwordHash,
      }))
    )
      throw new AuthFailure("not_authenticated", 401);
    return { success: true } as const;
  }

  async googleUser(input: { subject: string; email: string; name: string }) {
    const email = normalizeEmail(input.email);
    if (!input.subject || input.subject.length > 255)
      throw new AuthFailure("invalid_google_identity", 400);
    const existingIdentity = await this.store.findIdentity(
      "google",
      input.subject,
    );
    if (existingIdentity) {
      const user = await this.store.getUserById(existingIdentity.userId);
      if (!user) throw new AuthFailure("invalid_google_identity", 401);
      return user;
    }
    // Deliberately do not link by email: a matching email without the provider subject is a new identity conflict.
    return this.store.createOAuthUser({
      name: validateName(input.name.trim().slice(0, 60) || "Google user"),
      email,
      openId: generateOpenId("google"),
      provider: "google",
      subject: input.subject,
    });
  }

  async issueOAuthSession(user: User) {
    return this.issueSession(user.id, this.now());
  }

  async createGoogleState(input: {
    state: string;
    nonce: string;
    verifier: string;
    kind: "web" | "native";
    redirectUri: string | null;
  }) {
    await this.store.createOAuthState({
      stateHash: hashToken(input.state),
      nonceHash: hashToken(input.nonce),
      verifierHash: hashToken(input.verifier),
      kind: input.kind,
      redirectUri: input.redirectUri,
      expiresAt: new Date(this.now().getTime() + 10 * 60 * 1000),
      consumedAt: null,
    });
  }

  async consumeGoogleState(state: string) {
    const record = await this.store.consumeOAuthState(
      hashToken(state),
      this.now(),
    );
    if (!record) throw new AuthFailure("invalid_oauth_state", 400);
    return record;
  }

  async createBridgeCode(userId: number, verifier: string) {
    const code = randomToken(32);
    await this.store.createBridgeCode({
      codeHash: hashToken(code),
      verifierHash: hashToken(verifier),
      userId,
      expiresAt: new Date(this.now().getTime() + BRIDGE_TTL_MS),
      consumedAt: null,
    });
    return code;
  }

  async exchangeBridgeCode(code: string, verifier: string) {
    const record = await this.store.consumeBridgeCode(
      hashToken(code),
      hashToken(verifier),
      this.now(),
    );
    if (!record) throw new AuthFailure("invalid_oauth_code", 400);
    const user = await this.store.getUserById(record.userId);
    if (!user) throw new AuthFailure("invalid_oauth_code", 400);
    return {
      user: publicUser(user),
      sessionToken: await this.issueOAuthSession(user),
    };
  }

  async isLegacyIdentityRevoked(openId: string) {
    return this.store.hasRevocation(hashToken(openId));
  }
}
