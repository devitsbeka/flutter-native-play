import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ZipReader, BlobReader, BlobWriter } from "https://deno.land/x/zipjs@v2.7.32/index.js";

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

    const { zipUrl, batchStart = 0, batchSize = 100 } = await req.json();

    const sourceUrl = zipUrl || `${supabaseUrl}/storage/v1/object/public/icons/icons.zip`;
    
    console.log(`Fetching ZIP from: ${sourceUrl}`);
    console.log(`Processing batch starting at ${batchStart}, size ${batchSize}`);

    // Fetch the ZIP file
    const zipResponse = await fetch(sourceUrl);
    if (!zipResponse.ok) {
      throw new Error(`Failed to fetch ZIP: ${zipResponse.status}`);
    }

    const zipBlob = await zipResponse.blob();
    console.log(`ZIP size: ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`);

    // Extract ZIP contents
    const zipReader = new ZipReader(new BlobReader(zipBlob));
    const entries = await zipReader.getEntries();
    
    // Filter for PNG files only
    const pngEntries = entries.filter((entry: any) => 
      !entry.directory && entry.filename.toLowerCase().endsWith('.png')
    );

    console.log(`Found ${pngEntries.length} PNG files in ZIP`);

    // Process only the requested batch
    const batchEnd = Math.min(batchStart + batchSize, pngEntries.length);
    const batchEntries = pngEntries.slice(batchStart, batchEnd);
    
    let uploadedCount = 0;
    let errors: string[] = [];

    for (const entry of batchEntries) {
      try {
        // Get filename without directory path
        const fileName = entry.filename.split('/').pop();
        if (!fileName) continue;

        // Extract file content
        const blobWriter = new BlobWriter();
        if (!entry.getData) continue;
        const blob = await entry.getData(blobWriter);
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('icon-library')
          .upload(fileName, blob, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          errors.push(`${fileName}: ${uploadError.message}`);
        } else {
          uploadedCount++;
        }

        // Log progress every 10 files
        if (uploadedCount % 10 === 0) {
          console.log(`Uploaded ${uploadedCount}/${batchEntries.length} files`);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${entry.filename}: ${errMsg}`);
      }
    }

    await zipReader.close();

    const hasMore = batchEnd < pngEntries.length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        uploadedCount,
        totalFiles: pngEntries.length,
        batchStart,
        batchEnd,
        hasMore,
        nextBatchStart: hasMore ? batchEnd : null,
        errors: errors.slice(0, 10) // Only return first 10 errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error extracting icons:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
