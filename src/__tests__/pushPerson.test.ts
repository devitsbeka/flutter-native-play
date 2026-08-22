import { describe, expect, it, vi, afterEach } from "vitest";
import { sendToToken } from "../../supabase/functions/_shared/push.ts";

/**
 * A push that comes FROM A PLAYER must reach iOS as a communication
 * notification: the sender's avatar in the circle with the app icon badged
 * onto it, the way Messages and Snapchat look.
 *
 * Two things in the payload make that possible, and both fail silently:
 *
 * - `sender_name` / `sender_avatar` in `data`, because the notification
 *   service extension has no other way to learn who sent it.
 * - `mutable-content: 1`, because without it iOS never runs the extension
 *   at all — the notification is delivered exactly as it arrived and the
 *   sender data sits there unread.
 *
 * The second one used to be tied to there being an image attachment, which
 * a game invite does not have. So the whole feature would have shipped
 * inert with nothing to show for it.
 */

function captureFcmPayload() {
  const calls: any[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: any) => {
      calls.push(JSON.parse(init.body));
      return { ok: true, json: async () => ({}) } as any;
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a push from a player carries the person", () => {
  it("sends the sender and turns the extension on", async () => {
    const calls = captureFcmPayload();
    await sendToToken("tok", "proj", "device", "Come and play", "Gloria invited you to Techno Clan", {
      route: "/team?join=ABC",
    }, undefined, { name: "Gloria", avatarUrl: "https://mytrivia.io/a.png" });

    const message = calls[0].message;
    expect(message.data.sender_name).toBe("Gloria");
    expect(message.data.sender_avatar).toBe("https://mytrivia.io/a.png");
    // Without this iOS never runs the extension and none of it happens.
    expect(message.apns.payload.aps["mutable-content"]).toBe(1);
    // The route the tap depends on must survive alongside the new fields.
    expect(message.data.route).toBe("/team?join=ABC");
  });

  it("drops an avatar the extension could not fetch anyway", async () => {
    const calls = captureFcmPayload();
    // Bundled mascot art is a local asset path, not a URL on the network.
    await sendToToken("tok", "proj", "device", "t", "b", undefined, undefined, {
      name: "Tunano",
      avatarUrl: "/src/assets/avatars/mascot-avatar-1.png",
    });

    const message = calls[0].message;
    expect(message.data.sender_name).toBe("Tunano");
    expect(message.data.sender_avatar).toBeUndefined();
    // Still a person — iOS draws their monogram badged with the app icon.
    expect(message.apns.payload.aps["mutable-content"]).toBe(1);
  });

  it("leaves a push from the app itself untouched", async () => {
    const calls = captureFcmPayload();
    await sendToToken("tok", "proj", "device", "Rewards are waiting", "Claim your daily chest", {
      route: "/",
    });

    const message = calls[0].message;
    expect(message.data.sender_name).toBeUndefined();
    // No image and nobody to attribute it to: nothing for the extension to do.
    expect(message.apns.payload.aps["mutable-content"]).toBeUndefined();
  });

  it("still asks the extension to run for an icon-only push", async () => {
    const calls = captureFcmPayload();
    await sendToToken("tok", "proj", "device", "t", "b", undefined, "https://mytrivia.io/push/star.png");

    const message = calls[0].message;
    expect(message.apns.payload.aps["mutable-content"]).toBe(1);
    expect(message.apns.fcm_options.image).toBe("https://mytrivia.io/push/star.png");
  });
});
