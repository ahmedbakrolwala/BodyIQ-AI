import { describe, expect, it, vi } from "vitest";
import { AuthFailure, AuthService, hashToken } from "../server/auth/service";
import {
  makeMemoryAuthAdapters,
  MemoryAuthStore,
} from "./helpers/auth-fixture";

vi.setConfig({ testTimeout: 30_000 });

function setup() {
  const store = new MemoryAuthStore();
  const sent: { to: string; purpose: "verify" | "reset"; token: string }[] = [];
  const service = new AuthService(store, makeMemoryAuthAdapters(sent));
  return { store, sent, service };
}

describe("isolated auth lifecycle", () => {
  it("does not create a session until verification, then creates a revocable session", async () => {
    const { store, sent, service } = setup();
    await service.register({
      name: "A User",
      email: "A@Example.com",
      password: "correct horse battery",
    });
    expect(store.sessions.size).toBe(0);
    expect(sent[0]?.purpose).toBe("verify");

    await service.verifyEmail(sent[0]!.token);
    const result = await service.login({
      email: "a@example.com",
      password: "correct horse battery",
    });
    expect(result.user.emailVerified).toBe(true);
    expect(store.sessions.size).toBe(1);

    await service.logout(result.sessionToken);
    await expect(
      service.authenticateSession(result.sessionToken),
    ).rejects.toMatchObject({ code: "not_authenticated" });
  }, 30_000);

  it("uses generic reset behavior, invalidates reset tokens, and revokes old sessions", async () => {
    const { store, sent, service } = setup();
    await service.register({
      name: "A User",
      email: "a@example.com",
      password: "correct horse battery",
    });
    await service.verifyEmail(
      sent.find((item) => item.purpose === "verify")!.token,
    );
    const login = await service.login({
      email: "a@example.com",
      password: "correct horse battery",
    });

    await service.forgotPassword("a@example.com");
    const reset = sent.find((item) => item.purpose === "reset")!;
    await service.resetPassword({
      token: reset.token,
      password: "new correct password",
    });
    await expect(
      service.resetPassword({
        token: reset.token,
        password: "another password",
      }),
    ).rejects.toMatchObject({ code: "invalid_token" });
    await expect(
      service.authenticateSession(login.sessionToken),
    ).rejects.toMatchObject({ code: "not_authenticated" });
    await expect(
      service.login({
        email: "a@example.com",
        password: "correct horse battery",
      }),
    ).rejects.toMatchObject({ code: "invalid_credentials" });
    await expect(
      service.login({
        email: "a@example.com",
        password: "new correct password",
      }),
    ).resolves.toMatchObject({ user: { email: "a@example.com" } });
    expect(
      [...store.actions.values()]
        .filter((row) => row.purpose === "reset")
        .every((row) => row.consumedAt),
    ).toBe(true);
  }, 30_000);

  it("wins exactly one concurrent verification race and blocks old identity recreation after deletion", async () => {
    const { store, sent, service } = setup();
    await service.register({
      name: "A User",
      email: "a@example.com",
      password: "correct horse battery",
    });
    const verificationToken = sent.find(
      (item) => item.purpose === "verify",
    )!.token;
    const results = await Promise.allSettled([
      service.verifyEmail(verificationToken),
      service.verifyEmail(verificationToken),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);

    const login = await service.login({
      email: "a@example.com",
      password: "correct horse battery",
    });
    const current = await service.authenticateSession(login.sessionToken);
    const deletedOpenId = current.user.openId;
    await service.deleteAccount({
      userId: current.user.id,
      password: "correct horse battery",
      sessionReauthenticatedAt: current.session.reauthenticatedAt,
      sessionSidHash: hashToken(login.sessionToken),
    });

    expect(await service.isLegacyIdentityRevoked(deletedOpenId)).toBe(true);
    expect(
      await service.isLegacyIdentityRevoked("email_deleted_identity"),
    ).toBe(false);
    expect(store.deleted).toContain(current.user.id);
  }, 30_000);

  it("keeps a failed atomic reset and delete unchanged", async () => {
    const { store, sent, service } = setup();
    await service.register({
      name: "A User",
      email: "atomic@example.com",
      password: "correct horse battery",
    });
    await service.verifyEmail(
      sent.find((item) => item.purpose === "verify")!.token,
    );
    const login = await service.login({
      email: "atomic@example.com",
      password: "correct horse battery",
    });
    await service.forgotPassword("atomic@example.com");
    const reset = sent.find((item) => item.purpose === "reset")!;
    const beforeHash = store.credentials.get(1)?.passwordHash;
    const beforeSession = {
      ...store.sessions.get(hashToken(login.sessionToken))!,
    };

    store.failBeforeCommit = true;
    await expect(
      service.resetPassword({
        token: reset.token,
        password: "new correct password",
      }),
    ).rejects.toMatchObject({ code: "invalid_token" });
    expect(store.credentials.get(1)?.passwordHash).toBe(beforeHash);
    expect(store.sessions.get(hashToken(login.sessionToken))).toMatchObject(
      beforeSession,
    );
    expect(store.actions.get(hashToken(reset.token))?.consumedAt).toBeNull();
  }, 30_000);
});
