import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY } from "../_shared/ai.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FAL_KEY = Deno.env.get("FAL_KEY");

const DEFAULT_PROMPT = `Transform this photo into a high-quality SEMI-REALISTIC 3D rendered portrait with subtle beautification.

STYLE REQUIREMENTS:
- SEMI-REALISTIC 3D render like a modern video game character (Unreal Engine, Final Fantasy style)
- FRONT VIEW - face looking directly at camera, symmetrical composition
- WARM, FRIENDLY EXPRESSION - slight natural smile, bright welcoming eyes
- Make the person look positive, confident, and approachable
- Slightly enlarged, bright eyes with beautiful lashes - subtle enhancement, not cartoon
- Eyes should have a lively sparkle, depth, and warmth
- Soft, slightly rounded face contours for a youthful glow
- Flawless, glowing skin with a subtle radiant finish
- Bright, clean studio lighting with soft shadows
- SOLID LIGHT LAVENDER/PURPLE BACKGROUND (#E9CCFF)
- Preserve the person's facial structure and identity but ENHANCE their beauty positively
- Add subtle violet/purple color tones to the hair for artistic flair
- Luxurious, voluminous hair with beautiful shine and soft flowing strands
- Keep their general hairstyle, hair color base, clothing and accessories
- Professional portrait composition (head and shoulders, centered)
- Clean, polished render with sharp details
- Beautiful, polished aesthetic - enhanced beauty while keeping realistic proportions

The result should look like a premium AAA video game character portrait - realistic but beautified, bright clean lighting, with a warm positive expression, glowing skin, beautiful eyes, and light lavender (#E9CCFF) background.`;

const DEFAULT_MODEL = "google/gemini-2.5-flash-image-preview";

async function generateStaticAvatar(imageUrl: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Fetch settings from database
  let prompt = DEFAULT_PROMPT;
  let model = DEFAULT_MODEL;
  
  try {
    const { data: settings, error } = await supabase
      .from('ai_generation_settings')
      .select('prompt, model')
      .eq('setting_type', 'avatar_static')
      .eq('is_active', true)
      .single();

    if (!error && settings) {
      prompt = settings.prompt || DEFAULT_PROMPT;
      model = settings.model || DEFAULT_MODEL;
      console.log("Using database settings");
    }
  } catch (e) {
    console.log("Using default settings");
  }

  const response = await fetch(AI_CHAT_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }],
      modalities: ["image", "text"]
    })
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status} - ${await response.text()}`);
  }

  const result = await response.json();
  const generatedImage = result.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  if (!generatedImage) {
    throw new Error("No image in AI response");
  }

  return generatedImage;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, original_image_url, skip_animation } = await req.json();
    
    if (!user_id || !original_image_url) {
      throw new Error("user_id and original_image_url are required");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log(`Processing user ${user_id}`);

    // Step 1: Generate static avatar using AI gateway (same as generate-avatar)
    console.log("Step 1: Generating static avatar...");
    const base64Url = await generateStaticAvatar(original_image_url);
    console.log("Static avatar generated");

    // Step 2: Upload to storage
    const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileName = `${user_id}/avatar_ai_${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, binaryData, { contentType: "image/png", upsert: true });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
    const newAvatarUrl = urlData.publicUrl;
    console.log("Uploaded:", newAvatarUrl);

    // Step 3: Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: newAvatarUrl })
      .eq("user_id", user_id);

    if (updateError) throw new Error(`Profile update failed: ${updateError.message}`);

    // Step 4: Start animation via Fal.ai
    let animationData = null;
    if (!skip_animation && FAL_KEY) {
      console.log("Step 4: Starting animation...");
      try {
        // Fetch animation settings
        let animPrompt = "The person gently smiles and looks around naturally with subtle head movements, blinking eyes, maintaining a friendly calm expression. Smooth natural animation.";
        let animSettings = { duration: 4, resolution: "720p", movement_amplitude: "small" };

        try {
          const { data } = await supabase
            .from('ai_generation_settings')
            .select('prompt, model_settings')
            .eq('setting_type', 'avatar_animation')
            .eq('is_active', true)
            .single();
          if (data) {
            animPrompt = data.prompt || animPrompt;
            const ms = data.model_settings as any || {};
            animSettings = {
              duration: ms.duration || 4,
              resolution: ms.resolution || "720p",
              movement_amplitude: ms.movement_amplitude || "small",
            };
          }
        } catch {}

        const submitRes = await fetch("https://queue.fal.run/fal-ai/vidu/q2/image-to-video/turbo", {
          method: "POST",
          headers: {
            Authorization: `Key ${FAL_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: animPrompt,
            image_url: newAvatarUrl,
            ...animSettings,
          }),
        });

        if (submitRes.ok) {
          animationData = await submitRes.json();
          console.log("Animation queued:", animationData.request_id);
        } else {
          console.error("Animation failed:", await submitRes.text());
        }
      } catch (e) {
        console.error("Animation error:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id, avatar_url: newAvatarUrl, animation: animationData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
