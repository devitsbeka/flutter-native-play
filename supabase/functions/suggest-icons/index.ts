import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Georgian to English transliteration map
const GEORGIAN_TO_ENGLISH: Record<string, string> = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e',
  'ვ': 'v', 'ზ': 'z', 'თ': 't', 'ი': 'i', 'კ': 'k',
  'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': 'p',
  'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u',
  'ფ': 'f', 'ქ': 'k', 'ღ': 'gh', 'ყ': 'q', 'შ': 'sh',
  'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'ts', 'ჭ': 'ch',
  'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
};

// Common Georgian words to ignore (stop words)
const GEORGIAN_STOP_WORDS = [
  'რა', 'არის', 'ეს', 'რომ', 'და', 'ან', 'თუ', 'რომელი', 'რომელია',
  'როგორ', 'როდის', 'სად', 'ვინ', 'რატომ', 'რამდენი', 'რომლის',
  'მისი', 'ჩვენი', 'თქვენი', 'მათი', 'ყველა', 'ერთი', 'ორი', 'სამი'
];

function transliterateGeorgian(text: string): string {
  let result = '';
  for (const char of text) {
    result += GEORGIAN_TO_ENGLISH[char] || char;
  }
  return result;
}

function extractGeorgianWords(text: string): string[] {
  // Match Georgian word sequences
  const georgianPattern = /[\u10A0-\u10FF]+/g;
  const matches = text.match(georgianPattern) || [];
  return matches.filter(word => 
    word.length >= 3 && 
    !GEORGIAN_STOP_WORDS.includes(word.toLowerCase())
  );
}

function extractEnglishWords(text: string): string[] {
  // Match English word sequences (4+ chars)
  const englishPattern = /[a-zA-Z]{4,}/g;
  const matches = text.match(englishPattern) || [];
  return matches.map(w => w.toLowerCase());
}

function extractQuotedText(text: string): string[] {
  // Match text in quotes (both types)
  const quotePattern = /["""''](.*?)["""'']/g;
  const results: string[] = [];
  let match;
  while ((match = quotePattern.exec(text)) !== null) {
    if (match[1] && match[1].length >= 2) {
      results.push(match[1]);
    }
  }
  return results;
}

interface KeywordSource {
  keyword: string;
  transliterated: string;
  source: 'question_georgian' | 'question_english' | 'answer_georgian' | 'answer_english' | 'quoted';
}

interface IconSuggestion {
  slug: string;
  title: string;
  icon_url: string | null;
  score: number;
  matchReason: string;
  matchedKeyword: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question_text, correct_answer, question_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let questionText = question_text;
    let correctAnswer = correct_answer;

    // If question_id provided, fetch the question
    if (question_id && !questionText) {
      const { data: question } = await supabase
        .from('questions')
        .select('question_text, correct_answer')
        .eq('id', question_id)
        .single();
      
      if (question) {
        questionText = question.question_text;
        correctAnswer = question.correct_answer;
      }
    }

    if (!questionText) {
      return new Response(
        JSON.stringify({ error: 'No question text provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing question:', questionText);
    console.log('Correct answer:', correctAnswer);

    // Extract keywords from all sources
    const keywordSources: KeywordSource[] = [];

    // 1. Georgian words from question
    const georgianFromQuestion = extractGeorgianWords(questionText);
    for (const word of georgianFromQuestion) {
      const transliterated = transliterateGeorgian(word);
      keywordSources.push({
        keyword: word,
        transliterated,
        source: 'question_georgian'
      });
    }

    // 2. English words from question
    const englishFromQuestion = extractEnglishWords(questionText);
    for (const word of englishFromQuestion) {
      keywordSources.push({
        keyword: word,
        transliterated: word.toLowerCase(),
        source: 'question_english'
      });
    }

    // 3. Quoted text from question
    const quotedFromQuestion = extractQuotedText(questionText);
    for (const text of quotedFromQuestion) {
      const transliterated = transliterateGeorgian(text).toLowerCase();
      keywordSources.push({
        keyword: text,
        transliterated,
        source: 'quoted'
      });
    }

    // 4. Georgian words from answer
    if (correctAnswer) {
      const georgianFromAnswer = extractGeorgianWords(correctAnswer);
      for (const word of georgianFromAnswer) {
        const transliterated = transliterateGeorgian(word);
        keywordSources.push({
          keyword: word,
          transliterated,
          source: 'answer_georgian'
        });
      }

      // 5. English words from answer
      const englishFromAnswer = extractEnglishWords(correctAnswer);
      for (const word of englishFromAnswer) {
        keywordSources.push({
          keyword: word,
          transliterated: word.toLowerCase(),
          source: 'answer_english'
        });
      }
    }

    console.log('Extracted keywords:', keywordSources);

    // Get unique transliterated keywords
    const uniqueKeywords = [...new Set(keywordSources.map(k => k.transliterated))];
    
    // Fetch all icons for matching
    const { data: allIcons, error: iconsError } = await supabase
      .from('icon_library')
      .select('slug, title, tags, icon_url')
      .limit(10000);

    if (iconsError) {
      console.error('Error fetching icons:', iconsError);
      throw iconsError;
    }

    console.log(`Loaded ${allIcons?.length} icons for matching`);

    // Score each icon against keywords
    const suggestions: IconSuggestion[] = [];
    const seenSlugs = new Set<string>();

    for (const keyword of uniqueKeywords) {
      if (keyword.length < 3) continue;

      for (const icon of allIcons || []) {
        if (seenSlugs.has(icon.slug)) continue;

        let score = 0;
        let matchReason = '';

        const slugLower = icon.slug.toLowerCase();
        const titleLower = icon.title.toLowerCase();
        const tags = (icon.tags || []).map((t: string) => t.toLowerCase());

        // Exact slug match (highest priority)
        if (slugLower === keyword) {
          score = 100;
          matchReason = `Exact slug match: "${keyword}"`;
        }
        // Slug contains keyword
        else if (slugLower.includes(keyword) && keyword.length >= 4) {
          score = 85;
          matchReason = `Slug contains: "${keyword}"`;
        }
        // Keyword contains slug (e.g., "fondue" in "fondiu")
        else if (keyword.includes(slugLower) && slugLower.length >= 4) {
          score = 80;
          matchReason = `Keyword contains slug: "${slugLower}"`;
        }
        // Title exact match
        else if (titleLower === keyword) {
          score = 90;
          matchReason = `Exact title match: "${keyword}"`;
        }
        // Title contains keyword
        else if (titleLower.includes(keyword) && keyword.length >= 4) {
          score = 75;
          matchReason = `Title contains: "${keyword}"`;
        }
        // Tag exact match
        else if (tags.includes(keyword)) {
          score = 70;
          matchReason = `Tag match: "${keyword}"`;
        }
        // Tag partial match
        else if (tags.some((tag: string) => tag.includes(keyword) || keyword.includes(tag))) {
          score = 50;
          matchReason = `Partial tag match: "${keyword}"`;
        }
        // Fuzzy matching for transliteration variations
        else if (keyword.length >= 4) {
          // Check if first 4+ chars match (handles transliteration variations)
          const keywordPrefix = keyword.substring(0, Math.min(5, keyword.length));
          if (slugLower.startsWith(keywordPrefix) || keywordPrefix.startsWith(slugLower.substring(0, 4))) {
            score = 60;
            matchReason = `Prefix match: "${keywordPrefix}"`;
          }
        }

        if (score > 0) {
          seenSlugs.add(icon.slug);
          suggestions.push({
            slug: icon.slug,
            title: icon.title,
            icon_url: icon.icon_url,
            score,
            matchReason,
            matchedKeyword: keyword
          });
        }
      }
    }

    // Sort by score descending
    suggestions.sort((a, b) => b.score - a.score);

    // Take top 10 suggestions
    const topSuggestions = suggestions.slice(0, 10);

    console.log('Top suggestions:', topSuggestions.map(s => `${s.slug} (${s.score})`));

    return new Response(
      JSON.stringify({
        keywords: keywordSources,
        suggestions: topSuggestions,
        totalMatches: suggestions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-icons:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
