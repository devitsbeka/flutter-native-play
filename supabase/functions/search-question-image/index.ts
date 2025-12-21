import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Category-based image keywords for better relevance
const categoryImageMap: Record<string, string[]> = {
  'science': ['laboratory', 'science experiment', 'molecules', 'research lab'],
  'geography': ['world map', 'globe', 'landscape', 'travel destination'],
  'history': ['ancient history', 'historical monument', 'museum artifact'],
  'sports': ['stadium', 'sports competition', 'athletics'],
  'entertainment': ['movie theater', 'stage performance', 'concert'],
  'art': ['art gallery', 'painting', 'sculpture', 'museum'],
  'music': ['musical instruments', 'concert hall', 'orchestra'],
  'literature': ['library books', 'old books', 'bookshelf'],
  'mathematics': ['mathematics equations', 'geometry', 'numbers'],
  'nature': ['wildlife', 'nature landscape', 'forest'],
  'animals': ['wildlife animals', 'animal photography'],
  'food': ['gourmet food', 'cooking', 'restaurant'],
  'technology': ['technology devices', 'computer', 'innovation'],
  'politics': ['government building', 'capitol', 'politics'],
  'film': ['cinema', 'movie set', 'film production'],
  'television': ['tv studio', 'broadcasting'],
  'general': ['education', 'knowledge', 'learning'],
};

function getCategorySearchTerm(category: string): string {
  const lowerCategory = category.toLowerCase();
  
  // Find matching category
  for (const [key, values] of Object.entries(categoryImageMap)) {
    if (lowerCategory.includes(key)) {
      // Return a random term from the category
      return values[Math.floor(Math.random() * values.length)];
    }
  }
  
  // Default fallback
  return categoryImageMap['general'][0];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, category } = await req.json();
    
    if (!category) {
      return new Response(
        JSON.stringify({ error: 'Category is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use category-based search for more relevant images
    const searchTerms = getCategorySearchTerm(category);
    console.log('Category:', category, '-> Searching for:', searchTerms);
    
    // Use Unsplash API for high-quality, free images
    const unsplashAccessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
    
    if (unsplashAccessKey) {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerms)}&per_page=5&orientation=landscape`,
        {
          headers: {
            'Authorization': `Client-ID ${unsplashAccessKey}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          // Pick a random image from results for variety
          const randomIndex = Math.floor(Math.random() * data.results.length);
          const imageUrl = data.results[randomIndex].urls.regular;
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
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerms)}&per_page=5&orientation=landscape`,
        {
          headers: {
            'Authorization': pexelsApiKey,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.photos && data.photos.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.photos.length);
          const imageUrl = data.photos[randomIndex].src.large;
          return new Response(
            JSON.stringify({ imageUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // Ultimate fallback: Use Lorem Picsum with category-based seed
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
