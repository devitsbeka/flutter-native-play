import { supabase } from "@/integrations/supabase/client";

// Generates the public mini avatar — a square stylized portrait of the same
// character the homepage scene shows — from the uploaded photo, and stores it
// in the avatars bucket. Returns the stored public URL, or null when
// generation fails or returns a non-square image (an old deployed function
// that ignores the mode returns the 16:9 scene — never put that in the
// circle; callers fall back to the original photo).
export async function generatePublicPortrait(userId: string, photoUrl: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-avatar", {
      body: { imageUrl: photoUrl, mode: "portrait" },
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
