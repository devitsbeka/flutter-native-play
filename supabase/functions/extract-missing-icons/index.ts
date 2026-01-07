import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ZipReader, BlobReader, BlobWriter } from "https://deno.land/x/zipjs@v2.7.32/index.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize filename to match database slug format
function normalizeToSlug(filename: string): string {
  // Remove extension
  let slug = filename.replace(/\.(png|jpg|jpeg|gif|webp|svg)$/i, '');
  
  // Replace underscores with dashes
  slug = slug.replace(/_/g, '-');
  
  // Remove only non-numeric version suffixes like -v2, -final, -copy, etc.
  // KEEP numeric suffixes like -1, -2 as they are part of the slug!
  slug = slug.replace(/[-_](v\d+|final|copy|new|old|fixed|updated)$/i, '');
  
  // Lowercase and trim
  slug = slug.toLowerCase().trim();
  
  // Remove any double dashes
  slug = slug.replace(/--+/g, '-');
  
  return slug;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { zipUrl, batchStart = 0, batchSize = 50 } = await req.json();

    if (!zipUrl) {
      throw new Error("zipUrl is required");
    }

    console.log(`Fetching ZIP from: ${zipUrl}`);
    console.log(`Processing batch starting at ${batchStart}, size ${batchSize}`);

    // Fetch the ZIP file
    const zipResponse = await fetch(zipUrl);
    if (!zipResponse.ok) {
      throw new Error(`Failed to fetch ZIP: ${zipResponse.status}`);
    }

    const zipBlob = await zipResponse.blob();
    console.log(`ZIP size: ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`);

    // Extract ZIP contents
    const zipReader = new ZipReader(new BlobReader(zipBlob));
    const entries = await zipReader.getEntries();
    
    // Filter for image files only
    const imageEntries = entries.filter((entry: any) => 
      !entry.directory && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(entry.filename)
    );

    console.log(`Found ${imageEntries.length} image files in ZIP`);

    // Get all broken icons from verification results table
    const { data: brokenIcons, error: fetchError } = await supabase
      .from('icon_verification_results')
      .select('slug, icon_url')
      .eq('is_valid', false);

    if (fetchError) {
      console.error("Error fetching broken icons:", fetchError);
    }

    // Create a set of broken slugs for quick lookup
    const brokenSlugs = new Set((brokenIcons || []).map(icon => icon.slug));
    console.log(`Found ${brokenSlugs.size} broken icons in verification results`);

    // Process only the requested batch
    const batchEnd = Math.min(batchStart + batchSize, imageEntries.length);
    const batchEntries = imageEntries.slice(batchStart, batchEnd);
    
    let uploadedCount = 0;
    let matchedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const fixedIcons: string[] = [];

    for (const entry of batchEntries) {
      try {
        // Get filename without directory path
        const originalFileName = entry.filename.split('/').pop();
        if (!originalFileName) {
          skippedCount++;
          continue;
        }

        // Normalize to slug format
        const slug = normalizeToSlug(originalFileName);
        const storageFileName = `${slug}.png`;
        
        // Check if this matches a broken icon or any icon in our library
        const { data: existingIcon } = await supabase
          .from('icon_library')
          .select('id, slug, icon_url')
          .eq('slug', slug)
          .single();

        if (!existingIcon) {
          // Try alternative normalization (keep underscores as-is for some icons)
          const altSlug = originalFileName.replace(/\.(png|jpg|jpeg|gif|webp|svg)$/i, '').toLowerCase();
          const { data: altIcon } = await supabase
            .from('icon_library')
            .select('id, slug, icon_url')
            .eq('slug', altSlug)
            .single();
          
          if (!altIcon) {
            console.log(`No match found for: ${originalFileName} (tried: ${slug}, ${altSlug})`);
            skippedCount++;
            continue;
          }
        }

        const targetIcon = existingIcon;
        if (!targetIcon) {
          skippedCount++;
          continue;
        }

        matchedCount++;

        // Extract file content
        const blobWriter = new BlobWriter();
        if (!entry.getData) {
          skippedCount++;
          continue;
        }
        const blob = await entry.getData(blobWriter);
        
        // Upload to storage with the normalized slug name
        const { error: uploadError } = await supabase.storage
          .from('icon-library')
          .upload(storageFileName, blob, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          errors.push(`${originalFileName}: ${uploadError.message}`);
          continue;
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('icon-library')
          .getPublicUrl(storageFileName);

        const newUrl = urlData.publicUrl;

        // Update the icon_library with the new URL
        const { error: updateError } = await supabase
          .from('icon_library')
          .update({ icon_url: newUrl })
          .eq('slug', targetIcon.slug);

        if (updateError) {
          errors.push(`DB update ${targetIcon.slug}: ${updateError.message}`);
          continue;
        }

        // Mark as valid in verification results
        await supabase
          .from('icon_verification_results')
          .update({ 
            is_valid: true, 
            icon_url: newUrl,
            error_message: null,
            last_checked_at: new Date().toISOString()
          })
          .eq('slug', targetIcon.slug);

        // Log to fix history
        await supabase
          .from('icon_fix_history')
          .insert({
            icon_slug: targetIcon.slug,
            old_url: targetIcon.icon_url,
            new_url: newUrl
          });

        uploadedCount++;
        fixedIcons.push(targetIcon.slug);

        // Log progress every 10 files
        if (uploadedCount % 10 === 0) {
          console.log(`Progress: ${uploadedCount} uploaded, ${matchedCount} matched, ${skippedCount} skipped`);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${entry.filename}: ${errMsg}`);
      }
    }

    await zipReader.close();

    const hasMore = batchEnd < imageEntries.length;

    console.log(`Batch complete: ${uploadedCount} uploaded, ${matchedCount} matched, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        uploadedCount,
        matchedCount,
        skippedCount,
        totalFiles: imageEntries.length,
        batchStart,
        batchEnd,
        hasMore,
        nextBatchStart: hasMore ? batchEnd : null,
        fixedIcons: fixedIcons.slice(0, 20), // Return first 20 fixed icons
        errors: errors.slice(0, 10) // Only return first 10 errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error extracting missing icons:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
