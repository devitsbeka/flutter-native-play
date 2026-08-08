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

// The public circle avatar: same character language as the scene, but a
// centered square head-and-shoulders portrait.
const PORTRAIT_PROMPT = `Create a square stylized 3D game avatar portrait using the uploaded face photo as the identity reference.

Head and shoulders, centered, facing the viewer with a warm confident smile.

Preserve the person's recognizable facial identity: face shape, skin tone, hairstyle, hair color, facial hair, eyebrows, eyes, nose, lips and proportions. The result should clearly resemble the same person as a polished stylized 3D game character, not a photorealistic human and not a generic replacement.

Use the premium casual-game character language of the MyTrivia avatar scenes: soft rounded forms, subtly larger head, expressive eyes, detailed stylized hair, soft skin shading, polished 3D rendering. Not childish, not plastic, not uncanny.

Dress the character in a premium purple hoodie with a small gold crown accent.

Soft pastel lavender radial background (#E9CCFF) with a gentle vignette, nothing else in frame.

No text, no UI, no logos, no frame, no watermark.`;

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
      prompt = promptOverride;
      promptSource = "override";
    }

    // Portraits use their fixed prompt; scenes use the DB/override one
    if (mode === "portrait") {
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
