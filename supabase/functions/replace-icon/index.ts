import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const slug = formData.get("slug") as string;

    if (!file || !slug) {
      return new Response(
        JSON.stringify({ error: "Missing file or slug" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Delete existing file first
    await supabase.storage.from("icon-library").remove([`${slug}.png`]);

    // Upload new file
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("icon-library")
      .upload(`${slug}.png`, arrayBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update icon_url in database to bust cache
    const iconUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/icon-library/${slug}.png?v=${Date.now()}`;
    await supabase
      .from("icon_library")
      .update({ icon_url: iconUrl })
      .eq("slug", slug);

    return new Response(
      JSON.stringify({ success: true, iconUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
