import { createHash } from "node:crypto";
import type { User } from "../../drizzle/schema";
import {
  hashPassword,
  verifyPassword,
  DUMMY_PASSWORD_HASH,
} from "../../server/auth/password";
import { hashToken } from "../../server/auth/service";
import type {
  ActionTokenRecord,
  AuthAdapters,
  AuthStore,
  BridgeCodeRecord,
  CredentialRecord,
  IdentityRecord,
  OAuthStateRecord,
  SessionRecord,
} from "../../server/auth/types";

export type SentAuthEmail = {
  to: string;
  purpose: "verify" | "reset";
  token: string;
};

type OwnedData = {
  profiles: Map<number, unknown>;
  nutrition: Map<number, unknown>;
  workouts: Map<number, unknown>;
  progress: Map<number, unknown>;
  conversations: Map<number, unknown>;
};

/**
 * A deliberately small, process-local store for auth tests. Mutating methods
 * validate all ownership and proof predicates before changing any state so the
 * tests exercise the same atomic boundaries as the SQL implementation.
 */
export class MemoryAuthStore implements AuthStore {
  private nextId = 1;
  users = new Map<number, User>();
  credentials = new Map<number, CredentialRecord>();
  sessions = new Map<string, SessionRecord>();
  actions = new Map<string, ActionTokenRecord>();
  identities: IdentityRecord[] = [];
  states = new Map<string, OAuthStateRecord>();
  bridges = new Map<string, BridgeCodeRecord>();
  limits = new Map<
    string,
    { started: number; count: number; blockedUntil?: number }
  >();
  revocations = new Set<string>();
  deleted: number[] = [];
  ownedData: OwnedData = {
    profiles: new Map(),
    nutrition: new Map(),
    workouts: new Map(),
    progress: new Map(),
    conversations: new Map(),
  };
  /** Test hook for proving a failed transaction leaves state unchanged. */
  failBeforeCommit = false;

  async getUserById(userId: number) {
    return this.users.get(userId);
  }

  async getUserByEmail(email: string) {
    return [...this.users.values()].find((user) => user.email === email);
  }

  async getCredentialByEmail(email: string) {
    return [...this.credentials.values()].find(
      (credential) => credential.email === email,
    );
  }

  async getCredentialByUserId(userId: number) {
    return this.credentials.get(userId);
  }

  async createEmailUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    openId: string;
  }) {
    if (
      [...this.credentials.values()].some(
        (credential) => credential.email === input.email,
      )
    ) {
      throw new Error("duplicate credential");
    }
    const id = this.nextId++;
    const now = new Date();
    const user: User = {
      id,
      openId: input.openId,
      name: input.name,
      email: input.email,
      loginMethod: "email",
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
    this.users.set(id, user);
    this.credentials.set(id, {
      userId: id,
      email: input.email,
      passwordHash: input.passwordHash,
      emailVerifiedAt: null,
    });
    return user;
  }

  async setCredentialPassword(userId: number, passwordHash: string) {
    const credential = this.credentials.get(userId);
    if (!credential) throw new Error("credential missing");
    this.credentials.set(userId, { ...credential, passwordHash });
  }

  async completePasswordReset(input: {
    tokenHash: string;
    passwordHash: string;
    now: Date;
  }) {
    const token = this.actions.get(input.tokenHash);
    if (
      !token ||
      token.purpose !== "reset" ||
      token.consumedAt ||
      token.expiresAt <= input.now
    )
      return false;
    const credential = this.credentials.get(token.userId);
    if (!credential || this.failBeforeCommit) return false;

    // Commit all reset effects as one synchronous in-memory transaction.
    token.consumedAt = input.now;
    this.credentials.set(token.userId, {
      ...credential,
      passwordHash: input.passwordHash,
    });
    for (const session of this.sessions.values()) {
      if (session.userId === token.userId) session.revokedAt = input.now;
    }
    for (const candidate of this.actions.values()) {
      if (
        candidate.userId === token.userId &&
        candidate.purpose === "reset" &&
        !candidate.consumedAt
      ) {
        candidate.consumedAt = input.now;
      }
    }
    return true;
  }

  async completeEmailVerification(tokenHashValue: string, now: Date) {
    const token = this.actions.get(tokenHashValue);
    if (
      !token ||
      token.purpose !== "verify" ||
      token.consumedAt ||
      token.expiresAt <= now
    )
      return false;
    const credential = this.credentials.get(token.userId);
    if (!credential || credential.emailVerifiedAt || this.failBeforeCommit)
      return false;

    // Verification consumes every outstanding verification token for the user.
    token.consumedAt = now;
    this.credentials.set(token.userId, { ...credential, emailVerifiedAt: now });
    for (const candidate of this.actions.values()) {
      if (
        candidate.userId === token.userId &&
        candidate.purpose === "verify" &&
        !candidate.consumedAt
      ) {
        candidate.consumedAt = now;
      }
    }
    return true;
  }

  async rollbackUnverifiedRegistration(userId: number) {
    const credential = this.credentials.get(userId);
    if (credential?.emailVerifiedAt) return;
    this.users.delete(userId);
    this.credentials.delete(userId);
    for (const [key, token] of this.actions)
      if (token.userId === userId) this.actions.delete(key);
    for (const [key, session] of this.sessions)
      if (session.userId === userId) this.sessions.delete(key);
    this.identities = this.identities.filter(
      (identity) => identity.userId !== userId,
    );
  }

  async createSessionForCredential(input: {
    sidHash: string;
    userId: number;
    expiresAt: Date;
    reauthenticatedAt?: Date;
    passwordHash: string;
  }) {
    const credential = this.credentials.get(input.userId);
    if (
      !credential ||
      !credential.emailVerifiedAt ||
      credential.passwordHash !== input.passwordHash
    )
      return false;
    if (this.failBeforeCommit) return false;
    const now = new Date();
    this.sessions.set(input.sidHash, {
      sidHash: input.sidHash,
      userId: input.userId,
      expiresAt: input.expiresAt,
      createdAt: now,
      lastSeenAt: now,
      reauthenticatedAt: input.reauthenticatedAt ?? null,
      revokedAt: null,
    });
    return true;
  }

  async markEmailVerified(userId: number) {
    const credential = this.credentials.get(userId);
    if (!credential) throw new Error("credential missing");
    this.credentials.set(userId, {
      ...credential,
      emailVerifiedAt: new Date(),
    });
  }

  async createActionToken(input: {
    tokenHash: string;
    userId: number;
    purpose: "verify" | "reset";
    expiresAt: Date;
  }) {
    this.actions.set(input.tokenHash, { ...input, consumedAt: null });
  }

  async consumeActionToken(
    tokenHashValue: string,
    purpose: "verify" | "reset",
    now: Date,
  ) {
    const row = this.actions.get(tokenHashValue);
    if (
      !row ||
      row.purpose !== purpose ||
      row.consumedAt ||
      row.expiresAt <= now
    )
      return null;
    row.consumedAt = now;
    return row;
  }

  async invalidateResetTokens(userId: number, now: Date) {
    for (const row of this.actions.values()) {
      if (row.userId === userId && row.purpose === "reset" && !row.consumedAt)
        row.consumedAt = now;
    }
  }

  async createSession(input: {
    sidHash: string;
    userId: number;
    expiresAt: Date;
    reauthenticatedAt?: Date;
  }) {
    const now = new Date();
    this.sessions.set(input.sidHash, {
      ...input,
      createdAt: now,
      lastSeenAt: now,
      reauthenticatedAt: input.reauthenticatedAt ?? null,
      revokedAt: null,
    });
  }

  async getSession(sidHash: string) {
    return this.sessions.get(sidHash);
  }

  async touchSession(sidHash: string, now: Date) {
    const session = this.sessions.get(sidHash);
    if (session) session.lastSeenAt = now;
  }

  async revokeSession(sidHash: string, now: Date) {
    const session = this.sessions.get(sidHash);
    if (session) session.revokedAt = now;
  }

  async revokeAllSessions(userId: number, now: Date) {
    for (const session of this.sessions.values())
      if (session.userId === userId) session.revokedAt = now;
  }

  async findIdentity(provider: string, subject: string) {
    return this.identities.find(
      (identity) =>
        identity.provider === provider && identity.subject === subject,
    );
  }

  async getIdentitiesByUserId(userId: number) {
    return this.identities.filter((identity) => identity.userId === userId);
  }

  async createOAuthUser(input: {
    name: string;
    email: string;
    openId: string;
    provider: string;
    subject: string;
  }) {
    const id = this.nextId++;
    const now = new Date();
    const user: User = {
      id,
      openId: input.openId,
      name: input.name,
      email: input.email,
      loginMethod: input.provider,
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
    this.users.set(id, user);
    this.identities.push({
      userId: id,
      provider: input.provider,
      subject: input.subject,
      email: input.email,
    });
    return user;
  }

  async createIdentity(input: IdentityRecord) {
    this.identities.push(input);
  }

  async createOAuthState(input: OAuthStateRecord) {
    this.states.set(input.stateHash, input);
  }

  async consumeOAuthState(stateHash: string, now: Date) {
    const row = this.states.get(stateHash);
    if (!row || row.consumedAt || row.expiresAt <= now) return null;
    row.consumedAt = now;
    return row;
  }

  async createBridgeCode(input: BridgeCodeRecord) {
    this.bridges.set(input.codeHash, input);
  }

  async consumeBridgeCode(codeHash: string, verifierHash: string, now: Date) {
    const row = this.bridges.get(codeHash);
    if (
      !row ||
      row.verifierHash !== verifierHash ||
      row.consumedAt ||
      row.expiresAt <= now
    )
      return null;
    row.consumedAt = now;
    return row;
  }

  async consumeRateLimit(
    keyHash: string,
    now: Date,
    windowMs: number,
    maxAttempts: number,
  ) {
    const row = this.limits.get(keyHash);
    if (!row || now.getTime() - row.started >= windowMs) {
      this.limits.set(keyHash, { started: now.getTime(), count: 1 });
      return true;
    }
    if (row.blockedUntil && row.blockedUntil > now.getTime()) return false;
    if (row.count >= maxAttempts) {
      row.blockedUntil = now.getTime() + windowMs;
      return false;
    }
    row.count++;
    return true;
  }

  async addRevocation(identityHash: string) {
    this.revocations.add(identityHash);
  }

  async hasRevocation(identityHash: string) {
    return this.revocations.has(identityHash);
  }

  async deleteAccountData(input: {
    userId: number;
    identityHash: string;
    sidHash: string;
    now: Date;
    passwordHash?: string;
  }) {
    const user = this.users.get(input.userId);
    const credential = this.credentials.get(input.userId);
    const session = this.sessions.get(input.sidHash);
    if (
      !user ||
      !session ||
      session.userId !== input.userId ||
      session.revokedAt ||
      session.expiresAt <= input.now
    )
      return false;
    if (hashToken(user.openId) !== input.identityHash) return false;
    if (
      input.passwordHash !== undefined &&
      (!credential || credential.passwordHash !== input.passwordHash)
    )
      return false;
    if (this.failBeforeCommit) return false;

    // Tombstone first, then cascade only rows owned by this user.
    this.revocations.add(input.identityHash);
    this.users.delete(input.userId);
    this.credentials.delete(input.userId);
    for (const [key, row] of this.sessions)
      if (row.userId === input.userId) this.sessions.delete(key);
    for (const [key, row] of this.actions)
      if (row.userId === input.userId) this.actions.delete(key);
    for (const [key, row] of this.bridges)
      if (row.userId === input.userId) this.bridges.delete(key);
    this.identities = this.identities.filter(
      (row) => row.userId !== input.userId,
    );
    for (const [key, row] of this.states) {
      if (this.users.get(input.userId) === undefined && row.stateHash === key)
        this.states.delete(key);
    }
    for (const table of Object.values(this.ownedData))
      table.delete(input.userId);
    this.deleted.push(input.userId);
    return true;
  }

  async deleteUser(userId: number) {
    this.users.delete(userId);
    this.credentials.delete(userId);
    this.deleted.push(userId);
  }
}

export function makeMemoryAuthAdapters(
  sent: SentAuthEmail[],
  options: {
    emailConfigured?: boolean;
    googleConfigured?: boolean;
    sendEmail?: (input: SentAuthEmail) => Promise<void>;
  } = {},
): AuthAdapters {
  return {
    hashPassword,
    verifyPassword,
    dummyPasswordHash: DUMMY_PASSWORD_HASH,
    isEmailDeliveryConfigured: () => options.emailConfigured ?? true,
    sendAuthEmail: async (input) => {
      sent.push(input);
      await options.sendEmail?.(input);
    },
    isGoogleConfigured: () => options.googleConfigured ?? false,
    getGoogleCallbackUri: () =>
      "https://api.example.test/api/auth/google/callback",
    getFrontendAuthUri: (path) => `https://app.example.test${path}`,
    buildGoogleAuthorizationUrl: () => "https://accounts.google.test/oauth",
    exchangeGoogleCode: async () => ({
      subject: "google-subject",
      email: "google@example.test",
      name: "Google User",
    }),
  };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
