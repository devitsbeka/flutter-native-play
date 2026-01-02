import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface AvatarRequest {
  imageUrl: string;
}

const AVATAR_PROMPT = `Create a fun, friendly 3D avatar portrait based on this photo.

EXPRESSION (Very Important):
- Gentle, warm CLOSED-MOUTH smile - lips together, NO TEETH SHOWING
- Bright, big and wide open sparkling eyes with a hint of joy
- Confident, positive expression - NOT sad or neutral
- Subtle, pleasant smile like Mona Lisa - friendly but lips closed

LIKENESS (CRITICAL - Must be recognizable):
- COPY their EXACT face shape and jawline precisely from the photo
- COPY their EXACT nose shape and size
- COPY their EXACT eye shape, spacing, and eye color
- COPY their EXACT eyebrow shape and thickness
- COPY their EXACT lip shape and mouth width
- COPY their EXACT hairstyle, hair color, and hair texture
- COPY their EXACT skin tone
- The avatar MUST look like THIS SPECIFIC PERSON, not a generic character

STYLE - Fun & Appealing:
- Slightly larger, more expressive eyes (15-20% bigger)
- Smooth, polished 3D cartoon render like a Pixar character
- Vibrant, flattering colors
- Youthful, energetic appearance
- Clean, professional finish with soft lighting

TECHNICAL:
- Dark gradient background (teal to navy)
- Head and shoulders composition
- Soft, warm studio lighting that flatters

The result should be a fun avatar that is CLEARLY RECOGNIZABLE as this specific person - just stylized and beautified.`;

// Fetch image and convert to base64 data URL using chunked approach
async function fetchImageAsDataUrl(imageUrl: string): Promise<string> {
  console.log("Fetching image from URL:", imageUrl.substring(0, 100));
  
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Convert to base64 in chunks to avoid stack overflow
  let binary = '';
  const chunkSize = 8192; // Process 8KB at a time
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const base64 = btoa(binary);
  
  console.log("Image converted to base64, length:", base64.length);
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
    console.log("Image data URL ready, length:", imageDataUrl.length);

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
    const message = data.choices?.[0]?.message;
    const images = message?.images;
    
    console.log("Message content:", message?.content ? "has content" : "no content");
    console.log("Images array:", images ? `found ${images.length} images` : "no images");
    
    let avatarUrl = "";
    
    if (images && images.length > 0) {
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
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      // Provide user-friendly messages
      if (errorMessage.includes('Maximum call stack')) {
        errorMessage = 'Image too large. Please try a smaller photo.';
      } else if (errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Could not load your image. Please try uploading again.';
      }
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
