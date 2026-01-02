import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface AvatarRequest {
  imageUrl: string;
}

const AVATAR_PROMPT = "Create a high-quality 3D rendered portrait based on this photo. CRITICAL: Preserve the person's exact facial structure, eye shape, nose, mouth, jawline, skin tone, hair style, hair color, and overall likeness with very high accuracy - this must clearly look like them. Apply subtle 3D rendering with smooth but natural skin texture, as if this were a high-end video game character or Metahuman render. Use professional studio lighting with soft violet/blue rim lighting on hair and face edges. Keep proportions realistic with only minimal stylization. Clean dark navy gradient background. The result should look like a premium 3D avatar portrait suitable for gaming or professional use.";

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

    const { imageUrl }: AvatarRequest = await req.json();

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    console.log("Starting avatar generation for image:", imageUrl.substring(0, 100));

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
                text: AVATAR_PROMPT
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
