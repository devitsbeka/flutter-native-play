import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

interface ResolvedTopic {
  keyword: string;
  slug: string | null;
  wikiUrl: string | null;
  valid: boolean;
  title: string | null;
  error?: string;
}

serve(async (req) => {
  const corsResponse = handleCorsPrelight(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { keywords, language = "en" } = await req.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Keywords array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Resolving ${keywords.length} topics for language: ${language}`);

    // Process in batches of 20 to avoid rate limits
    const BATCH_SIZE = 20;
    const results: ResolvedTopic[] = [];

    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      const batch = keywords.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((keyword: string) => resolveWikipediaTopic(keyword, language))
      );
      results.push(...batchResults);

      // Small delay between batches
      if (i + BATCH_SIZE < keywords.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        topics: results,
        validCount: results.filter((r) => r.valid).length,
        invalidCount: results.filter((r) => !r.valid).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Resolve error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function resolveWikipediaTopic(
  keyword: string,
  language: string
): Promise<ResolvedTopic> {
  try {
    // Use Wikipedia search API to find the best match
    const searchUrl = `https://${language}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      keyword
    )}&srlimit=1&format=json&origin=*`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    const searchResults = searchData?.query?.search;
    if (!searchResults || searchResults.length === 0) {
      return {
        keyword,
        slug: null,
        wikiUrl: null,
        valid: false,
        title: null,
        error: "No Wikipedia page found",
      };
    }

    const title = searchResults[0].title;
    const slug = title.replace(/ /g, "_");
    const wikiUrl = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(slug)}`;

    // Verify the page exists and get proper title
    const verifyUrl = `https://${language}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      title
    )}&format=json&origin=*`;

    const verifyResponse = await fetch(verifyUrl);
    const verifyData = await verifyResponse.json();

    const pages = verifyData?.query?.pages;
    if (!pages) {
      return {
        keyword,
        slug: null,
        wikiUrl: null,
        valid: false,
        title: null,
        error: "Page verification failed",
      };
    }

    const pageId = Object.keys(pages)[0];
    if (pageId === "-1") {
      return {
        keyword,
        slug: null,
        wikiUrl: null,
        valid: false,
        title: null,
        error: "Page does not exist",
      };
    }

    const pageTitle = pages[pageId].title;

    return {
      keyword,
      slug: pageTitle.replace(/ /g, "_"),
      wikiUrl: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(
        pageTitle.replace(/ /g, "_")
      )}`,
      valid: true,
      title: pageTitle,
    };
  } catch (error) {
    console.error(`Error resolving "${keyword}":`, error);
    return {
      keyword,
      slug: null,
      wikiUrl: null,
      valid: false,
      title: null,
      error: error instanceof Error ? error.message : "Resolution failed",
    };
  }
}
