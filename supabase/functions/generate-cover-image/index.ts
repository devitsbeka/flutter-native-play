import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, subject, roundId } = await req.json();

    // Get user from auth header
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check generation limit (max 3 per round or session)
    let previousGenerations: any[] = [];
    if (roundId) {
      const { data: existingGenerations } = await supabaseAdmin
        .from("cover_image_generations")
        .select("*")
        .eq("user_id", user.id)
        .eq("round_id", roundId)
        .order("created_at", { ascending: false });

      previousGenerations = existingGenerations || [];

      if (previousGenerations.length >= 3) {
        return new Response(
          JSON.stringify({ 
            error: "Generation limit reached", 
            previousGenerations,
            generationCount: previousGenerations.length 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate image using AI gateway
    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY not configured");
    }

    const prompt = `Create a vibrant, modern abstract illustration for a trivia quiz about "${title || 'Quiz'}".
Theme: ${subject || 'general trivia'}.
Style: colorful, abstract, geometric patterns, artistic shapes, eye-catching gradients.

CRITICAL REQUIREMENTS:
- ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS, NO WRITING of any kind in the image
- Pure visual elements only - shapes, colors, patterns, silhouettes, abstract forms
- Abstract artistic representation of the theme
- Bold, vivid colors suitable for a mobile trivia game app
- Clean, modern aesthetic
- Ultra high resolution, 16:9 aspect ratio for mobile cover display`;

    console.log("Generating image with prompt:", prompt);

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-3-pro-image-preview"),
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    console.log("AI response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API failed: ${response.status}`);
    }

    const aiData = await response.json();
    console.log("AI response structure:", JSON.stringify(Object.keys(aiData)));
    
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in response:", JSON.stringify(aiData));
      throw new Error("No image generated");
    }

    // The image is base64 encoded, we need to upload it to storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `${user.id}/${Date.now()}_ai.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("quiz-covers")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload generated image");
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("quiz-covers")
      .getPublicUrl(fileName);

    // Save generation to database
    if (roundId) {
      await supabaseAdmin
        .from("cover_image_generations")
        .insert({
          user_id: user.id,
          round_id: roundId,
          title: title || "Quiz",
          subject: subject || null,
          image_url: publicUrl,
          is_selected: false,
        });

      // Fetch updated generations
      const { data: updatedGenerations } = await supabaseAdmin
        .from("cover_image_generations")
        .select("*")
        .eq("user_id", user.id)
        .eq("round_id", roundId)
        .order("created_at", { ascending: false });

      previousGenerations = updatedGenerations || [];
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: publicUrl,
        previousGenerations,
        generationCount: previousGenerations.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
