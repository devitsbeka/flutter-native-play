import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[sync-icon-library] Starting sync...');

    // Fetch all icons from the database
    const { data: icons, error, count } = await supabase
      .from('icon_library')
      .select('title, file_name, slug, category, tags', { count: 'exact' })
      .order('slug', { ascending: true });

    if (error) {
      console.error('[sync-icon-library] Database error:', error);
      throw error;
    }

    console.log(`[sync-icon-library] Fetched ${icons?.length || 0} icons`);

    // Format as the JSON structure expected by the frontend
    const exportData = {
      generated_at: new Date().toISOString(),
      total_count: count || icons?.length || 0,
      items: icons || []
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const jsonBlob = new Blob([jsonContent], { type: 'application/json' });

    // Upload to storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('icons')
      .upload('icon-library-meta.json', jsonBlob, {
        contentType: 'application/json',
        upsert: true, // Overwrite if exists
        cacheControl: '3600' // 1 hour cache
      });

    if (uploadError) {
      console.error('[sync-icon-library] Upload error:', uploadError);
      throw uploadError;
    }

    console.log('[sync-icon-library] Successfully uploaded to storage:', uploadData.path);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('icons')
      .getPublicUrl('icon-library-meta.json');

    return new Response(
      JSON.stringify({
        success: true,
        total_count: count || icons?.length || 0,
        storage_path: uploadData.path,
        public_url: urlData.publicUrl,
        generated_at: exportData.generated_at
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[sync-icon-library] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
