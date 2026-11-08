import { describe, expect, it } from "vitest";
import { shouldRefreshTracking } from "../lib/tracking-refresh";
describe("tracking refresh metadata", () => {
  it("refreshes all persisted tracking changes", () => {
    for (const operation of [
      "logMeal",
      "startWorkout",
      "completeWorkout",
      "logWeight",
    ])
      expect(
        shouldRefreshTracking([["tracking", operation], { type: "mutation" }]),
      ).toBe(true);
  });
  it("refreshes targets and weight after either profile editor saves", () => {
    for (const scope of ["fitness", "profile"])
      expect(shouldRefreshTracking([[scope, "save"]])).toBe(true);
  });
  it("does not refresh for unrelated account or preview actions", () => {
    expect(shouldRefreshTracking([["auth", "logout"]])).toBe(false);
    expect(shouldRefreshTracking([["settings", "save"]])).toBe(false);
    expect(shouldRefreshTracking(undefined)).toBe(false);
  });
});
