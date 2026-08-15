import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { typeInTab, SOCIAL_TYPES, TRIVIA_TYPES } from "../notificationTabs";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("notification tabs", () => {
  it("puts both halves of a friend request in the friends tab", () => {
    // The sender's copy is the one that was missing: a request is only ever
    // written to whoever receives it, so the tab was empty for the person
    // doing the inviting.
    for (const type of ["friend_request", "friend_request_sent", "friend_accepted"]) {
      expect(typeInTab(type, "social"), type).toBe(true);
      expect(typeInTab(type, "games"), type).toBe(false);
    }
  });

  it("sends anything unlisted to games rather than nowhere", () => {
    // Games is the catch-all on purpose. With three fixed lists, a type in
    // none of them was invisible in every tab and could never be marked read,
    // which is a bell badge that cannot clear.
    for (const type of ["reward", "level_up", "system", "subscription", "brand_new"]) {
      expect(typeInTab(type, "games"), type).toBe(true);
    }
  });

  it("has one copy of the mapping", () => {
    // This file and NotificationsPanel.tsx each carried their own identical
    // arrays, so a type added to one silently did not exist in the other.
    for (const file of [
      "src/pages/Notifications.tsx",
      "src/components/home/NotificationsPanel.tsx",
    ]) {
      const src = read(file);
      expect(src, `${file} redefines SOCIAL_TYPES`).not.toMatch(/const SOCIAL_TYPES\s*=/);
      expect(src, `${file} does not import the shared mapping`).toContain(
        "@/config/notificationTabs",
      );
    }
  });

  it("keeps every type the database writes renderable", () => {
    // A type with no entry in notificationConfig renders without an icon or a
    // label. The triggers are the source of truth for what exists.
    const config = read("src/config/notificationConfig.ts");
    const sql = read("supabase/migrations/20260819120000_friend_request_notifications.sql");
    const written = [...sql.matchAll(/'(friend_[a-z_]+)',\s*$/gm)].map((m) => m[1]);
    expect(written.length).toBeGreaterThan(0);
    for (const type of written) {
      expect(config, `notificationConfig has no ${type}`).toContain(`${type}: {`);
    }
  });

  it("does not put trivia types in the friends tab or the other way round", () => {
    for (const type of TRIVIA_TYPES) expect(SOCIAL_TYPES).not.toContain(type);
    for (const type of SOCIAL_TYPES) expect(TRIVIA_TYPES).not.toContain(type);
  });
});
