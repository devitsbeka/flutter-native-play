/**
 * The FCM message body, built away from anything Deno-only.
 *
 * This is the half of `push.ts` worth pinning with tests — every field here
 * fails silently when it is wrong, and two of them decide whether iOS draws a
 * push as coming from a person or from the app. The rest of `push.ts` is
 * service-account signing and the HTTP call, which need `Deno.env` and the
 * esm.sh Supabase client.
 *
 * That split is why this file exists rather than the test importing
 * `push.ts`: `src/__tests__` compiles under the browser tsconfig, which can
 * resolve neither `Deno` nor an `https://` import, and TypeScript follows an
 * import out of `src` regardless of what the config includes. `pushCopy.ts`
 * is Deno-free for exactly the same reason. Keep this module that way — no
 * `Deno.` and no `https://` imports.
 */

/**
 * The player a push is FROM.
 *
 * iOS can draw a push from someone as a communication notification — their
 * avatar in the circle with the app icon badged onto it, their name as the
 * title — instead of a bare app icon. A non-https avatar (the bundled mascot
 * art is a local asset path, not a URL) is dropped: iOS then draws the
 * sender's monogram, which is still the person treatment.
 */
export interface PushPerson {
  name: string;
  avatarUrl?: string | null;
}

export interface FcmMessageInput {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  person?: PushPerson;
}

/** The `message` object POSTed to FCM v1. */
export function buildFcmMessage({
  token,
  title,
  body,
  data,
  imageUrl,
  person,
}: FcmMessageInput): Record<string, unknown> {
  // A push FROM SOMEONE is drawn by iOS with their avatar and the app icon
  // badged onto it (a communication notification) — but only if the service
  // extension can rebuild it, which needs the sender in the payload and
  // mutable-content set. See NotificationService.swift.
  const senderFields = person?.name?.trim()
    ? {
        sender_name: person.name.trim(),
        ...(person.avatarUrl?.startsWith("https://")
          ? { sender_avatar: person.avatarUrl }
          : {}),
      }
    : undefined;
  const payloadData = senderFields ? { ...(data ?? {}), ...senderFields } : data;
  const needsExtension = !!imageUrl || !!senderFields;

  return {
    token,
    notification: { title, body, ...(imageUrl ? { image: imageUrl } : {}) },
    ...(payloadData ? { data: payloadData } : {}),
    apns: {
      // Priority 10 = deliver immediately. It is FCM's default for alert
      // pushes, but stated explicitly so a future payload change (e.g.
      // data-only) cannot silently drop deliveries to the batched
      // priority-5 path.
      headers: { "apns-priority": "10" },
      // mutable-content lets the iOS Notification Service Extension fetch the
      // image and rebuild a person's push. Without the extension in the app,
      // iOS simply shows the text — the field is inert, not harmful.
      payload: {
        aps: {
          alert: { title, body },
          sound: "default",
          badge: 1,
          ...(needsExtension ? { "mutable-content": 1 } : {}),
        },
      },
      ...(imageUrl ? { fcm_options: { image: imageUrl } } : {}),
    },
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "game_notifications",
        ...(imageUrl ? { image: imageUrl } : {}),
      },
    },
  };
}
