import { describe, it, expect } from "vitest";
import { isGuestAccount } from "@/utils/guestAccount";

// A visitor opening a shared room link is signed in anonymously, so they hold
// a Supabase user and every `!user` guest check in the app misses them. This
// is what tells the two apart.

describe("isGuestAccount", () => {
  it("treats an anonymous session as a guest", () => {
    expect(isGuestAccount({ is_anonymous: true, app_metadata: {} })).toBe(true);
  });

  it("falls back to the provider claim on older tokens", () => {
    expect(isGuestAccount({ is_anonymous: undefined, app_metadata: { provider: "anonymous" } })).toBe(true);
  });

  it("does not treat a real account as a guest", () => {
    expect(isGuestAccount({ is_anonymous: false, app_metadata: { provider: "email" } })).toBe(false);
    expect(isGuestAccount({ is_anonymous: undefined, app_metadata: { provider: "google" } })).toBe(false);
  });

  it("is false when signed out entirely", () => {
    expect(isGuestAccount(null)).toBe(false);
    expect(isGuestAccount(undefined)).toBe(false);
  });
});
