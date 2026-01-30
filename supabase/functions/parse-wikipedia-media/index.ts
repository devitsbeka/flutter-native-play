import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCorsPrelight(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { url, questionType } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Parsing URL:", url, "Type:", questionType);

    // Determine formats based on question type
    const formats: string[] = ["markdown"];
    if (questionType === "image") {
      formats.push("links");
    }

    // Scrape the URL using Firecrawl with extended timeout
    const firecrawlResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats,
        onlyMainContent: true,
        timeout: 60000, // 60 seconds timeout for slow pages
      }),
    });

    // Check response status first before parsing JSON
    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error("Firecrawl HTTP error:", firecrawlResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Firecrawl error (${firecrawlResponse.status}): ${firecrawlResponse.statusText}` 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let firecrawlData;
    try {
      firecrawlData = await firecrawlResponse.json();
    } catch (parseError) {
      console.error("Failed to parse Firecrawl response:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid response from scraping service" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!firecrawlData.success) {
      console.error("Firecrawl error:", firecrawlData);
      return new Response(
        JSON.stringify({ success: false, error: firecrawlData.error || "Failed to scrape URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = firecrawlData.data || firecrawlData;
    const markdown = data.markdown || "";
    const metadata = data.metadata || {};

    // Extract title
    const title = metadata.title || metadata.ogTitle || "Untitled";

    // Extract media based on type
    let mediaUrl: string | undefined;
    let mediaType: "image" | "video" | "audio" | undefined;

    if (questionType === "image") {
      // Look for main image in metadata or extract from content
      mediaUrl =
        metadata.ogImage ||
        metadata.image ||
        extractMainImage(markdown, url);
      mediaType = mediaUrl ? "image" : undefined;
    } else if (questionType === "audio") {
      // Look for audio files in the content
      mediaUrl = extractAudioUrl(markdown);
      mediaType = mediaUrl ? "audio" : undefined;
    } else if (questionType === "video") {
      // For video, we'll need external input (YouTube URL)
      // Just return indicator that video URL is needed
      mediaType = "video";
    }

    // Clean up content for AI processing
    const content = cleanMarkdown(markdown);

    return new Response(
      JSON.stringify({
        success: true,
        title,
        content: content.slice(0, 10000), // Limit content size
        mediaUrl,
        mediaType,
        favicon: metadata.favicon,
        needsExternalMedia: questionType === "video" && !mediaUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Parse error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractMainImage(markdown: string, baseUrl: string): string | undefined {
  // Look for Wikipedia infobox image first
  const infoboxMatch = markdown.match(
    /!\[([^\]]*)\]\((https?:\/\/upload\.wikimedia\.org\/[^\)]+)\)/
  );
  if (infoboxMatch) {
    return infoboxMatch[2];
  }

  // Look for any Wikipedia image
  const wikiImageMatch = markdown.match(
    /!\[([^\]]*)\]\((https?:\/\/[^\)]*wikimedia[^\)]+)\)/
  );
  if (wikiImageMatch) {
    return wikiImageMatch[2];
  }

  // Look for any image
  const imageMatch = markdown.match(
    /!\[([^\]]*)\]\((https?:\/\/[^\)]+\.(jpg|jpeg|png|webp|gif)[^\)]*)\)/i
  );
  if (imageMatch) {
    return imageMatch[2];
  }

  return undefined;
}

function extractAudioUrl(markdown: string): string | undefined {
  // Look for audio file links
  const audioMatch = markdown.match(
    /\[([^\]]*)\]\((https?:\/\/[^\)]+\.(mp3|ogg|wav|m4a)[^\)]*)\)/i
  );
  if (audioMatch) {
    return audioMatch[2];
  }

  // Look for Wikipedia commons audio
  const commonsAudio = markdown.match(
    /(https?:\/\/upload\.wikimedia\.org\/[^\s\)]+\.(ogg|mp3))/i
  );
  if (commonsAudio) {
    return commonsAudio[1];
  }

  return undefined;
}

function cleanMarkdown(markdown: string): string {
  return markdown
    // Remove images
    .replace(/!\[[^\]]*\]\([^\)]+\)/g, "")
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    // Remove multiple newlines
    .replace(/\n{3,}/g, "\n\n")
    // Remove markdown headers syntax (keep text)
    .replace(/^#+\s+/gm, "")
    .trim();
}
