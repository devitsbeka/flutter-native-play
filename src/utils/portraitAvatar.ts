import { supabase } from "@/integrations/supabase/client";
import { PORTRAIT_AVATAR_PROMPT } from "@/config/portraitAvatarPrompt";

// Generates the public mini avatar — a square stylized portrait — and stores
// it in the avatars bucket. The source is the generated SCENE, so the face in
// the circle is the same character in the same art style rather than a
// re-interpretation of the raw photo. Returns the stored public URL, or null
// when generation fails or returns a non-square image (an old deployed
// function that ignores the mode returns the 16:9 scene — never put that in
// the circle).
export async function generatePublicPortrait(userId: string, photoUrl: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-avatar", {
      body: { imageUrl: photoUrl, mode: "portrait", prompt: PORTRAIT_AVATAR_PROMPT },
    });
    if (error || !data?.success || !data.avatarUrl) return null;

    const blob = await (await fetch(data.avatarUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    const ratio = bitmap.width / bitmap.height;
    bitmap.close();
    if (ratio > 1.3 || ratio < 0.77) return null;

    const fileName = `${userId}/avatar_${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, blob, { upsert: true, contentType: "image/png" });
    if (uploadError) return null;
    return supabase.storage.from("avatars").getPublicUrl(fileName).data.publicUrl;
  } catch (e) {
    console.warn("Portrait avatar generation failed:", e);
    return null;
  }
}

// Generates the portrait from a scene AND records it as a selectable avatar,
// so it shows up in "my avatars" and can be re-picked later without touching
// the homepage scene. Returns the portrait URL, or null when generation fails.
export async function generateAndRecordPortrait(
  userId: string,
  sceneUrl: string
): Promise<string | null> {
  const portraitUrl = await generatePublicPortrait(userId, sceneUrl);
  if (!portraitUrl) return null;

  try {
    // Portrait rows and scene rows carry independent is_current flags
    await supabase
      .from("avatar_generations")
      .update({ is_current: false })
      .eq("user_id", userId)
      .not("avatar_url", "like", "%/scene_%");

    await supabase.from("avatar_generations").insert({
      user_id: userId,
      avatar_url: portraitUrl,
      source_image_url: sceneUrl,
      is_current: true,
    });
  } catch (e) {
    // The avatar itself is usable even if the history row fails
    console.warn("Recording portrait generation failed:", e);
  }

  return portraitUrl;
}
