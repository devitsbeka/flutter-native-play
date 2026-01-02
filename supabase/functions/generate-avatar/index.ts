import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FAL_KEY = Deno.env.get('FAL_KEY');

interface AvatarRequest {
  imageUrl: string;
}

// Poll for result with timeout
async function pollForResult(requestId: string, maxAttempts = 60): Promise<any> {
  const statusUrl = `https://queue.fal.run/fal-ai/cartoonify/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/fal-ai/cartoonify/requests/${requestId}`;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`Polling attempt ${attempt + 1}/${maxAttempts}`);
    
    const statusResponse = await fetch(statusUrl, {
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
      },
    });
    
    if (!statusResponse.ok) {
      throw new Error(`Status check failed: ${statusResponse.status}`);
    }
    
    const status = await statusResponse.json();
    console.log("Status:", status.status);
    
    if (status.status === "COMPLETED") {
      // Fetch the actual result
      const resultResponse = await fetch(resultUrl, {
        headers: {
          "Authorization": `Key ${FAL_KEY}`,
        },
      });
      
      if (!resultResponse.ok) {
        throw new Error(`Result fetch failed: ${resultResponse.status}`);
      }
      
      return await resultResponse.json();
    }
    
    if (status.status === "FAILED") {
      throw new Error("Avatar generation failed: " + (status.error || "Unknown error"));
    }
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error("Avatar generation timed out");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!FAL_KEY) {
      throw new Error("FAL_KEY is not configured");
    }

    const { imageUrl }: AvatarRequest = await req.json();

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    console.log("Starting avatar generation with Fal.ai cartoonify for:", imageUrl.substring(0, 100));

    // Submit the job to Fal.ai cartoonify queue
    const submitResponse = await fetch("https://queue.fal.run/fal-ai/cartoonify", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl
      })
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error("Fal.ai submit error:", submitResponse.status, errorText);
      throw new Error(`Fal.ai API error: ${submitResponse.status} - ${errorText}`);
    }

    const submitResult = await submitResponse.json();
    console.log("Job submitted, request_id:", submitResult.request_id);

    // Poll for the result
    const result = await pollForResult(submitResult.request_id);
    console.log("Generation complete");

    // Extract the generated image URL
    const avatarUrl = result.image?.url;
    
    if (!avatarUrl) {
      console.error("Could not extract image from result:", JSON.stringify(result).substring(0, 500));
      throw new Error("Could not extract generated image from response");
    }

    console.log("Avatar generated successfully:", avatarUrl.substring(0, 100));

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
