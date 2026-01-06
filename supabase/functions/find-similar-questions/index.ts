import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Georgian to English transliteration map
const GEORGIAN_TO_ENGLISH: Record<string, string> = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z',
  'თ': 't', 'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o',
  'პ': 'p', 'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'f',
  'ქ': 'q', 'ღ': 'gh', 'ყ': 'y', 'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz',
  'წ': 'ts', 'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
};

// Common Georgian stop words to ignore
const GEORGIAN_STOP_WORDS = [
  'რა', 'არის', 'ეს', 'რომ', 'და', 'ან', 'თუ', 'რომელი', 'რომელია',
  'როგორ', 'როდის', 'სად', 'ვინ', 'რატომ', 'რამდენი', 'რომლის',
  'მისი', 'ჩვენი', 'თქვენი', 'მათი', 'ყველა', 'ერთი', 'ორი', 'სამი',
  'იყო', 'არ', 'ის', 'მე', 'შენ', 'ჩვენ', 'თქვენ', 'ისინი'
];

function transliterateGeorgian(text: string): string {
  let result = '';
  for (const char of text) {
    result += GEORGIAN_TO_ENGLISH[char] || char;
  }
  return result;
}

function normalizeText(text: string): string {
  // Remove punctuation and extra whitespace
  let normalized = text.toLowerCase()
    .replace(/["""''«»„"]/g, '')
    .replace(/[.,!?;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

function extractSignificantWords(text: string): string[] {
  const normalized = normalizeText(text);
  const words = normalized.split(' ').filter(w => w.length > 2);
  
  // Filter out stop words and transliterate Georgian words
  const significantWords: string[] = [];
  
  for (const word of words) {
    // Check if it's a Georgian stop word
    if (GEORGIAN_STOP_WORDS.includes(word)) continue;
    
    // Transliterate Georgian words
    const hasGeorgian = /[\u10A0-\u10FF]/.test(word);
    if (hasGeorgian) {
      const transliterated = transliterateGeorgian(word);
      if (transliterated.length >= 3) {
        significantWords.push(transliterated);
      }
    } else if (word.length >= 3) {
      significantWords.push(word);
    }
  }
  
  return significantWords;
}

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = extractSignificantWords(text1);
  const words2 = extractSignificantWords(text2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Calculate Jaccard similarity with fuzzy word matching
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  let matches = 0;
  
  for (const word1 of set1) {
    for (const word2 of set2) {
      if (word1 === word2) {
        matches++;
        break;
      }
      // Fuzzy match for similar words (prefix matching)
      if (word1.length >= 4 && word2.length >= 4) {
        const prefix1 = word1.substring(0, 4);
        const prefix2 = word2.substring(0, 4);
        if (prefix1 === prefix2) {
          matches += 0.8;
          break;
        }
      }
    }
  }
  
  const union = set1.size + set2.size - matches;
  return union > 0 ? matches / union : 0;
}

interface SimilarQuestion {
  id: string;
  question_text: string;
  correct_answer: string;
  icon_slug: string | null;
  similarity: number;
  category_id: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { questionId, questionText, threshold = 0.4, limit = 10 } = await req.json();

    console.log(`Finding similar questions for: "${questionText?.substring(0, 50)}..." with threshold ${threshold}`);

    let targetText = questionText;

    // If questionId is provided, fetch the question text
    if (questionId && !questionText) {
      const { data: question, error } = await supabase
        .from('questions')
        .select('question_text')
        .eq('id', questionId)
        .single();

      if (error || !question) {
        return new Response(
          JSON.stringify({ error: 'Question not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      targetText = question.question_text;
    }

    if (!targetText) {
      return new Response(
        JSON.stringify({ error: 'Either questionId or questionText is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all questions (paginated)
    const allQuestions: { id: string; question_text: string; correct_answer: string; icon_slug: string | null; category_id: string }[] = [];
    let offset = 0;
    const batchSize = 1000;
    
    while (true) {
      const { data: batch, error } = await supabase
        .from('questions')
        .select('id, question_text, correct_answer, icon_slug, category_id')
        .range(offset, offset + batchSize - 1);

      if (error) throw error;
      if (!batch || batch.length === 0) break;
      
      allQuestions.push(...batch);
      offset += batch.length;
      
      if (batch.length < batchSize) break;
      if (offset >= 50000) break; // Safety limit
    }

    console.log(`Comparing against ${allQuestions.length} questions`);

    // Calculate similarity for each question
    const similarQuestions: SimilarQuestion[] = [];

    for (const q of allQuestions) {
      // Skip the same question
      if (q.id === questionId) continue;
      
      const similarity = calculateSimilarity(targetText, q.question_text);
      
      if (similarity >= threshold) {
        similarQuestions.push({
          id: q.id,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          icon_slug: q.icon_slug,
          similarity,
          category_id: q.category_id
        });
      }
    }

    // Sort by similarity descending
    similarQuestions.sort((a, b) => b.similarity - a.similarity);

    // Limit results
    const limitedResults = similarQuestions.slice(0, limit);

    console.log(`Found ${limitedResults.length} similar questions`);

    return new Response(
      JSON.stringify({
        similarQuestions: limitedResults,
        totalFound: similarQuestions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
