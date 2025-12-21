import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract key terms from a question for image search
function extractSearchTerms(question: string, category: string): string {
  // Remove common question words and punctuation
  const cleanQuestion = question
    .replace(/what|which|who|where|when|how|is|are|was|were|the|a|an|of|in|for|to|and|or|\?|'|"|`/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Get first 3-4 meaningful words plus category
  const words = cleanQuestion.split(' ').filter(w => w.length > 2).slice(0, 4);
  const searchQuery = [...words, category.split(':').pop()?.trim() || category].join(' ');
  
  return searchQuery;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, category } = await req.json();
    
    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchTerms = extractSearchTerms(question, category);
    console.log('Searching for:', searchTerms);
    
    // Use Unsplash API for high-quality, free images
    const unsplashAccessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
    
    if (unsplashAccessKey) {
      // If we have Unsplash API key, use it for better results
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerms)}&per_page=1&orientation=landscape`,
        {
          headers: {
            'Authorization': `Client-ID ${unsplashAccessKey}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const imageUrl = data.results[0].urls.regular;
          return new Response(
            JSON.stringify({ imageUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // Fallback: Use Pexels API
    const pexelsApiKey = Deno.env.get('PEXELS_API_KEY');
    
    if (pexelsApiKey) {
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerms)}&per_page=1&orientation=landscape`,
        {
          headers: {
            'Authorization': pexelsApiKey,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.photos && data.photos.length > 0) {
          const imageUrl = data.photos[0].src.large;
          return new Response(
            JSON.stringify({ imageUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // Ultimate fallback: Use Lorem Picsum with a seed based on question
    // This gives us a consistent random image per question
    const seed = searchTerms.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const fallbackUrl = `https://picsum.photos/seed/${seed}/800/450`;
    
    return new Response(
      JSON.stringify({ imageUrl: fallbackUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error searching for image:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
