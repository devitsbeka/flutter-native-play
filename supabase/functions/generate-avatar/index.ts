import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// When set, scene generation goes through fal.ai's GPT Image 2 edit endpoint
// instead of the chat-completions gateway. Set with:
//   npx supabase secrets set FAL_KEY=<key>
const FAL_KEY = Deno.env.get('FAL_KEY');

interface AvatarRequest {
  imageUrl: string;
  // "scene" (default): 16:9 homepage hero scene using the DB prompt.
  // "portrait": square public mini avatar of the same stylized character.
  mode?: "scene" | "portrait";
  // Optional prompt override for testing/admin flows; the synced
  // ai_generation_settings prompt remains the default.
  prompt?: string;
}

// The public circle avatar. This text is kept BYTE-IDENTICAL to the
// frontend's PORTRAIT_AVATAR_PROMPT (src/config/portraitAvatarPrompt.ts
// with CHARACTER_RENDER_STYLE inlined): the override allowlist below
// compares by equality, so the app's own portrait request is recognized
// as canonical rather than treated as an arbitrary non-admin prompt.
const PORTRAIT_PROMPT = `Create a square stylized 3D character portrait using the supplied image as the identity reference. The reference shows the character in their scene — reproduce that same character's face, hair and outfit exactly, framed as a portrait.

FRAMING
Head and shoulders, centered, facing the viewer with a warm, natural, closed-lip smile. The head fills a comfortable portion of the frame with a little headroom — a normal portrait crop, never an extreme close-up.

CHARACTER RENDER STYLE — the MyTrivia house style
Render the person as a premium stylized 3D character: a high-end animated-feature or AAA game cinematic interpretation of this exact person. The style sits deliberately halfway between photography and cartoon — neither extreme is acceptable.

Keep from reality (do NOT stylize away):
- True human facial geometry and proportions FOR THIS PERSON'S ACTUAL AGE: normal-sized eyes, real nose and lip shapes, natural jaw and cheekbones, correct eye spacing. A child keeps a child's softer jaw, rounder cheeks and higher forehead; an adult keeps an adult's defined jaw and cheekbones. Never age the person up or down.
- The likeness itself: face shape, hairstyle, hair color, facial hair silhouette, eyebrows, skin tone, distinctive features. The person must be unmistakably recognizable.
- Natural head-to-body scale for their age.

Stylize (surface treatment only):
- Smooth idealized CG skin with soft subsurface shading instead of photographic pores, blemishes and skin texture.
- Cleanly groomed, sculpted hair with defined strand shapes instead of photographic hair detail.
- Soft, even, flattering studio light instead of camera-real lighting; gentle rim light and clean specular highlights.
- Slightly softened, rounded forms in clothing and silhouette.

Explicitly forbidden in BOTH directions:
- No photorealism: not a photograph, not a retouched photo, no photographic skin texture, no camera grain or lens artifacts.
- No cartoon exaggeration: no oversized or glossy anime eyes, no shrunken nose, no doll or caricature look, no chibi, no bobblehead, no plastic or toy appearance, no uncanny waxy skin. The head must never be enlarged BEYOND the person's real proportions for their age — a child's head is genuinely larger relative to their body than an adult's, and rendering that correctly is accuracy, not exaggeration.

CONSISTENCY WITH THE SCENE — CRITICAL
This portrait and the reference scene must read as the same character rendered by the same artist in the same production. Match the reference's face, skin tone, hairstyle and hair color, any headwear, and the level of realism exactly. Do not make the portrait more cartoonish, smoother or more idealized than the reference, and do not make it more photographic. If the reference wears a hat or beret, keep it.

AGE — MATCH THE REFERENCE EXACTLY
The character is the age the reference shows. If the reference is a child, the portrait is a child: rounder cheeks, softer jaw, higher forehead, smaller features, a head that reads large for the shoulders as a real child's does. If the reference is an adult, keep the adult jaw and cheekbones. Never age the character up or down in either direction — a child rendered as a small adult, or an adult smoothed into a youth, is a failed portrait even if the likeness is otherwise good.

WARDROBE
The character wears their purple hoodie with the small gold crown accent, as in the reference.

BACKGROUND
Soft pastel lavender radial background (#E9CCFF) with a gentle vignette, nothing else in frame.

No text, no UI, no logos, no frame, no watermark, no border.`;

// GPT Image 2 on fal: reference-image edit. Scenes render 16:9 close to
// 1920x1080 (fal requires multiple-of-16 dimensions, so 1088); portraits
// render square at medium quality — plenty for the circle avatar sizes.
async function generateWithFal(prompt: string, imageUrl: string, mode: "scene" | "portrait"): Promise<string> {
  const response = await fetch("https://fal.run/openai/gpt-image-2/edit", {
    method: "POST",
    headers: {
      "Authorization": `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_urls: [imageUrl],
      image_size: mode === "portrait" ? { width: 1024, height: 1024 } : { width: 1920, height: 1088 },
      quality: mode === "portrait" ? "medium" : "high",
      num_images: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("fal.ai error:", response.status, errorText);
    throw new Error(`fal.ai error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const url = result?.images?.[0]?.url;
  if (!url) {
    console.error("Could not extract image from fal result:", JSON.stringify(result).substring(0, 500));
    throw new Error("Could not extract generated image from fal response");
  }
  return url;
}

// Default prompt if database fetch fails
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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!AI_API_KEY && !FAL_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    const { imageUrl, mode = "scene", prompt: promptOverride }: AvatarRequest = await req.json();

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    console.log(`Starting avatar generation (${mode}) for:`, imageUrl.substring(0, 100));

    // Fetch settings from database
    let prompt = DEFAULT_PROMPT;
    let model = DEFAULT_MODEL;
    let promptSource = "default";

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: settings, error } = await supabase
          .from('ai_generation_settings')
          .select('prompt, model')
          .eq('setting_type', 'avatar_static')
          .eq('is_active', true)
          .single();

        if (!error && settings) {
          prompt = settings.prompt || DEFAULT_PROMPT;
          model = settings.model || DEFAULT_MODEL;
          promptSource = "db";
          console.log("Using database settings for avatar generation");
        } else {
          console.log("Using default settings, DB error:", error?.message);
        }
      } catch (dbError) {
        console.log("Using default settings due to DB fetch error:", dbError);
      }
    }

    if (promptOverride) {
      // The app's own avatar flow sends the scene preset, which mirrors the
      // ai_generation_settings row — that is always allowed. Any OTHER
      // prompt is an arbitrary instruction from whoever holds a JWT, and
      // the result becomes a public avatar: admins only. Non-admin
      // overrides are ignored (falling back to the canonical prompt), not
      // rejected, so older clients keep working.
      let allowOverride =
        promptOverride.trim() === prompt.trim() ||
        promptOverride.trim() === PORTRAIT_PROMPT.trim();
      if (!allowOverride && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { data: userData } = await supabase.auth.getUser(jwt);
          if (userData?.user) {
            const { data: adminRow } = await supabase
              .from("user_roles")
              .select("user_id")
              .eq("user_id", userData.user.id)
              .eq("role", "admin")
              .maybeSingle();
            allowOverride = !!adminRow;
          }
        } catch {
          /* fail closed: no override */
        }
      }
      if (allowOverride) {
        prompt = promptOverride;
        promptSource = "override";
      } else {
        console.log("Ignoring prompt override from non-admin caller");
      }
    }

    // Portraits: an ACCEPTED override wins, otherwise the built-in portrait
    // prompt. This used to key on "was an override supplied" — but the
    // guardrails above IGNORE a non-admin override, so every regular user's
    // portrait fell through to the scene settings prompt and the circle
    // avatar came back as a full square scene (beanbag, carpet, trophies).
    // What matters is whether an override was accepted, not supplied.
    if (mode === "portrait" && promptSource !== "override") {
      prompt = PORTRAIT_PROMPT;
      promptSource = "portrait";
    }

    // fal.ai GPT Image 2 path (preferred when configured). fal failures —
    // exhausted balance, rate limits, model outages — fall through to the
    // AI gateway below instead of failing the whole generation.
    if (FAL_KEY) {
      try {
        const falImage = await generateWithFal(prompt, imageUrl, mode);
        console.log("Avatar generated successfully via fal.ai");
        return new Response(
          JSON.stringify({ success: true, avatarUrl: falImage, promptSource }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (falError) {
        if (!AI_API_KEY) throw falError;
        console.error("fal.ai failed, falling back to AI gateway:", falError);
      }
    }

    // Use AI gateway's image editing model
    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel(model),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"],
        // Gemini image output config via the OpenAI-compat extension
        // namespace: 2K costs the same as the default 1K on Nano Banana Pro,
        // and a hard 16:9 beats prompt-steering the aspect ratio. Providers
        // that don't know the field ignore it. (OpenAI SDKs merge extra_body
        // into the request root — with raw fetch the "google" key goes at the
        // top level, never wrapped in a literal "extra_body" field.)
        google: {
          image_config: {
            aspect_ratio: mode === "portrait" ? "1:1" : "16:9",
            image_size: mode === "portrait" ? "1K" : "2K"
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Generation complete");

    // Extract the generated image from AI gateway response
    const generatedImage = result.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImage) {
      console.error("Could not extract image from result:", JSON.stringify(result).substring(0, 500));
      throw new Error("Could not extract generated image from response");
    }

    console.log("Avatar generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        avatarUrl: generatedImage, // This is a base64 data URL
        promptSource,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error generating avatar:', error);
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
