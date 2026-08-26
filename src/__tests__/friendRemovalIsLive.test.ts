import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A removed friend has to leave the friends row without a reload.
 *
 * Two separate reasons they did not, and both are fixed here because either
 * one alone leaves a case behind.
 *
 * The realtime one is the interesting bug. supabase-js gives a DELETE payload
 * `old` with the row and `new` as an empty OBJECT — `{}`, not null. The
 * handler read `payload.new || payload.old`, so for every delete it took the
 * empty one, found no user_id on it, decided the event belonged to somebody
 * else and returned before the refetch. Deletes had therefore never reached
 * this context at all, including the one that matters most: somebody removing
 * YOU, which no local code path can compensate for.
 *
 * The other is layering. The profile sheet deleted the row itself and
 * refetched its own query, leaving FriendsContext holding a friend the
 * database no longer had.
 */
const context = readFileSync(
  join(process.cwd(), "src/contexts/FriendsContext.tsx"),
  "utf8"
);

/** The file with its comments stripped — a rule about code must not be
 *  satisfied, or broken, by prose describing the code. */
const codeOf = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const contextCode = codeOf(context);
const profile = readFileSync(
  join(process.cwd(), "src/components/profile/PlayerProfileModal.tsx"),
  "utf8"
);

describe("the realtime handler", () => {
  it("reads a delete's columns from the row that has them", () => {
    expect(context).toMatch(
      /payload\.eventType === "DELETE" \? payload\.old : payload\.new/
    );
  });

  it("never falls back through an empty new row", () => {
    // The exact shape of the bug. `{}` is truthy, so `||` never reached
    // `old` and every delete was discarded.
    expect(contextCode, "payload.new is {} on a delete, not null")
      .not.toMatch(/payload\.new \|\| payload\.old/);
  });

  it("still refuses events about other people", () => {
    // The guard is the point of reading the row at all; deletes now go
    // through it rather than around it.
    expect(context).toMatch(/row\.user_id !== user\.id && row\.friend_id !== user\.id/);
  });

  it("still ends in a refetch", () => {
    expect(context).toMatch(/\n {10}fetchFriends\(\);\n {8}\}\n/);
  });
});

describe("removing a friend from their profile", () => {
  it("goes through the context, not straight at the table", () => {
    expect(profile).toMatch(/const ok = await removeFriend\(data\.friendshipId\);/);
    expect(profile, "a direct delete leaves the friends list holding them")
      .not.toMatch(/from\("friendships"\)\s*\n\s*\.delete\(\)/);
  });

  it("keeps the sheet open when the removal fails", () => {
    // Closing on failure would say it worked.
    expect(profile).toMatch(/if \(!ok\) return;/);
  });

  it("does not double-report the outcome", () => {
    // removeFriend already toasts on both paths; a second toast here would
    // stack two of them.
    const handler = profile.match(/setDeletingFriend\(true\);[\s\S]*?setDeletingFriend\(false\);/)![0];
    expect(handler).not.toMatch(/toast\./);
  });
});

/**
 * The realtime fix depends on the delete payload carrying its columns, which
 * needs full replica identity. That is already applied — this pins it, since
 * dropping it would silently take deletes back out.
 */
describe("what realtime needs from the table", () => {
  it("friendships is published and has full replica identity", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260823120000_friendships_realtime.sql"),
      "utf8"
    );
    expect(migration).toMatch(/ALTER PUBLICATION supabase_realtime ADD TABLE public\.friendships/);
    expect(migration).toMatch(/ALTER TABLE public\.friendships REPLICA IDENTITY FULL/);
  });
});
