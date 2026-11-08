import { and, eq, gt, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import {
  authActionTokens,
  authBridgeCodes,
  authCredentials,
  authIdentities,
  authOAuthStates,
  authRateLimits,
  authRevocations,
  authSessions,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";
import type { AuthStore, CredentialRecord } from "./types";

const requireDb = async () => {
  const db = await getDb();
  if (!db) throw new Error("auth_database_unavailable");
  return db;
};

const rowToCredential = (
  row: typeof authCredentials.$inferSelect,
): CredentialRecord => ({
  userId: row.userId,
  email: row.email,
  passwordHash: row.passwordHash,
  emailVerifiedAt: row.emailVerifiedAt,
});

export function createDrizzleAuthStore(): AuthStore {
  return {
    async getUserById(userId) {
      const db = await requireDb();
      return (
        await db.select().from(users).where(eq(users.id, userId)).limit(1)
      )[0];
    },
    async getUserByEmail(email) {
      const db = await requireDb();
      return (
        await db.select().from(users).where(eq(users.email, email)).limit(1)
      )[0];
    },
    async getCredentialByEmail(email) {
      const db = await requireDb();
      const row = (
        await db
          .select()
          .from(authCredentials)
          .where(eq(authCredentials.email, email))
          .limit(1)
      )[0];
      return row ? rowToCredential(row) : undefined;
    },
    async getCredentialByUserId(userId) {
      const db = await requireDb();
      const row = (
        await db
          .select()
          .from(authCredentials)
          .where(eq(authCredentials.userId, userId))
          .limit(1)
      )[0];
      return row ? rowToCredential(row) : undefined;
    },
    async createEmailUser(input) {
      const db = await requireDb();
      return await db.transaction(async (tx) => {
        const result = await tx.insert(users).values({
          openId: input.openId,
          name: input.name,
          email: input.email,
          loginMethod: "email",
          lastSignedIn: new Date(),
        });
        const userId = Number(
          (result as any)[0]?.insertId ?? (result as any).insertId,
        );
        if (!userId) throw new Error("auth_user_insert_failed");
        await tx.insert(authCredentials).values({
          userId,
          email: input.email,
          passwordHash: input.passwordHash,
        });
        const saved = (
          await tx.select().from(users).where(eq(users.id, userId)).limit(1)
        )[0];
        if (!saved) throw new Error("auth_user_read_failed");
        return saved;
      });
    },
    async completePasswordReset({ tokenHash, passwordHash, now }) {
      const db = await requireDb();
      return db.transaction(async (tx) => {
        const candidate = (
          await tx
            .select()
            .from(authActionTokens)
            .where(
              and(
                eq(authActionTokens.tokenHash, tokenHash),
                eq(authActionTokens.purpose, "reset"),
              ),
            )
            .limit(1)
        )[0];
        if (!candidate) return false;
        const credential = (
          await tx
            .select()
            .from(authCredentials)
            .where(eq(authCredentials.userId, candidate.userId))
            .limit(1)
            .for("update")
        )[0];
        if (!credential) return false;
        const token = (
          await tx
            .select()
            .from(authActionTokens)
            .where(
              and(
                eq(authActionTokens.tokenHash, tokenHash),
                eq(authActionTokens.purpose, "reset"),
                isNull(authActionTokens.consumedAt),
                gt(authActionTokens.expiresAt, now),
              ),
            )
            .limit(1)
            .for("update")
        )[0];
        if (!token) return false;
        await tx
          .update(authCredentials)
          .set({ passwordHash, updatedAt: now })
          .where(eq(authCredentials.userId, token.userId));
        await tx
          .update(authSessions)
          .set({ revokedAt: now })
          .where(
            and(
              eq(authSessions.userId, token.userId),
              isNull(authSessions.revokedAt),
            ),
          );
        await tx
          .update(authActionTokens)
          .set({ consumedAt: now })
          .where(
            and(
              eq(authActionTokens.userId, token.userId),
              eq(authActionTokens.purpose, "reset"),
              isNull(authActionTokens.consumedAt),
            ),
          );
        return true;
      });
    },
    async completeEmailVerification(tokenHash, now) {
      const db = await requireDb();
      return db.transaction(async (tx) => {
        const candidate = (
          await tx
            .select()
            .from(authActionTokens)
            .where(
              and(
                eq(authActionTokens.tokenHash, tokenHash),
                eq(authActionTokens.purpose, "verify"),
              ),
            )
            .limit(1)
        )[0];
        if (!candidate) return false;
        const credential = (
          await tx
            .select()
            .from(authCredentials)
            .where(eq(authCredentials.userId, candidate.userId))
            .limit(1)
            .for("update")
        )[0];
        if (!credential) return false;
        const token = (
          await tx
            .select()
            .from(authActionTokens)
            .where(
              and(
                eq(authActionTokens.tokenHash, tokenHash),
                eq(authActionTokens.purpose, "verify"),
                isNull(authActionTokens.consumedAt),
                gt(authActionTokens.expiresAt, now),
              ),
            )
            .limit(1)
            .for("update")
        )[0];
        if (!token) return false;
        await tx
          .update(authCredentials)
          .set({ emailVerifiedAt: now, updatedAt: now })
          .where(eq(authCredentials.userId, token.userId));
        await tx
          .update(authActionTokens)
          .set({ consumedAt: now })
          .where(
            and(
              eq(authActionTokens.userId, token.userId),
              eq(authActionTokens.purpose, "verify"),
              isNull(authActionTokens.consumedAt),
            ),
          );
        return true;
      });
    },
    async rollbackUnverifiedRegistration(userId) {
      const db = await requireDb();
      await db.transaction(async (tx) => {
        const row = (
          await tx
            .select()
            .from(authCredentials)
            .where(eq(authCredentials.userId, userId))
            .limit(1)
            .for("update")
        )[0];
        if (row && !row.emailVerifiedAt)
          await tx.delete(users).where(eq(users.id, userId));
      });
    },
    async createSessionForCredential({ passwordHash, ...input }) {
      const db = await requireDb();
      return db.transaction(async (tx) => {
        const credential = (
          await tx
            .select()
            .from(authCredentials)
            .where(eq(authCredentials.userId, input.userId))
            .limit(1)
            .for("update")
        )[0];
        if (
          !credential ||
          !credential.emailVerifiedAt ||
          credential.passwordHash !== passwordHash
        )
          return false;
        await tx.insert(authSessions).values(input);
        return true;
      });
    },
    async setCredentialPassword(userId, passwordHash) {
      const db = await requireDb();
      await db
        .update(authCredentials)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(authCredentials.userId, userId));
    },
    async markEmailVerified(userId) {
      const db = await requireDb();
      await db
        .update(authCredentials)
        .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(authCredentials.userId, userId));
    },
    async createActionToken(input) {
      const db = await requireDb();
      await db.insert(authActionTokens).values(input);
    },
    async consumeActionToken(tokenHash, purpose, now) {
      const db = await requireDb();
      return db.transaction(async (tx) => {
        const result = await tx
          .update(authActionTokens)
          .set({ consumedAt: now })
          .where(
            and(
              eq(authActionTokens.tokenHash, tokenHash),
              eq(authActionTokens.purpose, purpose),
              isNull(authActionTokens.consumedAt),
              gt(authActionTokens.expiresAt, now),
            ),
          );
        const affected = Number(
          (result as any)[0]?.affectedRows ?? (result as any).affectedRows ?? 0,
        );
        if (affected !== 1) return null;
        const row = (
          await tx
            .select()
            .from(authActionTokens)
            .where(eq(authActionTokens.tokenHash, tokenHash))
            .limit(1)
        )[0];
        return row
          ? {
              tokenHash: row.tokenHash,
              userId: row.userId,
              purpose: row.purpose,
              expiresAt: row.expiresAt,
              consumedAt: row.consumedAt,
            }
          : null;
      });
    },
    async invalidateResetTokens(userId, now) {
      const db = await requireDb();
      await db
        .update(authActionTokens)
        .set({ consumedAt: now })
        .where(
          and(
            eq(authActionTokens.userId, userId),
            eq(authActionTokens.purpose, "reset"),
            isNull(authActionTokens.consumedAt),
          ),
        );
    },
    async createSession(input) {
      const db = await requireDb();
      await db.insert(authSessions).values(input);
    },
    async getSession(sidHash) {
      const db = await requireDb();
      const row = (
        await db
          .select()
          .from(authSessions)
          .where(eq(authSessions.sidHash, sidHash))
          .limit(1)
      )[0];
      return row
        ? {
            sidHash: row.sidHash,
            userId: row.userId,
            expiresAt: row.expiresAt,
            createdAt: row.createdAt,
            lastSeenAt: row.lastSeenAt,
            reauthenticatedAt: row.reauthenticatedAt,
            revokedAt: row.revokedAt,
          }
        : undefined;
    },
    async touchSession(sidHash, now) {
      const db = await requireDb();
      await db
        .update(authSessions)
        .set({ lastSeenAt: now })
        .where(
          and(
            eq(authSessions.sidHash, sidHash),
            isNull(authSessions.revokedAt),
          ),
        );
    },
    async revokeSession(sidHash, now) {
      const db = await requireDb();
      await db
        .update(authSessions)
        .set({ revokedAt: now })
        .where(
          and(
            eq(authSessions.sidHash, sidHash),
            isNull(authSessions.revokedAt),
          ),
        );
    },
    async revokeAllSessions(userId, now) {
      const db = await requireDb();
      await db
        .update(authSessions)
        .set({ revokedAt: now })
        .where(
          and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)),
        );
    },
    async findIdentity(provider, subject) {
      const db = await requireDb();
      const row = (
        await db
          .select()
          .from(authIdentities)
          .where(
            and(
              eq(authIdentities.provider, provider),
              eq(authIdentities.subject, subject),
            ),
          )
          .limit(1)
      )[0];
      return row
        ? {
            userId: row.userId,
            provider: row.provider,
            subject: row.subject,
            email: row.email,
          }
        : undefined;
    },
    async getIdentitiesByUserId(userId) {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(authIdentities)
        .where(eq(authIdentities.userId, userId));
      return rows.map((row) => ({
        userId: row.userId,
        provider: row.provider,
        subject: row.subject,
        email: row.email,
      }));
    },
    async createOAuthUser(input) {
      const db = await requireDb();
      return db.transaction(async (tx) => {
        const result = await tx.insert(users).values({
          openId: input.openId,
          name: input.name,
          email: input.email,
          loginMethod: input.provider,
          lastSignedIn: new Date(),
        });
        const userId = Number(
          (result as any)[0]?.insertId ?? (result as any).insertId,
        );
        if (!userId) throw new Error("auth_user_insert_failed");
        await tx.insert(authIdentities).values({
          userId,
          provider: input.provider,
          subject: input.subject,
          email: input.email,
        });
        const saved = (
          await tx.select().from(users).where(eq(users.id, userId)).limit(1)
        )[0];
        if (!saved) throw new Error("auth_user_read_failed");
        return saved;
      });
    },
    async createIdentity(input) {
      const db = await requireDb();
      await db.insert(authIdentities).values(input);
    },
    async createOAuthState(input) {
      const db = await requireDb();
      await db.insert(authOAuthStates).values(input);
    },
    async consumeOAuthState(stateHash, now) {
      const db = await requireDb();
      return db.transaction(async (tx) => {
        const result = await tx
          .update(authOAuthStates)
          .set({ consumedAt: now })
          .where(
            and(
              eq(authOAuthStates.stateHash, stateHash),
              isNull(authOAuthStates.consumedAt),
              gt(authOAuthStates.expiresAt, now),
            ),
          );
        const affected = Number(
          (result as any)[0]?.affectedRows ?? (result as any).affectedRows ?? 0,
        );
        if (affected !== 1) return null;
        const row = (
          await tx
            .select()
            .from(authOAuthStates)
            .where(eq(authOAuthStates.stateHash, stateHash))
            .limit(1)
        )[0];
        return row
          ? {
              stateHash: row.stateHash,
              nonceHash: row.nonceHash,
              verifierHash: row.verifierHash,
              kind: row.kind,
              redirectUri: row.redirectUri,
              expiresAt: row.expiresAt,
              consumedAt: row.consumedAt,
            }
          : null;
      });
    },
    async createBridgeCode(input) {
      const db = await requireDb();
      await db.insert(authBridgeCodes).values(input);
    },
    async consumeBridgeCode(codeHash, verifierHash, now) {
      const db = await requireDb();
      return db.transaction(async (tx) => {
        const result = await tx
          .update(authBridgeCodes)
          .set({ consumedAt: now })
          .where(
            and(
              eq(authBridgeCodes.codeHash, codeHash),
              eq(authBridgeCodes.verifierHash, verifierHash),
              isNull(authBridgeCodes.consumedAt),
              gt(authBridgeCodes.expiresAt, now),
            ),
          );
        const affected = Number(
          (result as any)[0]?.affectedRows ?? (result as any).affectedRows ?? 0,
        );
        if (affected !== 1) return null;
        const row = (
          await tx
            .select()
            .from(authBridgeCodes)
            .where(eq(authBridgeCodes.codeHash, codeHash))
            .limit(1)
        )[0];
        return row
          ? {
              codeHash: row.codeHash,
              verifierHash: row.verifierHash,
              userId: row.userId,
              expiresAt: row.expiresAt,
              consumedAt: row.consumedAt,
            }
          : null;
      });
    },
    async consumeRateLimit(keyHash, now, windowMs, maxAttempts) {
      const db = await requireDb();
      return db.transaction(async (tx) => {
        await tx
          .insert(authRateLimits)
          .values({
            keyHash,
            windowStartedAt: now,
            count: 0,
            blockedUntil: null,
          })
          .onDuplicateKeyUpdate({ set: { keyHash } });
        const existing = (
          await tx
            .select()
            .from(authRateLimits)
            .where(eq(authRateLimits.keyHash, keyHash))
            .limit(1)
            .for("update")
        )[0];
        if (!existing) throw new Error("auth_throttle_unavailable");
        if (now.getTime() - existing.windowStartedAt.getTime() >= windowMs) {
          await tx
            .update(authRateLimits)
            .set({
              windowStartedAt: now,
              count: 1,
              blockedUntil: null,
              updatedAt: now,
            })
            .where(eq(authRateLimits.keyHash, keyHash));
          return true;
        }
        if (existing.count >= maxAttempts) {
          await tx
            .update(authRateLimits)
            .set({
              blockedUntil: new Date(
                existing.windowStartedAt.getTime() + windowMs,
              ),
              updatedAt: now,
            })
            .where(eq(authRateLimits.keyHash, keyHash));
          return false;
        }
        await tx
          .update(authRateLimits)
          .set({ count: existing.count + 1, updatedAt: now })
          .where(eq(authRateLimits.keyHash, keyHash));
        return true;
      });
    },
    async addRevocation(identityHash) {
      const db = await requireDb();
      await db
        .insert(authRevocations)
        .values({ identityHash })
        .onDuplicateKeyUpdate({ set: { revokedAt: new Date() } });
    },
    async hasRevocation(identityHash) {
      const db = await requireDb();
      return (
        (
          await db
            .select({ id: authRevocations.id })
            .from(authRevocations)
            .where(eq(authRevocations.identityHash, identityHash))
            .limit(1)
        ).length > 0
      );
    },
    async deleteAccountData({
      userId,
      identityHash,
      sidHash,
      now,
      passwordHash,
    }) {
      const db = await requireDb();
      return db.transaction(async (tx) => {
        const user = (
          await tx
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1)
            .for("update")
        )[0];
        if (!user) return false;
        const credential = (
          await tx
            .select()
            .from(authCredentials)
            .where(eq(authCredentials.userId, userId))
            .limit(1)
            .for("update")
        )[0];
        if (
          passwordHash &&
          (!credential || credential.passwordHash !== passwordHash)
        )
          return false;
        const session = (
          await tx
            .select()
            .from(authSessions)
            .where(
              and(
                eq(authSessions.sidHash, sidHash),
                eq(authSessions.userId, userId),
                isNull(authSessions.revokedAt),
                gt(authSessions.expiresAt, now),
              ),
            )
            .limit(1)
            .for("update")
        )[0];
        if (!session) return false;
        if (
          !credential &&
          (!session.reauthenticatedAt ||
            now.getTime() - session.reauthenticatedAt.getTime() >
              10 * 60 * 1000)
        )
          return false;
        await tx
          .insert(authRevocations)
          .values({ identityHash })
          .onDuplicateKeyUpdate({ set: { revokedAt: now } });
        await tx.delete(users).where(eq(users.id, userId));
        return true;
      });
    },
    async deleteUser(userId) {
      const db = await requireDb();
      await db.delete(users).where(eq(users.id, userId));
    },
  };
}

export const authStore = createDrizzleAuthStore();

export function generateOpenId(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString("base64url")}`.slice(0, 64);
}
