import { describe, it, expect } from "vitest";
import {
  FAKE_ACCEPT_MAX_HOURS,
  FAKE_ACCEPT_MIN_HOURS,
  FAKE_ACCOUNT_USER_IDS,
  fakeAcceptDelayMs,
  isFakeAccount,
} from "@/config/fakeAccounts";

const HOUR_MS = 60 * 60 * 1000;

describe("fake account list", () => {
  it("has no duplicate ids", () => {
    expect(new Set(FAKE_ACCOUNT_USER_IDS).size).toBe(FAKE_ACCOUNT_USER_IDS.length);
  });

  it("contains only well-formed uuids", () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const id of FAKE_ACCOUNT_USER_IDS) {
      expect(uuid.test(id), id).toBe(true);
    }
  });
});

describe("isFakeAccount", () => {
  it("recognises listed content accounts", () => {
    for (const id of FAKE_ACCOUNT_USER_IDS) {
      expect(isFakeAccount(id), id).toBe(true);
    }
  });

  it("treats anyone not listed as a real person", () => {
    // This is the safety property: a real user must always decide their own
    // friend requests, so an unknown id can never be auto-accepted.
    expect(isFakeAccount("00000000-0000-4000-8000-000000000000")).toBe(false);
    expect(isFakeAccount("some-real-user-id")).toBe(false);
  });

  it("handles missing ids without throwing", () => {
    expect(isFakeAccount(null)).toBe(false);
    expect(isFakeAccount(undefined)).toBe(false);
    expect(isFakeAccount("")).toBe(false);
  });
});

describe("fakeAcceptDelayMs", () => {
  const sampleIds = [
    "8f14e45f-ceea-467a-9575-1a9b1f5d5c74",
    "c4ca4238-a0b9-4382-8dcc-509a6f75849b",
    "eccbc87e-4b5c-42fd-9a3e-b13e4b3a6dcb",
    "a87ff679-a2f3-4e71-8fc6-8e34ba4b18a7",
    "e4da3b7f-bbce-4345-9777-2b0674a318d5",
    "1679091c-5a88-4faf-9b25-13f1b74e6d8c",
  ];

  it("never accepts instantly", () => {
    for (const id of sampleIds) {
      expect(fakeAcceptDelayMs(id), id).toBeGreaterThanOrEqual(FAKE_ACCEPT_MIN_HOURS * HOUR_MS);
    }
  });

  it("always accepts within the advertised window", () => {
    for (const id of sampleIds) {
      expect(fakeAcceptDelayMs(id), id).toBeLessThanOrEqual(FAKE_ACCEPT_MAX_HOURS * HOUR_MS);
    }
  });

  it("is stable for the same row across reloads", () => {
    // The delay must not re-roll on every mount, or a request would keep
    // sliding into the future and never resolve.
    for (const id of sampleIds) {
      expect(fakeAcceptDelayMs(id)).toBe(fakeAcceptDelayMs(id));
    }
  });

  it("spreads different requests across the window", () => {
    const delays = sampleIds.map(fakeAcceptDelayMs);
    expect(new Set(delays).size).toBeGreaterThan(1);
  });

  it("handles an empty id without producing NaN", () => {
    const delay = fakeAcceptDelayMs("");
    expect(Number.isFinite(delay)).toBe(true);
    expect(delay).toBeGreaterThanOrEqual(FAKE_ACCEPT_MIN_HOURS * HOUR_MS);
  });

  it("keeps the window at a plausible human delay", () => {
    expect(FAKE_ACCEPT_MIN_HOURS).toBeGreaterThanOrEqual(1);
    expect(FAKE_ACCEPT_MAX_HOURS).toBeLessThanOrEqual(72);
    expect(FAKE_ACCEPT_MIN_HOURS).toBeLessThan(FAKE_ACCEPT_MAX_HOURS);
  });
});
