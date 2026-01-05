import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting icon verification...');

    // Fetch all icons from icon_library
    const { data: icons, error: fetchError } = await supabase
      .from('icon_library')
      .select('slug, icon_url')
      .not('icon_url', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch icons: ${fetchError.message}`);
    }

    console.log(`Found ${icons?.length || 0} icons to verify`);

    if (!icons || icons.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        total: 0, 
        valid: 0, 
        broken: 0,
        message: 'No icons to verify'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clear old verification results
    await supabase.from('icon_verification_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    let validCount = 0;
    let brokenCount = 0;
    const batchSize = 50;
    const results: Array<{
      slug: string;
      icon_url: string;
      is_valid: boolean;
      error_message: string | null;
    }> = [];

    // Process icons in batches
    for (let i = 0; i < icons.length; i += batchSize) {
      const batch = icons.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(icons.length / batchSize)}`);

      const batchResults = await Promise.all(
        batch.map(async (icon) => {
          try {
            const response = await fetch(icon.icon_url, { method: 'HEAD' });
            const isValid = response.ok;
            
            if (isValid) {
              validCount++;
            } else {
              brokenCount++;
            }

            return {
              slug: icon.slug,
              icon_url: icon.icon_url,
              is_valid: isValid,
              error_message: isValid ? null : `HTTP ${response.status}`,
            };
          } catch (error) {
            brokenCount++;
            return {
              slug: icon.slug,
              icon_url: icon.icon_url,
              is_valid: false,
              error_message: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );

      results.push(...batchResults);
    }

    // Insert all results
    const { error: insertError } = await supabase
      .from('icon_verification_results')
      .insert(results);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to save results: ${insertError.message}`);
    }

    console.log(`Verification complete: ${validCount} valid, ${brokenCount} broken`);

    return new Response(JSON.stringify({
      success: true,
      total: icons.length,
      valid: validCount,
      broken: brokenCount,
      message: `Verified ${icons.length} icons: ${validCount} valid, ${brokenCount} broken`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
