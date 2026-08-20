/**
 * Sending a push, in one place.
 *
 * There are now two callers — the admin broadcast in `send-push-notification`
 * and the game invite in `send-game-invite-push` — and a second copy of the
 * FCM v1 signing dance would drift from the first the moment either is
 * touched. Same reasoning as `_shared/iap.ts`.
 *
 * FCM v1 needs an OAuth token signed with the service account key, not a
 * static server key. `FIREBASE_SERVICE_ACCOUNT` is a Supabase platform secret
 * holding that key's JSON; it must never be committed.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const base64Url = (bytes: string) =>
  btoa(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

/** Parse the service account, or say plainly which secret is wrong. */
export function readServiceAccount(): ServiceAccount {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");

  let parsed: ServiceAccount;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // JSON.parse(undefined) throws 'SyntaxError: "undefined" is not valid
    // JSON', which reaches a caller as a 500 naming neither the secret nor
    // the problem.
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
  }

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is missing project_id, client_email or private_key");
  }
  return parsed;
}

export async function getFCMAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: account.client_email,
      sub: account.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    }),
  );

  const unsigned = `${header}.${payload}`;

  const pem = account.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");

  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );

  const jwt = `${unsigned}.${base64Url(String.fromCharCode(...new Uint8Array(signature)))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    console.error("FCM token exchange failed:", data);
    throw new Error("Failed to get FCM access token");
  }
  return data.access_token;
}

export async function sendToToken(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  imageUrl?: string,
): Promise<{ success: boolean; error?: string; unregistered?: boolean }> {
  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body, ...(imageUrl ? { image: imageUrl } : {}) },
            ...(data ? { data } : {}),
            apns: {
              // Priority 10 = deliver immediately. It is FCM's default for
              // alert pushes, but stated explicitly so a future payload
              // change (e.g. data-only) cannot silently drop deliveries to
              // the batched priority-5 path.
              headers: { "apns-priority": "10" },
              // mutable-content lets the iOS Notification Service Extension
              // fetch and attach the image. Without the extension in the app,
              // iOS simply shows the text — the field is inert, not harmful.
              payload: {
                aps: {
                  alert: { title, body },
                  sound: "default",
                  badge: 1,
                  ...(imageUrl ? { "mutable-content": 1 } : {}),
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
          },
        }),
      },
    );

    if (!res.ok) {
      const error = await res.json();
      // UNREGISTERED means the app was deleted or the token rotated. The row
      // is dead and will fail forever; the caller deletes it rather than
      // retrying it on every send for the life of the account.
      const status = error?.error?.details?.[0]?.errorCode ?? error?.error?.status;
      const unregistered = status === "UNREGISTERED" || status === "NOT_FOUND";
      console.error("FCM error:", JSON.stringify(error));
      return { success: false, error: JSON.stringify(error), unregistered };
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Send one notification to every device belonging to a set of users.
 *
 * Dead tokens are deleted as they are discovered. Left in place they are
 * retried on every send forever, and a user who reinstalls a few times
 * accumulates rows that can never be delivered to.
 */
export async function sendToUsers(
  supabase: SupabaseClient,
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
  imageUrl?: string,
): Promise<{ sent: number; failed: number }> {
  if (userIds.length === 0) return { sent: 0, failed: 0 };

  const account = readServiceAccount();
  const accessToken = await getFCMAccessToken(account);

  const { data: rows, error } = await supabase
    .from("push_tokens")
    .select("token")
    .in("user_id", userIds);

  if (error) throw new Error(`Could not read push tokens: ${error.message}`);
  if (!rows || rows.length === 0) return { sent: 0, failed: 0 };

  const results = await Promise.all(
    rows.map(({ token }: { token: string }) =>
      sendToToken(accessToken, account.project_id, token, title, body, data, imageUrl).then((r) => ({
        token,
        ...r,
      })),
    ),
  );

  const dead = results.filter((r) => r.unregistered).map((r) => r.token);
  if (dead.length > 0) {
    await supabase.from("push_tokens").delete().in("token", dead);
  }

  return {
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  };
}
