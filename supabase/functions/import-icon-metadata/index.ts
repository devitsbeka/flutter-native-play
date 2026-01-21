import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { metadata, volume = 1 } = await req.json();

    if (!metadata || !Array.isArray(metadata)) {
      throw new Error('metadata array is required');
    }

    console.log(`Processing ${metadata.length} icons for volume ${volume}...`);

    // Process in batches of 500
    const batchSize = 500;
    let insertedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < metadata.length; i += batchSize) {
      const batch = metadata.slice(i, i + batchSize);
      
      const iconsToInsert = batch.map((icon: any) => ({
        title: icon.title,
        file_name: icon.file_name,
        slug: icon.slug,
        category: icon.category,
        tags: icon.tags || [],
        volume: volume,
        icon_url: `${supabaseUrl}/storage/v1/object/public/icon-library/${icon.file_name}`,
      }));

      const { data, error } = await supabase
        .from('icon_library')
        .upsert(iconsToInsert, { onConflict: 'slug', ignoreDuplicates: true })
        .select('id');

      if (error) {
        console.error(`Batch ${i / batchSize + 1} error:`, error);
        skippedCount += batch.length;
      } else {
        insertedCount += data?.length || 0;
        console.log(`Batch ${i / batchSize + 1}: Inserted ${data?.length || 0} icons`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        insertedCount,
        skippedCount,
        totalProcessed: metadata.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error importing icon metadata:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
