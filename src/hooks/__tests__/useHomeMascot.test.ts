import { describe, it, expect, beforeEach } from "vitest";
import { installMemoryLocalStorage } from "@/test/memoryLocalStorage";
import { readMascotCache, resolveStoredMascot, writeMascotCache } from "@/hooks/useHomeMascot";

describe("resolveStoredMascot", () => {
  it("takes the profile's choice when the database answers", () => {
    expect(resolveStoredMascot({ data: "tiger", error: null }, "owl")).toBe("tiger");
  });

  it("keeps the device's copy over an empty column", () => {
    // A pick made while the column was missing was saved locally and nowhere
    // else; the next fetch must not undo the tap.
    expect(resolveStoredMascot({ data: null, error: null }, "owl")).toBe("owl");
  });

  it("keeps the device's copy when the column is not there yet", () => {
    // The migration is applied by hand; until then the select errors.
    expect(resolveStoredMascot({ data: undefined, error: { message: "column does not exist" } }, "panda")).toBe("panda");
  });

  it("answers null when nothing is known anywhere", () => {
    expect(resolveStoredMascot({ data: null, error: null }, null)).toBeNull();
    expect(resolveStoredMascot({ data: "not-a-mascot", error: null }, null)).toBeNull();
  });
});

describe("the local copy", () => {
  // Vitest runs in node, where localStorage does not exist.
  beforeEach(() => installMemoryLocalStorage());

  it("round-trips a choice per user", () => {
    writeMascotCache("u1", "giraffe");
    expect(readMascotCache("u1")).toBe("giraffe");
    expect(readMascotCache("u2")).toBeNull();
  });

  it("forgets on null and ignores garbage", () => {
    writeMascotCache("u1", "giraffe");
    writeMascotCache("u1", null);
    expect(readMascotCache("u1")).toBeNull();
    localStorage.setItem("home_mascot_u1", "dragon");
    expect(readMascotCache("u1")).toBeNull();
  });
});
