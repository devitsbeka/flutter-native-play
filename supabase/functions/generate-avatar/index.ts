import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

type AvatarStyle = 'realistic' | 'cartoon' | 'artistic';

interface AvatarRequest {
  imageUrl: string;
  style?: AvatarStyle;
}

const STYLE_PROMPTS: Record<AvatarStyle, string> = {
  realistic: "Create a professional 3D rendered portrait based on this photo. CRITICAL: Preserve the person's exact facial structure, eye shape, nose, mouth, skin tone, and overall likeness with high accuracy - this must clearly look like them. Apply subtle 3D rendering with natural skin texture, professional studio lighting, and a clean dark gradient background. Keep all proportions completely realistic with no stylization or exaggeration. Add soft professional rim lighting. The result should look like a high-end corporate headshot or LinkedIn photo with subtle 3D polish.",
  
  cartoon: "Transform this photo into a fun 3D Pixar/Disney style cartoon character. Give them big expressive cartoon eyes with sparkle highlights, smooth stylized skin, cute rounded features, and voluminous stylized hair. Keep a friendly cheerful expression. Use soft violet and pink accent lighting. Dark navy gradient background. Make it look like a charming Pixar character while maintaining some resemblance to the original person.",
  
  artistic: "Transform this photo into a stylized digital art portrait. Create an artistic interpretation with bold colors, dramatic lighting, and painterly textures. Use vibrant color grading with teal and orange tones. Add artistic brush stroke effects and dynamic shadows. Keep the person recognizable but with an artistic, illustration-style finish. Dark moody background with color splashes."
};

// Fetch image and convert to base64 data URL
async function fetchImageAsDataUrl(imageUrl: string): Promise<string> {
  console.log("Fetching image from URL:", imageUrl.substring(0, 100));
  
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  
  // Always use PNG MIME type - Lovable AI will handle the conversion
  return `data:image/png;base64,${base64}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageUrl, style = 'realistic' }: AvatarRequest = await req.json();

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    const prompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.realistic;
    console.log("Starting avatar generation with style:", style, "for image:", imageUrl.substring(0, 100));

    // Fetch the image and convert to base64 data URL
    const imageDataUrl = await fetchImageAsDataUrl(imageUrl);
    console.log("Image converted to data URL, length:", imageDataUrl.length);

    // Use Lovable AI's Gemini image generation model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageDataUrl }
              },
              {
                type: "text",
                text: prompt
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
    // Lovable AI returns images in message.images array
    const message = data.choices?.[0]?.message;
    const images = message?.images;
    
    console.log("Message content:", message?.content ? "has content" : "no content");
    console.log("Images array:", images ? `found ${images.length} images` : "no images");
    
    let avatarUrl = "";
    
    if (images && images.length > 0) {
      // Get the image URL from the images array
      avatarUrl = images[0]?.image_url?.url || "";
      console.log("Extracted avatar URL length:", avatarUrl.length);
    }
    
    if (!avatarUrl) {
      console.error("Could not extract image from response. Message:", JSON.stringify(message).substring(0, 500));
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
