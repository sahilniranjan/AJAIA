import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/lib/session";

const KEY = "test-secret";

describe("session cookie signing", () => {
  it("round-trips a signed user id", () => {
    expect(verifySession(signSession("user_123", KEY), KEY)).toBe("user_123");
  });

  it("rejects a tampered user id", () => {
    const [, sig] = signSession("user_123", KEY).split(".");
    expect(verifySession(`user_456.${sig}`, KEY)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    expect(verifySession(signSession("user_123", "other"), KEY)).toBeNull();
  });

  it("rejects missing or malformed tokens", () => {
    expect(verifySession(undefined, KEY)).toBeNull();
    expect(verifySession("no-dot", KEY)).toBeNull();
  });
});
