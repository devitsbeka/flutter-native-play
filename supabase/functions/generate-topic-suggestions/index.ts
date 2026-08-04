import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CategoryType = 'athletes' | 'places' | 'artworks' | 'historical' | 'scientists' | 'musicians' | 'entertainers' | 'generic';

// Detect category type from name (supports both Georgian and English)
function detectCategoryType(categoryName: string): CategoryType {
  const name = categoryName.toLowerCase();
  
  // Sports/Athletes
  if (/სპორტ|sport|athlete|football|basketball|tennis|olympic|ფეხბურთ|კალათბურთ|ათლეტ/.test(name)) return 'athletes';
  
  // Geography/Places
  if (/გეოგრაფ|geography|city|country|capital|flag|landmark|ქალაქ|ქვეყან|დედაქალაქ|დროშ|ღირსშესანიშნაობ/.test(name)) return 'places';
  
  // Art/Artworks
  if (/ხელოვნება|art|paint|sculpt|museum|gallery|მხატვარ|ნახატ|ქანდაკება|მუზეუმ/.test(name)) return 'artworks';
  
  // History
  if (/ისტორია|history|war|revolution|ancient|medieval|ომ|რევოლუცია|ძველი/.test(name)) return 'historical';
  
  // Science
  if (/მეცნიერება|science|physics|chemistry|biology|math|ფიზიკ|ქიმია|ბიოლოგია|მათემატიკ/.test(name)) return 'scientists';
  
  // Music
  if (/მუსიკა|music|song|singer|composer|band|orchestra|მომღერ|კომპოზიტორ|ჯგუფ|ორკესტრ/.test(name)) return 'musicians';
  
  // Cinema/Entertainment
  if (/კინო|cinema|movie|actor|director|film|hollywood|მსახიობ|რეჟისორ|ფილმ/.test(name)) return 'entertainers';
  
  return 'generic';
}

// Get category-specific prompt for generating specific items (not themes)
function getPromptForCategory(categoryName: string, categoryType: CategoryType): string {
  const prompts: Record<CategoryType, string> = {
    athletes: `Generate 12 famous athletes and sportspeople for trivia questions about "${categoryName}". Include a mix of:
- 4 football/soccer players (e.g., Lionel Messi, Cristiano Ronaldo, Pelé, Zinedine Zidane)
- 3 basketball players (e.g., Michael Jordan, LeBron James, Kobe Bryant)
- 2 tennis players (e.g., Serena Williams, Roger Federer)
- 3 other sports athletes (e.g., Usain Bolt, Michael Phelps, Muhammad Ali)

IMPORTANT: Return SPECIFIC PERSON NAMES, not categories. Each person must be world-famous and have a Wikipedia page with their photo.
Return ONLY a JSON array of 12 strings with their names.`,

    places: `Generate 12 famous places for visual trivia questions about "${categoryName}". Include a mix of:
- 4 major world cities (e.g., Paris, Tokyo, New York City, London)
- 4 famous landmarks (e.g., Eiffel Tower, Colosseum, Taj Mahal, Great Wall of China)
- 4 countries (e.g., Japan, Brazil, Italy, Australia)

IMPORTANT: Return SPECIFIC PLACE NAMES, not categories. Each must be visually recognizable and have Wikipedia images.
Return ONLY a JSON array of 12 strings with place names.`,

    artworks: `Generate 12 famous art-related subjects for trivia questions about "${categoryName}". Include a mix of:
- 4 famous painters (e.g., Leonardo da Vinci, Vincent van Gogh, Pablo Picasso, Claude Monet)
- 4 famous paintings (e.g., Mona Lisa, The Starry Night, The Scream, Girl with a Pearl Earring)
- 4 famous sculptors or sculptures (e.g., Michelangelo, The Thinker, Venus de Milo, David)

IMPORTANT: Return SPECIFIC NAMES of artists or artworks, not categories. Each must have Wikipedia images.
Return ONLY a JSON array of 12 strings.`,

    historical: `Generate 12 famous historical figures for trivia questions about "${categoryName}". Include a mix of:
- 4 political leaders (e.g., Napoleon Bonaparte, Winston Churchill, Abraham Lincoln, Cleopatra)
- 4 revolutionaries/reformers (e.g., Mahatma Gandhi, Martin Luther King Jr., Nelson Mandela)
- 4 ancient/medieval figures (e.g., Julius Caesar, Alexander the Great, Genghis Khan)

IMPORTANT: Return SPECIFIC PERSON NAMES, not categories. Each must have Wikipedia images.
Return ONLY a JSON array of 12 strings with their names.`,

    scientists: `Generate 12 famous scientists and inventors for trivia questions about "${categoryName}". Include a mix of:
- 4 physicists (e.g., Albert Einstein, Isaac Newton, Stephen Hawking, Nikola Tesla)
- 4 biologists/chemists (e.g., Marie Curie, Charles Darwin, Louis Pasteur)
- 4 inventors/mathematicians (e.g., Thomas Edison, Leonardo da Vinci, Galileo Galilei)

IMPORTANT: Return SPECIFIC PERSON NAMES, not categories. Each must have Wikipedia images.
Return ONLY a JSON array of 12 strings with their names.`,

    musicians: `Generate 12 famous musicians and composers for trivia questions about "${categoryName}". Include a mix of:
- 4 classical composers (e.g., Mozart, Beethoven, Bach, Chopin)
- 4 modern musicians (e.g., Michael Jackson, Freddie Mercury, Elvis Presley, Madonna)
- 4 contemporary artists (e.g., Beyoncé, Ed Sheeran, Taylor Swift, Adele)

IMPORTANT: Return SPECIFIC PERSON NAMES, not categories. Each must be world-famous with Wikipedia images.
Return ONLY a JSON array of 12 strings with their names.`,

    entertainers: `Generate 12 famous actors and directors for trivia questions about "${categoryName}". Include a mix of:
- 4 Hollywood actors (e.g., Tom Hanks, Leonardo DiCaprio, Meryl Streep, Morgan Freeman)
- 4 famous directors (e.g., Steven Spielberg, Quentin Tarantino, Christopher Nolan, Martin Scorsese)
- 4 international film stars (e.g., Jackie Chan, Shah Rukh Khan, Marion Cotillard)

IMPORTANT: Return SPECIFIC PERSON NAMES, not categories. Each must have Wikipedia images.
Return ONLY a JSON array of 12 strings with their names.`,

    generic: `Generate 12 famous people, places, or things for trivia questions about "${categoryName}".

Consider what type of subjects would work best for this category:
- If about people: include famous historical figures, celebrities, or notable individuals
- If about places: include cities, landmarks, or countries
- If about things: include famous objects, brands, or concepts

IMPORTANT: Return SPECIFIC NAMES that are world-famous and have Wikipedia pages with images.
Return ONLY a JSON array of 12 strings.`,
  };
  
  return prompts[categoryType];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryName, excludeTopics = [] } = await req.json();

    if (!categoryName) {
      return new Response(
        JSON.stringify({ error: 'Category name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    // Detect category type and get appropriate prompt
    const categoryType = detectCategoryType(categoryName);
    let prompt = getPromptForCategory(categoryName, categoryType);
    
    // Add exclusion instruction if there are topics to exclude
    if (excludeTopics.length > 0) {
      prompt += `\n\nIMPORTANT: Do NOT include any of these already-used topics: ${excludeTopics.join(', ')}. Generate completely DIFFERENT suggestions that are not in this list.`;
    }

    console.log(`Generating suggestions for category "${categoryName}" (type: ${categoryType}), excluding ${excludeTopics.length} topics`);

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-2.5-flash"),
        messages: [
          { 
            role: "system", 
            content: "You are a trivia question expert. Always return valid JSON arrays with specific, famous names that have Wikipedia pages. Never return generic categories or themes. Never repeat topics from any exclusion list provided." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.95, // Higher for variety on refresh
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON array from the response
    let suggestions: string[] = [];
    try {
      // Clean up the response - remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      suggestions = JSON.parse(cleanContent);
      
      if (!Array.isArray(suggestions)) {
        suggestions = [];
      }
    } catch (parseError) {
      console.error("Failed to parse suggestions:", parseError, content);
      suggestions = [];
    }

    // Filter out any excluded topics that might still appear (case-insensitive)
    const filteredSuggestions = suggestions.filter(
      (s: string) => !excludeTopics.some(
        (e: string) => e.toLowerCase() === s.toLowerCase()
      )
    );
    
    return new Response(
      JSON.stringify({ 
        suggestions: filteredSuggestions.slice(0, 12),
        categoryType 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("Error generating suggestions:", error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate suggestions';
    return new Response(
      JSON.stringify({ error: errorMessage, suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
