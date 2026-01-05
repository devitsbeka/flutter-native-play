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

    console.log('[export-icon-library] Starting export...');

    // Fetch all icons from the database
    const { data: icons, error, count } = await supabase
      .from('icon_library')
      .select('title, file_name, slug, category, tags', { count: 'exact' })
      .order('slug', { ascending: true });

    if (error) {
      console.error('[export-icon-library] Database error:', error);
      throw error;
    }

    console.log(`[export-icon-library] Fetched ${icons?.length || 0} icons`);

    // Format as the JSON structure expected by the frontend
    const exportData = {
      generated_at: new Date().toISOString(),
      total_count: count || icons?.length || 0,
      items: icons || []
    };

    return new Response(
      JSON.stringify(exportData, null, 2),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="icon-library-meta.json"'
        } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[export-icon-library] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
