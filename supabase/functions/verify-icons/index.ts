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

    // Parse request body for options
    let resetAll = false;
    try {
      const body = await req.json();
      resetAll = body?.reset === true;
    } catch { /* no body or invalid json */ }

    console.log(`Starting icon verification... (reset: ${resetAll})`);

    // If reset, clear all verification results
    if (resetAll) {
      await supabase.from('icon_verification_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      console.log('Cleared all verification results');
    }

    // Get already verified slugs
    const { data: verified } = await supabase
      .from('icon_verification_results')
      .select('slug');
    const verifiedSlugs = new Set((verified || []).map(v => v.slug));
    console.log(`Already verified: ${verifiedSlugs.size} icons`);

    // Fetch icons that haven't been verified yet
    const allIcons: Array<{ slug: string; icon_url: string }> = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error: fetchError } = await supabase
        .from('icon_library')
        .select('slug, icon_url')
        .not('icon_url', 'is', null)
        .range(offset, offset + pageSize - 1);

      if (fetchError) {
        throw new Error(`Failed to fetch icons: ${fetchError.message}`);
      }

      if (batch && batch.length > 0) {
        // Only add icons not already verified
        const unverified = batch.filter(icon => !verifiedSlugs.has(icon.slug));
        allIcons.push(...unverified);
        offset += batch.length;
        hasMore = batch.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    console.log(`Found ${allIcons.length} unverified icons to check`);

    if (allIcons.length === 0) {
      // Get current totals
      const { data: stats } = await supabase
        .from('icon_verification_results')
        .select('is_valid');
      const valid = stats?.filter(s => s.is_valid).length || 0;
      const broken = stats?.filter(s => !s.is_valid).length || 0;
      
      return new Response(JSON.stringify({ 
        success: true, 
        total: valid + broken,
        valid,
        broken,
        done: true,
        message: 'All icons already verified'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let validCount = 0;
    let brokenCount = 0;
    const verifyBatchSize = 100; // Larger batches for speed
    const results: Array<{
      slug: string;
      icon_url: string;
      is_valid: boolean;
      error_message: string | null;
    }> = [];

    // Process up to 3000 icons per invocation to avoid timeout
    const maxPerRun = 3000;
    const iconsToProcess = allIcons.slice(0, maxPerRun);

    for (let i = 0; i < iconsToProcess.length; i += verifyBatchSize) {
      const batch = iconsToProcess.slice(i, i + verifyBatchSize);
      console.log(`Verifying batch ${Math.floor(i / verifyBatchSize) + 1}/${Math.ceil(iconsToProcess.length / verifyBatchSize)} (${i + batch.length}/${iconsToProcess.length})`);

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

      // Insert in chunks
      if (results.length >= 500 || i + verifyBatchSize >= iconsToProcess.length) {
        const { error: insertError } = await supabase
          .from('icon_verification_results')
          .upsert(results, { onConflict: 'slug' });

        if (insertError) {
          console.error('Insert error:', insertError);
        }
        results.length = 0;
      }
    }

    const remaining = allIcons.length - iconsToProcess.length;
    const done = remaining === 0;

    console.log(`Batch complete: ${validCount} valid, ${brokenCount} broken. Remaining: ${remaining}`);

    return new Response(JSON.stringify({
      success: true,
      processed: iconsToProcess.length,
      valid: validCount,
      broken: brokenCount,
      remaining,
      done,
      message: done 
        ? `Verification complete: ${validCount} valid, ${brokenCount} broken`
        : `Verified ${iconsToProcess.length} icons. ${remaining} remaining - call again to continue.`
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
