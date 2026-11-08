import type { User } from "../../drizzle/schema";

export type AuthPurpose = "verify" | "reset";
export type OAuthKind = "web" | "native";

export type CredentialRecord = {
  userId: number;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
};
export type SessionRecord = {
  sidHash: string;
  userId: number;
  expiresAt: Date;
  createdAt: Date;
  lastSeenAt: Date;
  reauthenticatedAt: Date | null;
  revokedAt: Date | null;
};
export type ActionTokenRecord = {
  tokenHash: string;
  userId: number;
  purpose: AuthPurpose;
  expiresAt: Date;
  consumedAt: Date | null;
};
export type IdentityRecord = {
  userId: number;
  provider: string;
  subject: string;
  email: string;
};
export type OAuthStateRecord = {
  stateHash: string;
  nonceHash: string;
  verifierHash: string;
  kind: OAuthKind;
  redirectUri: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
};
export type BridgeCodeRecord = {
  codeHash: string;
  verifierHash: string;
  userId: number;
  expiresAt: Date;
  consumedAt: Date | null;
};

export type AuthStore = {
  getUserById(userId: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getCredentialByEmail(email: string): Promise<CredentialRecord | undefined>;
  getCredentialByUserId(userId: number): Promise<CredentialRecord | undefined>;
  createEmailUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    openId: string;
  }): Promise<User>;
  setCredentialPassword(userId: number, passwordHash: string): Promise<void>;
  completePasswordReset(input: {
    tokenHash: string;
    passwordHash: string;
    now: Date;
  }): Promise<boolean>;
  completeEmailVerification(tokenHash: string, now: Date): Promise<boolean>;
  rollbackUnverifiedRegistration(userId: number): Promise<void>;
  createSessionForCredential(input: {
    sidHash: string;
    userId: number;
    expiresAt: Date;
    reauthenticatedAt?: Date;
    passwordHash: string;
  }): Promise<boolean>;
  markEmailVerified(userId: number): Promise<void>;
  createActionToken(input: {
    tokenHash: string;
    userId: number;
    purpose: AuthPurpose;
    expiresAt: Date;
  }): Promise<void>;
  consumeActionToken(
    tokenHash: string,
    purpose: AuthPurpose,
    now: Date,
  ): Promise<ActionTokenRecord | null>;
  invalidateResetTokens(userId: number, now: Date): Promise<void>;
  createSession(input: {
    sidHash: string;
    userId: number;
    expiresAt: Date;
    reauthenticatedAt?: Date;
  }): Promise<void>;
  getSession(sidHash: string): Promise<SessionRecord | undefined>;
  touchSession(sidHash: string, now: Date): Promise<void>;
  revokeSession(sidHash: string, now: Date): Promise<void>;
  revokeAllSessions(userId: number, now: Date): Promise<void>;
  findIdentity(
    provider: string,
    subject: string,
  ): Promise<IdentityRecord | undefined>;
  getIdentitiesByUserId(userId: number): Promise<IdentityRecord[]>;
  createOAuthUser(input: {
    name: string;
    email: string;
    openId: string;
    provider: string;
    subject: string;
  }): Promise<User>;
  createIdentity(input: IdentityRecord): Promise<void>;
  createOAuthState(input: OAuthStateRecord): Promise<void>;
  consumeOAuthState(
    stateHash: string,
    now: Date,
  ): Promise<OAuthStateRecord | null>;
  createBridgeCode(input: BridgeCodeRecord): Promise<void>;
  consumeBridgeCode(
    codeHash: string,
    verifierHash: string,
    now: Date,
  ): Promise<BridgeCodeRecord | null>;
  consumeRateLimit(
    keyHash: string,
    now: Date,
    windowMs: number,
    maxAttempts: number,
  ): Promise<boolean>;
  addRevocation(identityHash: string): Promise<void>;
  hasRevocation(identityHash: string): Promise<boolean>;
  deleteUser(userId: number): Promise<void>;
  deleteAccountData(input: {
    userId: number;
    identityHash: string;
    sidHash: string;
    now: Date;
    passwordHash?: string;
  }): Promise<boolean>;
};

export type AuthAdapters = {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, encoded: string): Promise<boolean>;
  dummyPasswordHash: string;
  isEmailDeliveryConfigured(): boolean;
  sendAuthEmail(input: {
    to: string;
    purpose: AuthPurpose;
    token: string;
  }): Promise<void>;
  isGoogleConfigured(): boolean;
  getGoogleCallbackUri(): string;
  getFrontendAuthUri(path: string): string;
  buildGoogleAuthorizationUrl(input: {
    state: string;
    nonce: string;
    codeChallenge: string;
  }): string;
  exchangeGoogleCode(input: {
    code: string;
    codeVerifier: string;
    nonce: string;
  }): Promise<{ subject: string; email: string; name: string }>;
};

export type AuthClock = () => Date;
