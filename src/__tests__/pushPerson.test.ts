import { describe, expect, it } from "vitest";
import { buildFcmMessage } from "../../supabase/functions/_shared/pushPayload.ts";

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
 *
 * Tested through buildFcmMessage rather than sendToToken: this file compiles
 * under the browser tsconfig, and `push.ts` needs `Deno` and an `https://`
 * import that it cannot resolve. Importing it here typechecked locally and
 * took the deploy down. sendToToken passes this function's result straight to
 * fetch as `message`.
 */

const message = (...args: Parameters<typeof buildFcmMessage>) =>
  buildFcmMessage(...args) as {
    data?: Record<string, string>;
    apns: {
      payload: { aps: Record<string, unknown> };
      fcm_options?: { image: string };
    };
  };

describe("a push from a player carries the person", () => {
  it("sends the sender and turns the extension on", () => {
    const m = message({
      token: "device",
      title: "Come and play",
      body: "Gloria invited you to Techno Clan",
      data: { route: "/team?join=ABC" },
      person: { name: "Gloria", avatarUrl: "https://mytrivia.io/a.png" },
    });

    expect(m.data!.sender_name).toBe("Gloria");
    expect(m.data!.sender_avatar).toBe("https://mytrivia.io/a.png");
    // Without this iOS never runs the extension and none of it happens.
    expect(m.apns.payload.aps["mutable-content"]).toBe(1);
    // The route the tap depends on must survive alongside the new fields.
    expect(m.data!.route).toBe("/team?join=ABC");
  });

  it("drops an avatar the extension could not fetch anyway", () => {
    // Bundled mascot art is a local asset path, not a URL on the network.
    const m = message({
      token: "device",
      title: "t",
      body: "b",
      person: { name: "Tunano", avatarUrl: "/src/assets/avatars/mascot-avatar-1.png" },
    });

    expect(m.data!.sender_name).toBe("Tunano");
    expect(m.data!.sender_avatar).toBeUndefined();
    // Still a person — iOS draws their monogram badged with the app icon.
    expect(m.apns.payload.aps["mutable-content"]).toBe(1);
  });

  it("leaves a push from the app itself untouched", () => {
    const m = message({
      token: "device",
      title: "Rewards are waiting",
      body: "Claim your daily chest",
      data: { route: "/" },
    });

    expect(m.data!.sender_name).toBeUndefined();
    // No image and nobody to attribute it to: nothing for the extension to do.
    expect(m.apns.payload.aps["mutable-content"]).toBeUndefined();
  });

  it("still asks the extension to run for an icon-only push", () => {
    const m = message({
      token: "device",
      title: "t",
      body: "b",
      imageUrl: "https://mytrivia.io/push/star.png",
    });

    expect(m.apns.payload.aps["mutable-content"]).toBe(1);
    expect(m.apns.fcm_options!.image).toBe("https://mytrivia.io/push/star.png");
  });
});
