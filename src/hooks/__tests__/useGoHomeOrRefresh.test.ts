import { describe, it, expect } from "vitest";
import { isHomePath } from "@/hooks/useGoHomeOrRefresh";

describe("isHomePath", () => {
  it("recognises the main page", () => {
    expect(isHomePath("/")).toBe(true);
  });

  it("treats an empty or repeated-slash pathname as the main page", () => {
    // Both reach the same screen. Calling them "elsewhere" would send the
    // logo down the navigate() branch, which for the route you are already
    // on does nothing at all — a tap with no response and nothing logged.
    expect(isHomePath("")).toBe(true);
    expect(isHomePath("//")).toBe(true);
  });

  it("does not mistake another route for the main page", () => {
    for (const path of ["/leaderboards", "/profile", "/game", "/power-ups"]) {
      expect(isHomePath(path), path).toBe(false);
    }
  });

  it("does not match a route that merely starts with a slash-prefixed home", () => {
    // "/home" and "/index" are their own screens, not the main page.
    expect(isHomePath("/home")).toBe(false);
    expect(isHomePath("/index")).toBe(false);
  });
});
