import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

const LANGUAGE_NAMES: Record<string, string> = {
  'ka': 'Georgian (ქართული)',
  'en': 'English',
  
  'es': 'Spanish (Español)',
  'fr': 'French (Français)',
  'pt-br': 'Portuguese (Português)',
  'it': 'Italian (Italiano)',
  'de': 'German (Deutsch)',
  'nl': 'Dutch (Nederlands)',
  'sv': 'Swedish (Svenska)',
  'nb': 'Norwegian (Norsk)',
  'da': 'Danish (Dansk)',
  'fi': 'Finnish (Suomi)',
  'pl': 'Polish (Polski)',
  'cs': 'Czech (Čeština)',
  'sk': 'Slovak (Slovenčina)',
  'hu': 'Hungarian (Magyar)',
  'ro': 'Romanian (Română)',
  'hr': 'Croatian (Hrvatski)',
  'sr-latn': 'Serbian Latin (Srpski)',
};

const QUESTION_MAX_LENGTH = 65;
const ANSWER_MAX_LENGTH = 20;
const SIMILARITY_THRESHOLD = 0.55;

// Normalize text for comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[?.!,;:'"()]/g, '')
    .replace(/\s+/g, ' ');
}

// Extract keywords from text for Jaccard similarity
function extractKeywords(text: string): Set<string> {
  const normalized = normalizeText(text);
  const numbers = text.match(/\d+/g) || [];
  const words = normalized.split(' ').filter(w => w.length > 3);
  return new Set([...numbers, ...words]);
}

// Calculate similarity between two texts (Jaccard index)
function calculateSimilarity(text1: string, text2: string): number {
  const s1 = normalizeText(text1);
  const s2 = normalizeText(text2);
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    return shorter / longer;
  }
  
  // Keyword-based similarity (Jaccard index)
  const keywords1 = extractKeywords(text1);
  const keywords2 = extractKeywords(text2);
  
  if (keywords1.size === 0 || keywords2.size === 0) return 0;
  
  const intersection = [...keywords1].filter(k => keywords2.has(k));
  const union = new Set([...keywords1, ...keywords2]);
  
  return intersection.length / union.size;
}

// Remove duplicates within a batch based on similarity
function removeDuplicatesFromBatch(questions: any[]): any[] {
  const unique: any[] = [];
  
  for (const q of questions) {
    const qText = q.questionText || '';
    const isDuplicate = unique.some(existing => 
      calculateSimilarity(qText, existing.questionText || '') > SIMILARITY_THRESHOLD
    );
    
    if (!isDuplicate) {
      unique.push(q);
    }
  }
  
  return unique;
}

// Check if a question is similar to any existing questions
function isSimilarToExisting(questionText: string, existingTexts: string[]): string | null {
  for (const existing of existingTexts) {
    if (calculateSimilarity(questionText, existing) > SIMILARITY_THRESHOLD) {
      return existing;
    }
  }
  return null;
}

// STRICT validation - returns true only if ALL limits are met
function isValidQuestion(q: any): boolean {
  const questionText = q.questionText || '';
  const correctAnswer = q.correctAnswer || '';
  const incorrectAnswers = q.incorrectAnswers || [];
  
  if (!questionText || !correctAnswer) {
    return false;
  }
  if (questionText.length > QUESTION_MAX_LENGTH) {
    console.log(`Rejecting question (${questionText.length} chars > ${QUESTION_MAX_LENGTH}): ${questionText.substring(0, 50)}...`);
    return false;
  }
  if (correctAnswer.length > ANSWER_MAX_LENGTH) {
    console.log(`Rejecting answer (${correctAnswer.length} chars > ${ANSWER_MAX_LENGTH}): ${correctAnswer}`);
    return false;
  }
  if (!Array.isArray(incorrectAnswers) || incorrectAnswers.length !== 3) {
    return false;
  }
  for (const answer of incorrectAnswers) {
    if (!answer || answer.length > ANSWER_MAX_LENGTH) {
      console.log(`Rejecting incorrect answer (${(answer || '').length} chars > ${ANSWER_MAX_LENGTH}): ${answer}`);
      return false;
    }
  }
  return true;
}
// Multi-tier icon search with guaranteed fallback
async function findIconForQuestion(
  supabase: any,
  keywords: string[],
  categoryIconSlug: string | null
): Promise<string | null> {
  const searchedSlugs = new Set<string>();
  
  // Tier 1: Exact slug match (most specific)
  for (const keyword of keywords) {
    const normalizedKw = keyword.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (normalizedKw.length >= 3 && !searchedSlugs.has(normalizedKw)) {
      searchedSlugs.add(normalizedKw);
      const { data } = await supabase
        .from('icon_library')
        .select('slug')
        .eq('slug', normalizedKw)
        .limit(1);
      if (data?.length > 0) {
        console.log(`Icon found (Tier 1 - exact slug): ${data[0].slug} for keyword: ${keyword}`);
        return data[0].slug;
      }
    }
  }
  
  // Tier 2: Title/slug contains keyword (ilike search)
  for (const keyword of keywords) {
    const kw = keyword.toLowerCase().trim();
    if (kw.length >= 4) {
      const { data } = await supabase
        .from('icon_library')
        .select('slug, title')
        .or(`slug.ilike.%${kw}%,title.ilike.%${kw}%`)
        .limit(5);
      
      if (data?.length > 0) {
        // Prefer shorter slugs (more specific icons)
        const sorted = data.sort((a: any, b: any) => a.slug.length - b.slug.length);
        console.log(`Icon found (Tier 2 - ilike): ${sorted[0].slug} for keyword: ${keyword}`);
        return sorted[0].slug;
      }
    }
  }
  
  // Tier 3: Tag array search using contains
  for (const keyword of keywords) {
    const kw = keyword.toLowerCase().trim();
    if (kw.length >= 3) {
      const { data } = await supabase
        .from('icon_library')
        .select('slug')
        .contains('tags', [kw])
        .limit(1);
      if (data?.length > 0) {
        console.log(`Icon found (Tier 3 - tags): ${data[0].slug} for keyword: ${keyword}`);
        return data[0].slug;
      }
    }
  }
  
  // Tier 4: Guaranteed fallback to category icon
  if (categoryIconSlug) {
    console.log(`Icon fallback (Tier 4 - category): ${categoryIconSlug}`);
    return categoryIconSlug;
  }
  
  console.log(`No icon found for keywords: ${keywords.join(', ')}`);
  return null;
}

// Extract visual keywords from QUESTION TEXT ONLY - never include answer to avoid spoilers
function extractVisualKeywords(text: string): string[] {
  const normalized = text.toLowerCase();
  
  // Extract meaningful words (4+ chars, not common words)
  const commonWords = new Set(['what', 'which', 'when', 'where', 'does', 'that', 'this', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'about', 'would', 'could', 'should', 'there', 'these', 'those', 'after', 'before', 'through', 'between', 'under', 'above', 'being', 'other', 'first', 'second', 'third', 'called', 'known', 'most', 'many', 'some', 'more', 'very', 'only', 'also', 'year', 'years']);
  
  const words = normalized
    .replace(/[?.!,;:'"()]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !commonWords.has(w) && !/^\d+$/.test(w));
  
  // Remove duplicates and limit
  return [...new Set(words)].slice(0, 8);
}

// Filter out keywords that could reveal any of the answers
function filterAnswerKeywords(
  keywords: string[], 
  correctAnswer: string,
  incorrectAnswers: string[]
): string[] {
  const allAnswers = [correctAnswer, ...incorrectAnswers]
    .filter(Boolean)
    .map(a => a.toLowerCase().trim());
  
  // Create set of words to exclude (answer words + translations)
  const excludeWords = new Set<string>();
  
  for (const answer of allAnswers) {
    // Add the full answer
    excludeWords.add(answer);
    
    // Add individual words from answer (3+ chars)
    answer.split(/\s+/).forEach(word => {
      if (word.length >= 3) excludeWords.add(word);
    });
  }
  
  // Common Georgian-to-English animal/object mappings that could spoil answers
  const georgianToEnglish: Record<string, string[]> = {
    // Animals
    'ლომი': ['lion', 'leo'],
    'ვეფხვი': ['tiger'],
    'დათვი': ['bear'],
    'მგელი': ['wolf'],
    'ძაღლი': ['dog', 'hound'],
    'კატა': ['cat', 'feline'],
    'ცხენი': ['horse', 'equine'],
    'სპილო': ['elephant'],
    'ზებრა': ['zebra'],
    'ჟირაფი': ['giraffe'],
    'მაიმუნი': ['monkey', 'ape'],
    'გველი': ['snake', 'serpent'],
    'არწივი': ['eagle'],
    'ბუ': ['owl'],
    'თევზი': ['fish'],
    'ზვიგენი': ['shark'],
    'დელფინი': ['dolphin'],
    'ვეშაპი': ['whale'],
    'კურდღელი': ['rabbit', 'bunny'],
    'თაგვი': ['mouse', 'rat'],
    // Planets
    'მერკური': ['mercury'],
    'ვენერა': ['venus'],
    'მარსი': ['mars'],
    'იუპიტერი': ['jupiter'],
    'სატურნი': ['saturn'],
    'ურანი': ['uranus'],
    'ნეპტუნი': ['neptune'],
    'პლუტონი': ['pluto'],
    // Elements/Nature
    'მზე': ['sun', 'solar'],
    'მთვარე': ['moon', 'lunar'],
    'ვარსკვლავი': ['star'],
    'წყალი': ['water', 'aqua'],
    'ცეცხლი': ['fire', 'flame'],
    'მიწა': ['earth', 'ground'],
    'ჰაერი': ['air', 'wind'],
    // Common objects
    'გული': ['heart'],
    'თვალი': ['eye'],
    'ხელი': ['hand'],
    'ფეხი': ['foot', 'leg'],
    'თავი': ['head'],
    // Countries
    'საქართველო': ['georgia', 'georgian'],
    'ამერიკა': ['america', 'usa'],
    'რუსეთი': ['russia', 'russian'],
    'ჩინეთი': ['china', 'chinese'],
    'იაპონია': ['japan', 'japanese'],
    'გერმანია': ['germany', 'german'],
    'საფრანგეთი': ['france', 'french'],
    'იტალია': ['italy', 'italian'],
    'ესპანეთი': ['spain', 'spanish'],
    'ინგლისი': ['england', 'english', 'britain'],
  };
  
  // Add English translations for any Georgian answers
  for (const answer of allAnswers) {
    for (const [georgian, english] of Object.entries(georgianToEnglish)) {
      if (answer.includes(georgian)) {
        english.forEach(w => excludeWords.add(w));
      }
    }
  }
  
  // Also add reverse: if answer is in English, add common variations
  for (const answer of allAnswers) {
    // Find if this English word maps to Georgian
    for (const [_, english] of Object.entries(georgianToEnglish)) {
      if (english.some(e => answer.includes(e) || e.includes(answer))) {
        english.forEach(w => excludeWords.add(w));
      }
    }
  }
  
  console.log(`Answer filter: excluding words [${[...excludeWords].slice(0, 10).join(', ')}${excludeWords.size > 10 ? '...' : ''}]`);
  
  // Filter out any keyword that matches or contains answer words
  return keywords.filter(keyword => {
    const kw = keyword.toLowerCase().trim();
    
    // Exact match
    if (excludeWords.has(kw)) {
      console.log(`  Filtered keyword "${kw}" - exact match with answer`);
      return false;
    }
    
    // Check if keyword contains or is contained by any answer word
    for (const word of excludeWords) {
      if (word.length >= 4 && kw.length >= 4) {
        if (kw.includes(word) || word.includes(kw)) {
          console.log(`  Filtered keyword "${kw}" - partial match with "${word}"`);
          return false;
        }
      }
    }
    
    return true;
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryId, categoryName, language, difficulty, count, topic, knowledgeSources } = await req.json();
    
    if (!AI_API_KEY) {
      throw new Error('AI_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch category icon for fallback
    const { data: categoryData } = await supabase
      .from('categories')
      .select('icon_slug')
      .eq('id', categoryId)
      .single();
    
    const categoryIconSlug = categoryData?.icon_slug || null;
    console.log(`Category icon fallback: ${categoryIconSlug || 'none'}`);

    // Fetch existing questions from this category for duplicate detection
    console.log(`Fetching existing questions for category ${categoryId}...`);
    const { data: existingQuestions, error: fetchError } = await supabase
      .from('questions')
      .select('question_text')
      .eq('category_id', categoryId)
      .eq('is_active', true);
    
    if (fetchError) {
      console.error('Error fetching existing questions:', fetchError);
    }
    
    const existingTexts = existingQuestions?.map(q => q.question_text) || [];
    console.log(`Found ${existingTexts.length} existing questions in category`);

    // Support up to 200 questions by chunking - request extra to compensate for validation filtering
    const requestedCount = Math.min(count || 50, 200);
    const extraForValidation = Math.ceil(requestedCount * 0.5); // Request 50% extra to account for duplicates
    const adjustedCount = requestedCount + extraForValidation;
    // Reduced chunk size to 15 to prevent API timeouts
    const chunkSize = 15;
    const chunks = Math.ceil(adjustedCount / chunkSize);

    const languageName = LANGUAGE_NAMES[language] || language;
    
    const difficultyInstruction = difficulty 
      ? `All questions should be ${difficulty} difficulty.`
      : `Mix the difficulty levels: include easy, medium, and hard questions.`;

    const topicInstruction = topic 
      ? `Focus specifically on the topic: "${topic}".`
      : '';

    // Include some existing questions in the prompt to help AI avoid them
    const existingSample = existingTexts.slice(0, 30).map(t => `- ${t}`).join('\n');
    const avoidDuplicatesInstruction = existingTexts.length > 0 
      ? `\n\n⚠️ AVOID creating questions similar to these existing ones:\n${existingSample}\n\nCreate DIFFERENT questions about NEW facts and topics.`
      : '';

    // Build knowledge sources context if provided
    let knowledgeSourcesContext = '';
    if (knowledgeSources && knowledgeSources.length > 0) {
      const sourcesText = knowledgeSources.map((source: any, i: number) => 
        `\n📖 SOURCE ${i + 1}: ${source.title || source.url}\nURL: ${source.url}\n${source.content?.substring(0, 1500) || ''}`
      ).join('\n\n');
      
      knowledgeSourcesContext = `\n\n📚 KNOWLEDGE SOURCES - Use these as factual references for generating questions:\n${sourcesText}\n\n✅ IMPORTANT: Generate questions based on FACTS from these sources. Use the information provided to create accurate, educational trivia questions.`;
      console.log(`Using ${knowledgeSources.length} knowledge sources for context`);
    }

    const systemPrompt = `You are a trivia question generator. Generate unique, accurate trivia questions.

🚨🚨🚨 STRICT CHARACTER LIMITS - QUESTIONS EXCEEDING LIMITS WILL BE REJECTED:

- Question text: MAXIMUM ${QUESTION_MAX_LENGTH} characters (including spaces and punctuation)
- Each answer option: MAXIMUM ${ANSWER_MAX_LENGTH} characters

⚠️ IMPORTANT: If you cannot phrase a question/answer within these limits, SKIP IT and create a different question instead. DO NOT try to shorten - create a different fact instead.

✅ Examples of proper length:
- Question: "რომელ წელს დაარსდა NASA?" (25 chars) - GOOD
- Answer: "1958" (4 chars) - GOOD
- Answer: "აინშტაინი" (9 chars) - GOOD

❌ Examples that will be REJECTED:
- Question over 65 chars - REJECTED
- Answer "ალბერტ აინშტაინი" (16 chars) - may be too long in some languages - use shorter form

🚫 ANSWER LENGTH PARITY - CRITICAL ANTI-CHEATING RULE:
1. ALL 4 answers MUST be similar in character length (within 5 characters of each other)
2. The correct answer must NOT be noticeably longer or shorter than incorrect answers
3. If the correct answer is detailed, make ALL incorrect answers equally detailed
4. NEVER make the correct answer stand out by length - this allows guessing

🔴 DO NOT REVEAL ANSWERS IN QUESTIONS:
- The correct answer text must NOT appear in the question
- If asking about "X", don't say "Which X..." where X is the answer

EXAMPLES:
❌ BAD: Correct: "პირველი მსოფლიო ომი" | Incorrect: "ომი", "ბრძოლა", "კონფლიქტი"
✓ GOOD: Correct: "პირველი მსოფლიო ომი" | Incorrect: "მეორე მსოფლიო ომი", "კორეის ომი 1950", "ვიეტნამის ომი"

Return a JSON object with a "questions" array. Each question should have:
- questionText: the question (max ${QUESTION_MAX_LENGTH} chars)
- correctAnswer: the correct answer (max ${ANSWER_MAX_LENGTH} chars)
- incorrectAnswers: array of 3 wrong answers (each max ${ANSWER_MAX_LENGTH} chars)
- difficulty: "easy", "medium", or "hard"
- iconKeywords: array of 2-4 CONCRETE VISUAL English words for finding an icon
  ⚠️ NEVER include the correct answer or answer-related words - this spoils the answer!
  GOOD examples: ["planet", "solar"] for "Which planet is closest to the Sun?"
  BAD examples: ["mercury"] - this reveals the answer!
  Use specific visual objects: ["pyramid", "egypt"], ["tank", "military"], ["violin", "music"]`;

    const allQuestions: any[] = [];

    // Generate in chunks for large requests
    for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
      const chunkCount = chunkIndex === chunks - 1 
        ? adjustedCount - (chunkIndex * chunkSize)
        : chunkSize;

      const userPrompt = `Generate ${chunkCount} unique trivia questions in ${languageName} about the category "${categoryName}".

${difficultyInstruction}
${topicInstruction}
${avoidDuplicatesInstruction}
${knowledgeSourcesContext}

${chunks > 1 ? `This is batch ${chunkIndex + 1} of ${chunks}, so ensure questions are unique and cover different aspects of the topic.` : ''}

CRITICAL REMINDERS:
- ALL text must be in ${languageName}
- Questions MAXIMUM ${QUESTION_MAX_LENGTH} characters - questions over this limit will be REJECTED
- Answers MAXIMUM ${ANSWER_MAX_LENGTH} characters - answers over this limit will be REJECTED
- Include exactly 1 correct answer and 3 incorrect answers
- Make questions diverse and interesting
- Avoid duplicate or very similar questions
- If you cannot fit a fact within limits, skip it and use a different fact

Return ONLY valid JSON with this structure:
{
  "questions": [
    {
      "questionText": "...",
      "correctAnswer": "...",
      "incorrectAnswers": ["...", "...", "..."],
      "difficulty": "easy|medium|hard",
      "iconKeywords": ["keyword1", "keyword2"]
    }
  ]
}`;

      console.log(`Generating chunk ${chunkIndex + 1}/${chunks}: ${chunkCount} questions in ${language} for category ${categoryName}`);

      const response = await fetch(AI_CHAT_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiModel('google/gemini-2.5-flash'),
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        // For other errors, log and continue with next chunk instead of failing completely
        console.error(`Chunk ${chunkIndex + 1} failed with status ${response.status}, skipping...`);
        continue;
      }

      // Safely parse the response with error handling
      let aiData;
      try {
        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          console.error(`Chunk ${chunkIndex + 1} returned empty response, skipping...`);
          continue;
        }
        aiData = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`Chunk ${chunkIndex + 1} JSON parse error:`, parseError);
        continue;
      }
      const content = aiData.choices?.[0]?.message?.content;
      
      if (!content) {
        console.error('No content in AI response:', JSON.stringify(aiData).substring(0, 500));
        throw new Error('No content in AI response');
      }

      let parsedContent;
      try {
        // First attempt: direct parse
        parsedContent = JSON.parse(content);
      } catch (e) {
        // Second attempt: try to extract valid JSON from potentially truncated response
        console.log('Direct parse failed, attempting JSON extraction...');
        try {
          // Find the questions array and try to salvage what we can
          const questionsMatch = content.match(/"questions"\s*:\s*\[/);
          if (questionsMatch) {
            // Find all complete question objects
            const questionRegex = /\{\s*"questionText"\s*:\s*"[^"]*"\s*,\s*"correctAnswer"\s*:\s*"[^"]*"\s*,\s*"incorrectAnswers"\s*:\s*\[\s*"[^"]*"\s*,\s*"[^"]*"\s*,\s*"[^"]*"\s*\]\s*,\s*"difficulty"\s*:\s*"[^"]*"\s*,\s*"iconKeywords"\s*:\s*\[[^\]]*\]\s*\}/g;
            const matches = content.match(questionRegex);
            if (matches && matches.length > 0) {
              parsedContent = { questions: matches.map((m: string) => JSON.parse(m)) };
              console.log(`Salvaged ${matches.length} questions from truncated response`);
            } else {
              throw new Error('Could not extract questions');
            }
          } else {
            throw new Error('No questions array found');
          }
        } catch (extractError) {
          console.error('Failed to parse AI response (first 2000 chars):', content.substring(0, 2000));
          console.error('Extraction error:', extractError);
          // Don't throw - just continue with empty for this chunk
          parsedContent = { questions: [] };
          console.log('Chunk failed to parse, continuing with empty batch');
        }
      }

      const questions = parsedContent.questions || [];
      allQuestions.push(...questions);
      console.log(`Chunk ${chunkIndex + 1} generated ${questions.length} questions (total: ${allQuestions.length})`);
    }

    console.log(`Generated ${allQuestions.length} total questions`);

    // STRICT validation: Filter out questions that exceed character limits
    const validQuestions = allQuestions.filter(isValidQuestion);
    console.log(`Validation: ${allQuestions.length} generated, ${validQuestions.length} passed strict limits`);

    // Deduplicate within the generated batch
    const batchDeduped = removeDuplicatesFromBatch(validQuestions);
    console.log(`Batch deduplication: ${validQuestions.length} -> ${batchDeduped.length}`);

    // Filter out questions similar to existing ones in database
    const uniqueQuestions = batchDeduped.filter(q => {
      const similarTo = isSimilarToExisting(q.questionText, existingTexts);
      if (similarTo) {
        console.log(`Filtered DB duplicate: "${q.questionText.substring(0, 40)}..." similar to "${similarTo.substring(0, 40)}..."`);
        return false;
      }
      return true;
    });
    console.log(`DB deduplication: ${batchDeduped.length} -> ${uniqueQuestions.length}`);

    // Take only the requested number of unique questions
    const trimmedQuestions = uniqueQuestions.slice(0, requestedCount);

    // Georgian Grammar Verification (BATCHED for performance - only for Georgian language)
    if (language === 'ka' && trimmedQuestions.length > 0) {
      console.log(`Verifying Georgian grammar (batched for ${trimmedQuestions.length} questions)...`);
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      try {
        // Collect ALL texts from all questions into one batch with position tracking
        const allTexts: { questionIndex: number; textIndex: number; text: string }[] = [];
        trimmedQuestions.forEach((q: any, qIdx: number) => {
          allTexts.push({ questionIndex: qIdx, textIndex: 0, text: q.questionText || '' });
          allTexts.push({ questionIndex: qIdx, textIndex: 1, text: q.correctAnswer || '' });
          (q.incorrectAnswers || []).forEach((ans: string, aIdx: number) => {
            allTexts.push({ questionIndex: qIdx, textIndex: 2 + aIdx, text: ans || '' });
          });
        });

        const grammarResponse = await fetch(`${supabaseUrl}/functions/v1/verify-georgian-grammar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ texts: allTexts.map(t => t.text) }),
        });

        if (grammarResponse.ok) {
          const grammarResult = await grammarResponse.json();
          let fixesApplied = 0;
          
          // Apply corrections back to questions using position tracking
          if (grammarResult.results && grammarResult.results.length > 0) {
            allTexts.forEach((item, resultIdx) => {
              const correction = grammarResult.results[resultIdx]?.corrected;
              if (correction && correction !== item.text) {
                const q = trimmedQuestions[item.questionIndex];
                if (item.textIndex === 0) {
                  q.questionText = correction;
                  fixesApplied++;
                } else if (item.textIndex === 1) {
                  q.correctAnswer = correction;
                  fixesApplied++;
                } else {
                  const answerIndex = item.textIndex - 2;
                  if (q.incorrectAnswers && q.incorrectAnswers[answerIndex]) {
                    q.incorrectAnswers[answerIndex] = correction;
                    fixesApplied++;
                  }
                }
              }
            });
          }
          console.log(`Grammar verification complete: ${grammarResult.totalErrors || 0} errors found, ${fixesApplied} fixes applied`);
        } else {
          console.error("Grammar verification failed with status:", grammarResponse.status);
        }
      } catch (grammarError) {
        console.error("Grammar batch verification failed (non-blocking):", grammarError);
      }
    }

    // Find icons for each question using multi-tier search with category fallback
    // Process in batches of 10 to avoid overwhelming the database
    console.log(`Finding icons for ${trimmedQuestions.length} questions...`);
    let iconsFound = 0;
    let iconsFallback = 0;
    
    const ICON_BATCH_SIZE = 10;
    const questionsWithIcons: any[] = [];
    
    for (let i = 0; i < trimmedQuestions.length; i += ICON_BATCH_SIZE) {
      const batch = trimmedQuestions.slice(i, i + ICON_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (q: any) => {
          // Combine AI-generated keywords with extracted text keywords (question only, never answer!)
          const aiKeywords = (q.iconKeywords || []).map((k: string) => k.toLowerCase().trim());
          const textKeywords = extractVisualKeywords(q.questionText || '');
          
          // Combine all keywords
          let combinedKeywords = [...new Set([...aiKeywords, ...textKeywords])];
          
          // 🚨 CRITICAL: Filter out any keywords that could reveal the answer!
          const safeKeywords = filterAnswerKeywords(
            combinedKeywords,
            q.correctAnswer || '',
            q.incorrectAnswers || []
          );
          
          const iconSlug = await findIconForQuestion(supabase, safeKeywords, categoryIconSlug);
          
          if (iconSlug) {
            q.iconSlug = iconSlug;
            iconsFound++;
            if (iconSlug === categoryIconSlug) {
              iconsFallback++;
            }
          }
          
          delete q.iconKeywords;
          return q;
        })
      );
      questionsWithIcons.push(...batchResults);
    }
    
    console.log(`Icon assignment complete: ${iconsFound}/${trimmedQuestions.length} icons found (${iconsFallback} used category fallback)`);

    return new Response(JSON.stringify({ questions: questionsWithIcons }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-multilang-trivia:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
