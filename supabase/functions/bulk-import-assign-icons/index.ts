import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Topic to icon mappings — same as batch-assign-icons
const TOPIC_TO_ICONS: Record<string, string[]> = {
  egypt: ['pharaoh-death-mask', 'pyramid', 'egyptian-scarab', 'egyptian-mummy', 'nefertiti', 'sphinx'],
  pharaoh: ['pharaoh-death-mask', 'pyramid', 'egyptian-mummy', 'nefertiti'],
  rome: ['roman-gladiator-helmet', 'roman-laurel-wreath', 'colosseum', 'roman-toga'],
  roman: ['roman-gladiator-helmet', 'roman-laurel-wreath', 'colosseum'],
  greece: ['greek-amphitheater', 'greek-amphora', 'parthenon', 'greek-lyra'],
  greek: ['greek-amphitheater', 'greek-amphora', 'parthenon'],
  china: ['great-wall-of-china', 'chinese-dragon', 'pagoda', 'forbidden-city'],
  chinese: ['great-wall-of-china', 'chinese-dragon', 'pagoda'],
  viking: ['viking-shield', 'viking-long-boat', 'viking-helmet'],
  medieval: ['castle', 'sword', 'knight', 'shield'],
  war: ['world-war-ii-sherman-tank', 'world-war-ii-spitfire-fighter', 'pineapple-hand-grenade', 'helmet'],
  battle: ['sword', 'shield', 'helmet', 'cannon'],
  military: ['tank', 'rifle', 'helmet', 'medal'],
  planet: ['saturn', 'jupiter', 'mars', 'earth', 'neptune'],
  star: ['star', 'north-star', 'shooting-star'],
  space: ['rocket', 'satellite', 'astronaut', 'space-shuttle'],
  astronomy: ['telescope', 'astronaut', 'satellite'],
  biology: ['dna', 'microscope', 'cell', 'virus', 'bacteria'],
  dna: ['dna', 'gene-sequencer', 'microscope'],
  animal: ['paw-print', 'dog', 'cat', 'lion', 'elephant'],
  ocean: ['whale', 'dolphin', 'fish', 'coral', 'octopus'],
  music: ['guitar', 'piano', 'drums', 'violin', 'music-note'],
  sport: ['soccer-ball', 'basketball', 'tennis', 'football', 'baseball'],
  football: ['basic-soccer-ball', 'soccer-ball', 'football-player'],
  basketball: ['basketball', 'basketball-player', 'basketball-hoop'],
  tennis: ['tennis', 'tennis-racket', 'tennis-ball'],
  movie: ['movie-clapperboard', 'film-reel', 'camera', 'popcorn'],
  art: ['palette', 'paint-brush', 'canvas', 'sculpture'],
  food: ['pizza', 'burger', 'sushi', 'cake', 'cooking'],
  chemistry: ['atom', 'flask', 'test-tube', 'molecule', 'periodic-table'],
  physics: ['physics', 'magnet', 'laser', 'atom', 'pendulum'],
  math: ['calculator', 'math', 'pi', 'geometry', 'abacus'],
  computer: ['desktop-computer-monitor', 'laptop', 'keyboard', 'mouse', 'code'],
  programming: ['app-developer', 'code', 'terminal', 'database'],
  geography: ['globe-earth-centered-on-asia', 'map', 'compass', 'mountain'],
  mountain: ['mountain', 'volcano', 'hiking'],
  city: ['cityscape', 'building', 'skyscraper', 'tower'],
  church: ['church', 'cathedral', 'cross', 'bible'],
  religion: ['church', 'mosque', 'temple', 'prayer'],
  mythology: ['zeus', 'poseidon', 'athena', 'mythology'],
  book: ['book', 'library', 'literature-class', 'scroll'],
  literature: ['literature-class', 'book', 'scroll', 'quill'],
  history: ['scroll', 'ancient', 'ruins', 'artifact'],
  fashion: ['fashion-designer', 'dress', 'hat', 'shoes'],
  psychology: ['psychology', 'brain', 'mind', 'therapy'],
  philosophy: ['philosophy', 'thinker', 'book', 'scroll'],
  politics: ['parliament-building', 'vote', 'flag', 'gavel'],
  economy: ['economics-icon', 'chart', 'money', 'bank'],
  technology: ['desktop-computer-monitor', 'robot', 'circuit', 'chip'],
  robot: ['robot-building', 'robot', 'android', 'ai'],
  game: ['game-controller', 'joystick', 'arcade', 'dice'],
  tv: ['television', 'remote', 'screen', 'antenna'],
  social: ['social-media-app', 'chat', 'network', 'share'],
  meme: ['retro-web-browser-interface', 'emoji', 'viral', 'internet'],
  celebrity: ['pop-star', 'celebrity', 'fame', 'award'],
  ecology: ['ecology', 'leaf', 'tree', 'recycle', 'earth'],
  geology: ['earth', 'rock', 'crystal', 'fossil', 'volcano'],
  medicine: ['stethoscope', 'bone-density-scanner', 'pill', 'hospital'],
  anatomy: ['skeleton', 'heart', 'brain', 'lungs'],
  pyramid: ['pyramid', 'pharaoh-death-mask', 'egyptian-scarab'],
  wine: ['grape', 'wine-glass', 'barrel'],
  georgia: ['grape', 'khachapuri', 'church', 'mountain'],
  khachapuri: ['khachapuri', 'cheese', 'bread'],
  anime: ['anime', 'manga', 'ninja', 'samurai'],
};

// Category slug to default icon
const CATEGORY_DEFAULT_ICONS: Record<string, string> = {
  anime_manga: 'anime',
  archaeology: 'archeo',
  architecture: 'architect',
  astronomy: 'astronaut',
  biology: 'biology-class',
  nature: 'archipelago',
  geography: 'globe-earth-centered-on-asia',
  geology: 'earth',
  ecology: 'ecology',
  economics: 'economics-icon',
  languages: 'cartoon-speech-bubble-sign',
  video_games: 'game-controller',
  movies: 'movie-clapperboard',
  space: 'rocket',
  math: 'math',
  medicine: 'bone-density-scanner',
  memes_internet: 'retro-web-browser-interface',
  science: 'gene-sequencer',
  myths_reality: 'statue-of-zeus-at-olympia',
  fashion: 'fashion-designer',
  world_history: 'world-map',
  world_cuisine: 'pan-roasted-hpuku-with-pua-risotto',
  music: 'music-concert',
  politics: 'parliament-building',
  pop_culture: 'rock-music',
  programming: 'app-developer',
  religion_mythology: 'church',
  robotics_ai: 'robot-building',
  military_history: 'sword',
  georgian_history: 'book-stand',
  fun_facts: 'trivia-quiz',
  tv_series: 'television',
  social_media: 'social-media-app',
  sports: 'basic-soccer-ball',
  technology: 'desktop-computer-monitor',
  physics: 'physics',
  philosophy: 'philosophy',
  psychology: 'psychology',
  georgian_culture: 'grape',
  georgian_literature: 'literature-class',
  georgian_cuisine: 'khachapuri',
  chemistry: 'atom',
  celebrities: 'pop-star',
  animals: 'aardwolf',
  art: 'art-conservator',
};

function extractKeywords(text: string): string[] {
  // Extract meaningful English keywords from question text
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3);
  return [...new Set(words)];
}

function findIconForQuestion(
  questionText: string,
  correctAnswer: string,
  categorySlug: string,
  iconKeyword?: string,
): string | null {
  const normalizedAnswer = correctAnswer.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Collect candidate keywords
  const keywords: string[] = [];
  if (iconKeyword) keywords.push(iconKeyword.toLowerCase());
  keywords.push(...extractKeywords(questionText));
  keywords.push(categorySlug.replace(/_/g, ' '));

  // Try topic mappings
  for (const keyword of keywords) {
    const normalizedKw = keyword.replace(/[^a-z0-9]/g, '');
    const topicIcons = TOPIC_TO_ICONS[normalizedKw];
    if (topicIcons) {
      // Filter out icons that match the answer
      const safe = topicIcons.filter(slug => !slug.includes(normalizedAnswer) && !normalizedAnswer.includes(slug));
      if (safe.length > 0) {
        return safe[Math.floor(Math.random() * safe.length)];
      }
    }
  }

  // Fallback to category default
  return CATEGORY_DEFAULT_ICONS[categorySlug] || null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions } = await req.json();
    if (!Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({ error: 'No questions provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const assignments: { idx: number; slug: string }[] = [];

    for (const q of questions) {
      const slug = findIconForQuestion(
        q.question_text || '',
        q.correct_answer || '',
        q.category_name || '',
        q.icon_keyword,
      );
      if (slug) {
        assignments.push({ idx: q.question_index, slug });
      }
    }

    return new Response(JSON.stringify({ assignments, total: questions.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('bulk-import-assign-icons error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
