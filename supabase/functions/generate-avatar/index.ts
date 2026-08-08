import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY } from "../_shared/ai.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface AvatarRequest {
  imageUrl: string;
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
    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    const { imageUrl }: AvatarRequest = await req.json();

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    console.log("Starting avatar generation with AI gateway for:", imageUrl.substring(0, 100));

    // Fetch settings from database
    let prompt = DEFAULT_PROMPT;
    let model = DEFAULT_MODEL;

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
          console.log("Using database settings for avatar generation");
        } else {
          console.log("Using default settings, DB error:", error?.message);
        }
      } catch (dbError) {
        console.log("Using default settings due to DB fetch error:", dbError);
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
        model: model,
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
        // and a hard 16:9 beats prompt-steering the aspect ratio. Gateways
        // that don't know the field ignore it.
        extra_body: {
          google: {
            image_config: {
              aspect_ratio: "16:9",
              image_size: "2K"
            }
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
