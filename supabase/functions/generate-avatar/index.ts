import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface AvatarRequest {
  imageUrl: string;
}

// Default prompt if database fetch fails
const DEFAULT_PROMPT = `Transform this photo into a high-quality STYLIZED 3D rendered portrait.

STYLE REQUIREMENTS:
- STYLIZED 3D render like a Pixar/Disney 3D animation or modern mobile game character
- FRONT VIEW - face looking directly at camera, symmetrical composition
- Slightly larger, expressive eyes with detailed iris and reflections
- Smooth, polished skin with soft gradients - NOT photorealistic texture
- SOLID LIGHT LAVENDER/PURPLE BACKGROUND (#E9CCFF)
- Preserve the person's facial structure but IDEALIZE and smooth the features
- Add subtle violet/purple color tones to the hair for artistic flair
- Soft, flowing hair rendering with volume
- Keep their general hairstyle and hair color base
- Head and shoulders portrait, centered
- Soft, even studio lighting
- Clean, polished 3D animation aesthetic

The result should look like a premium 3D animated character portrait - stylized and polished like Pixar/Fortnite style, with a light lavender (#E9CCFF) background.`;

const DEFAULT_MODEL = "google/gemini-2.5-flash-image-preview";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageUrl }: AvatarRequest = await req.json();

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    console.log("Starting avatar generation with Lovable AI for:", imageUrl.substring(0, 100));

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

    // Use Lovable AI's image editing model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
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
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Generation complete");

    // Extract the generated image from Lovable AI response
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
