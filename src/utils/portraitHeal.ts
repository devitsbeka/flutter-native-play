import { supabase } from "@/integrations/supabase/client";
import { generatePublicPortrait } from "@/utils/portraitAvatar";

/**
 * Repair for circle avatars that are secretly full scenes.
 *
 * Between the UGC guardrails going live and the portrait-prompt fix being
 * deployed, every non-admin "new avatar" was rendered with the SCENE prompt
 * at square size — so the profile circle got a beanbag, a carpet and a face
 * a few pixels tall. The person's source image (their photo or scene) is
 * still in the avatars bucket, so their portrait can be regenerated without
 * asking them for anything.
 *
 * This runs quietly on the affected person's own device. It is self-arming:
 * generatePublicPortrait refuses any result the function didn't render with
 * the portrait prompt, so until the fixed generate-avatar is deployed the
 * heal attempts store nothing and simply retry another session.
 */

// The UGC-guardrails deploy is when portraits started coming out as scenes.
// Portrait-named files from before this are known good and never touched.
const BROKEN_PORTRAITS_SINCE = "2026-08-19T18:00:00Z";

// One probe per url per session — the heal re-runs next session if it
// couldn't finish (offline, stale function), without hammering meanwhile.
const sessionKey = (url: string) => `portraitHeal:${url}`;

/**
 * Does this image look like a scene rather than a face portrait?
 *
 * Every scene carries the floating mint-green blobs (and usually a plant);
 * a real portrait is lavender background, purple hoodie, skin and hair —
 * essentially zero green. Counting green-hued pixels on a small canvas
 * separates the two cleanly, so a good portrait generated inside the broken
 * window is left alone. Returns null when the image can't be inspected.
 */
export async function looksLikeScene(url: string): Promise<boolean | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
    if (!loaded) return null;

    const SIZE = 64;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

    let green = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const v = max, s = max === 0 ? 0 : (max - min) / max;
      // The blobs are pastel mint — low saturation, so the floor sits low.
      // Measured on real files: scenes 1.6–2.6% green at s≥0.08, portraits 0.0%.
      if (s < 0.08 || v < 0.3) continue;
      let h = 0;
      const d = max - min;
      if (d > 0) {
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        else if (max === g) h = ((b - r) / d + 2) * 60;
        else h = ((r - g) / d + 4) * 60;
      }
      if (h >= 90 && h <= 200) green++;
    }
    return green / (SIZE * SIZE) > 0.005;
  } catch {
    return null;
  }
}

export interface HealResult {
  healed: boolean;
  url?: string;
}

/**
 * Regenerate the caller's own circle avatar when it is a scene, and hand the
 * fixed URL to `applyAvatarUrl` (the AuthContext profile update). Healed
 * files take the `heal_` prefix, which is excluded from re-healing — so the
 * repair can never loop, on this device or another.
 */
export async function healScenePortraitIfNeeded(
  userId: string,
  avatarUrl: string | null | undefined,
  applyAvatarUrl: (url: string) => Promise<unknown> | unknown,
): Promise<HealResult> {
  if (!userId || !avatarUrl) return { healed: false };
  if (avatarUrl.includes("/heal_")) return { healed: false };

  const isSceneFile = avatarUrl.includes("/scene_");
  const isPortraitFile = avatarUrl.includes("/portrait_") || avatarUrl.includes("/avatar_");
  if (!isSceneFile && !isPortraitFile) return { healed: false };

  try {
    if (sessionStorage.getItem(sessionKey(avatarUrl))) return { healed: false };
    sessionStorage.setItem(sessionKey(avatarUrl), "1");
  } catch {
    /* storage unavailable — proceed; the DB checks below still bound the work */
  }

  let sourceUrl: string;
  if (isSceneFile) {
    // A scene stored directly as the avatar is broken whatever its age, and
    // it is its own best identity reference.
    sourceUrl = avatarUrl;
  } else {
    const { data: rows } = await supabase
      .from("avatar_generations")
      .select("source_image_url, created_at")
      .eq("user_id", userId)
      .eq("avatar_url", avatarUrl)
      .order("created_at", { ascending: false })
      .limit(1);
    const row = rows?.[0];
    if (!row?.source_image_url || !row.created_at) return { healed: false };
    if (new Date(row.created_at).toISOString() < BROKEN_PORTRAITS_SINCE) return { healed: false };

    // Inside the window, admins' portraits still came out fine — only touch
    // an image that visibly is a scene. An uninspectable image is left alone.
    if ((await looksLikeScene(avatarUrl)) !== true) return { healed: false };
    sourceUrl = row.source_image_url;
  }

  const healedUrl = await generatePublicPortrait(userId, sourceUrl, "heal");
  if (!healedUrl) return { healed: false };

  try {
    await supabase
      .from("avatar_generations")
      .update({ is_current: false })
      .eq("user_id", userId)
      .not("avatar_url", "like", "%/scene_%");
    await supabase.from("avatar_generations").insert({
      user_id: userId,
      avatar_url: healedUrl,
      source_image_url: sourceUrl,
      is_current: true,
    });
  } catch (e) {
    // The repaired avatar is usable even if the history row fails
    console.warn("Recording healed portrait failed:", e);
  }

  await applyAvatarUrl(healedUrl);
  return { healed: true, url: healedUrl };
}
