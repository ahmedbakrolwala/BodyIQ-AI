import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirmation,
} from "../lib/auth-validation";
describe("auth form validation", () => {
  it("normalizes email only, preserving plus addresses", () => {
    expect(normalizeEmail("  Person+Fitness@Example.com ")).toBe(
      "person+fitness@example.com",
    );
    expect(validateEmail("not-an-email")).toBeTruthy();
    expect(validateEmail("person@example.com")).toBeNull();
  });
  it("requires a bounded name", () => {
    expect(validateName("  ")).toBeTruthy();
    expect(validateName("A".repeat(61))).toBeTruthy();
    expect(validateName("Neha")).toBeNull();
  });
  it("requires 12–128 password characters without trimming spaces", () => {
    expect(validatePassword("short")).toBeTruthy();
    expect(validatePassword("a".repeat(129))).toBeTruthy();
    expect(validatePassword("unique passphrase 2026")).toBeNull();
    expect(validatePassword("  abcdefghij")).toBeNull();
  });
  it("requires exact password confirmation", () => {
    expect(
      validatePasswordConfirmation("secure passphrase", "secure passphrase "),
    ).toBeTruthy();
    expect(
      validatePasswordConfirmation("secure passphrase", "secure passphrase"),
    ).toBeNull();
  });
});
