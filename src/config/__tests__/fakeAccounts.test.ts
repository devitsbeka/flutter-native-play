import { describe, it, expect } from "vitest";
import * as fakeAccounts from "@/config/fakeAccounts";
import {
  FAKE_ACCOUNT_USER_IDS,
  LEGACY_PHOTO_AVATAR_PATTERN,
  isFakeAccount,
} from "@/config/fakeAccounts";

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

  it("no longer carries an auto-accept delay", () => {
    // The seeded accounts used to accept a friend request 4-48 hours after it
    // was sent, written from the requesting player's own client so they would
    // "behave like real people". That is a fabricated relationship presented
    // to a player as a real one, and it is gone. If this export comes back,
    // so has the behaviour.
    const exported = Object.keys(fakeAccounts);
    expect(exported).not.toContain("fakeAcceptDelayMs");
    expect(exported).not.toContain("FAKE_ACCEPT_MIN_HOURS");
    expect(exported).not.toContain("FAKE_ACCEPT_MAX_HOURS");
  });
});

describe("isFakeAccount", () => {
  it("recognises listed content accounts", () => {
    for (const id of FAKE_ACCOUNT_USER_IDS) {
      expect(isFakeAccount(id), id).toBe(true);
    }
  });

  it("treats anyone not listed as a real person", () => {
    expect(isFakeAccount("00000000-0000-4000-8000-000000000000")).toBe(false);
    expect(isFakeAccount("some-real-user-id")).toBe(false);
  });

  it("handles missing ids without throwing", () => {
    expect(isFakeAccount(null)).toBe(false);
    expect(isFakeAccount(undefined)).toBe(false);
    expect(isFakeAccount("")).toBe(false);
  });
});

describe("LEGACY_PHOTO_AVATAR_PATTERN", () => {
  it("matches the eight deleted photo files", () => {
    for (const name of [
      "elene_e",
      "grigoli_a",
      "kosta",
      "lash10",
      "levan_88",
      "natato",
      "nona_12",
      "sofia",
    ]) {
      expect(LEGACY_PHOTO_AVATAR_PATTERN.test(`/avatars/${name}.png`), name).toBe(true);
    }
  });

  it("leaves uploaded avatars alone", () => {
    // Supabase storage serves ".../object/public/avatars/<uid>/scene_1.png",
    // which contains the same path segment. Those are real players' own
    // pictures and must not be swapped for a mascot.
    expect(
      LEGACY_PHOTO_AVATAR_PATTERN.test(
        "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/avatars/u1/scene_1.png",
      ),
    ).toBe(false);
    expect(LEGACY_PHOTO_AVATAR_PATTERN.test("/src/assets/avatars/mascot-avatar-2.png")).toBe(false);
    expect(LEGACY_PHOTO_AVATAR_PATTERN.test("mascot:panda")).toBe(false);
  });
});
