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
  return text.toLowerCase()
    .replace(/["""''«»„"]/g, '')
    .replace(/[.,!?;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSignificantWords(text: string): string[] {
  const normalized = normalizeText(text);
  const words = normalized.split(' ').filter(w => w.length > 2);
  
  const significantWords: string[] = [];
  
  for (const word of words) {
    if (GEORGIAN_STOP_WORDS.includes(word)) continue;
    
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
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  let matches = 0;
  
  for (const word1 of set1) {
    for (const word2 of set2) {
      if (word1 === word2) {
        matches++;
        break;
      }
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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      mode = 'preview',  // 'preview' or 'apply'
      sourceQuestionId,  // Single question to propagate from
      iconSlug,          // Icon to propagate (required if sourceQuestionId)
      threshold = 0.5,   // Similarity threshold
      batchMode = false  // If true, propagate from all manually assigned icons
    } = await req.json();

    console.log(`Propagate icons - mode: ${mode}, batchMode: ${batchMode}, threshold: ${threshold}`);

    const results: {
      sourceQuestion?: string;
      targetQuestion: string;
      targetQuestionId: string;
      oldIcon: string | null;
      newIcon: string;
      similarity: number;
    }[] = [];

    // Fetch all questions
    const allQuestions: { id: string; question_text: string; icon_slug: string | null; category_id: string }[] = [];
    let offset = 0;
    const batchSize = 1000;
    
    while (true) {
      const { data: batch, error } = await supabase
        .from('questions')
        .select('id, question_text, icon_slug, category_id')
        .range(offset, offset + batchSize - 1);

      if (error) throw error;
      if (!batch || batch.length === 0) break;
      
      allQuestions.push(...batch);
      offset += batch.length;
      
      if (batch.length < batchSize) break;
      if (offset >= 50000) break;
    }

    console.log(`Loaded ${allQuestions.length} questions`);

    if (batchMode) {
      // Get all manually assigned icons from history
      const { data: manualAssignments, error: historyError } = await supabase
        .from('icon_assignment_history')
        .select('question_id, new_icon_slug, question_text')
        .eq('assignment_method', 'manual')
        .not('new_icon_slug', 'is', null);

      if (historyError) throw historyError;

      console.log(`Found ${manualAssignments?.length} manually assigned icons`);

      // Group by icon for efficiency
      const iconToQuestions = new Map<string, { id: string; text: string }[]>();
      for (const assignment of manualAssignments || []) {
        if (!assignment.new_icon_slug) continue;
        const existing = iconToQuestions.get(assignment.new_icon_slug) || [];
        existing.push({ id: assignment.question_id!, text: assignment.question_text! });
        iconToQuestions.set(assignment.new_icon_slug, existing);
      }

      // For each manually assigned icon, find similar questions without that icon
      for (const [icon, sourceQuestions] of iconToQuestions) {
        for (const sourceQ of sourceQuestions) {
          for (const targetQ of allQuestions) {
            // Skip if same question or already has this icon
            if (targetQ.id === sourceQ.id) continue;
            if (targetQ.icon_slug === icon) continue;

            const similarity = calculateSimilarity(sourceQ.text, targetQ.question_text);
            
            if (similarity >= threshold) {
              results.push({
                sourceQuestion: sourceQ.text,
                targetQuestion: targetQ.question_text,
                targetQuestionId: targetQ.id,
                oldIcon: targetQ.icon_slug,
                newIcon: icon,
                similarity
              });
            }
          }
        }
      }
    } else if (sourceQuestionId && iconSlug) {
      // Single question propagation
      const sourceQuestion = allQuestions.find(q => q.id === sourceQuestionId);
      if (!sourceQuestion) {
        return new Response(
          JSON.stringify({ error: 'Source question not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      for (const targetQ of allQuestions) {
        if (targetQ.id === sourceQuestionId) continue;
        if (targetQ.icon_slug === iconSlug) continue;

        const similarity = calculateSimilarity(sourceQuestion.question_text, targetQ.question_text);
        
        if (similarity >= threshold) {
          results.push({
            sourceQuestion: sourceQuestion.question_text,
            targetQuestion: targetQ.question_text,
            targetQuestionId: targetQ.id,
            oldIcon: targetQ.icon_slug,
            newIcon: iconSlug,
            similarity
          });
        }
      }
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    // Deduplicate - keep only the highest similarity match for each target question
    const seen = new Set<string>();
    const uniqueResults = results.filter(r => {
      if (seen.has(r.targetQuestionId)) return false;
      seen.add(r.targetQuestionId);
      return true;
    });

    console.log(`Found ${uniqueResults.length} questions to update`);

    if (mode === 'apply' && uniqueResults.length > 0) {
      // Apply the changes
      let updated = 0;
      
      for (const result of uniqueResults) {
        const { error: updateError } = await supabase
          .from('questions')
          .update({ icon_slug: result.newIcon })
          .eq('id', result.targetQuestionId);

        if (!updateError) {
          // Log the assignment
          await supabase
            .from('icon_assignment_history')
            .insert({
              question_id: result.targetQuestionId,
              question_text: result.targetQuestion,
              old_icon_slug: result.oldIcon,
              new_icon_slug: result.newIcon,
              assignment_method: 'propagation',
            });
          
          updated++;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          updated,
          total: uniqueResults.length,
          results: uniqueResults
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        mode: 'preview',
        total: uniqueResults.length,
        results: uniqueResults.slice(0, 50) // Limit preview results
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
