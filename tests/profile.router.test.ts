import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import type { UserProfile } from "../drizzle/schema";
import type { ProfileSaveInput } from "../shared/profile";
import * as profileRepository from "../server/repositories/profile";

vi.mock("../server/repositories/profile", () => ({
  getProfileByUserId: vi.fn(),
  upsertProfile: vi.fn(),
}));

const mockedGetProfileByUserId = vi.mocked(
  profileRepository.getProfileByUserId,
);
const mockedUpsertProfile = vi.mocked(profileRepository.upsertProfile);

function createContext(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const authenticatedUser: NonNullable<TrpcContext["user"]> = {
  id: 42,
  openId: "test-user-not-persisted",
  email: "test@example.com",
  name: "Test User",
  loginMethod: "test",
  role: "user",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  lastSignedIn: new Date("2026-01-01T00:00:00.000Z"),
};

const validInput: ProfileSaveInput = {
  displayName: "Asha",
  goal: "get_fitter",
  country: "IN",
  units: "metric",
};

const savedProfile = {
  id: 7,
  userId: authenticatedUser.id,
  ...validInput,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
} satisfies UserProfile;

describe("profile router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetProfileByUserId.mockResolvedValue(null);
    mockedUpsertProfile.mockResolvedValue(savedProfile);
  });

  it("rejects an invalid profile and never accepts a client userId", async () => {
    const caller = appRouter.createCaller(createContext(authenticatedUser));

    await expect(
      caller.profile.save({
        ...validInput,
        displayName: "x".repeat(61),
        userId: 999,
      } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockedUpsertProfile).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated profile access", async () => {
    const caller = appRouter.createCaller(createContext(null));

    await expect(caller.profile.get()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.profile.save(validInput)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mockedGetProfileByUserId).not.toHaveBeenCalled();
    expect(mockedUpsertProfile).not.toHaveBeenCalled();
  });

  it("uses only ctx.user.id for get and save ownership", async () => {
    const caller = appRouter.createCaller(createContext(authenticatedUser));

    await caller.profile.get();
    await caller.profile.save(validInput);

    expect(mockedGetProfileByUserId).toHaveBeenCalledWith(authenticatedUser.id);
    expect(mockedUpsertProfile).toHaveBeenCalledWith(
      authenticatedUser.id,
      validInput,
    );
  });

  it("rejects a client-supplied userId on profile.get", async () => {
    const caller = appRouter.createCaller(createContext(authenticatedUser));

    await expect(
      caller.profile.get({ userId: 999 } as never),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(mockedGetProfileByUserId).not.toHaveBeenCalled();
  });
});
