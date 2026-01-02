import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface AvatarRequest {
  imageUrl: string;
}

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

    console.log("Starting avatar generation with Lovable AI for image:", imageUrl.substring(0, 100));

    // Use Lovable AI's Gemini image generation model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageUrl }
              },
              {
                type: "text",
                text: "Transform this photo into a cute 3D Pixar/Disney style cartoon character avatar. Make it have big expressive shiny cartoon eyes with sparkle catchlights, smooth soft matte cartoon skin, cute rounded facial features, stylized cartoon hair with volume, sweet friendly expression. Use soft violet and pink accent lighting on hair and face edges. Keep a dark navy gradient background. Make it look like a high quality Pixar Disney 3D render with charming lovable character design. Keep the same person's likeness but make them look adorable and cartoon-like."
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error response:", response.status, errorText);
      throw new Error(`Lovable AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Lovable AI response received");

    // Extract the generated image from the response
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("No content in response:", JSON.stringify(data));
      throw new Error("No image generated in response");
    }

    // The response may contain the image as base64 in inline_data or as a URL
    let avatarUrl = "";
    
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === "image" && part.image?.base64) {
          avatarUrl = `data:image/png;base64,${part.image.base64}`;
          break;
        }
        if (part.inline_data?.data) {
          avatarUrl = `data:${part.inline_data.mime_type || 'image/png'};base64,${part.inline_data.data}`;
          break;
        }
      }
    } else if (typeof content === "string" && content.startsWith("data:image")) {
      avatarUrl = content;
    }

    if (!avatarUrl) {
      console.error("Could not extract image from response:", JSON.stringify(data));
      throw new Error("Could not extract generated image from response");
    }

    console.log("Avatar generated successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        avatarUrl: avatarUrl,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error generating avatar:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
