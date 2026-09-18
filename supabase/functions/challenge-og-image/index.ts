import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * The card's own words, in the challenger's language.
 *
 * They were Georgian for everybody, which is what an English player's friends
 * saw when the link was pasted into a chat. Whose language it should be is not
 * obvious — a share card has no viewer to ask — so it is the person who made
 * it: they chose to send it, their friends most likely read what they read,
 * and it is the only language this function can actually know.
 *
 * English is the fallback, as everywhere else in the app.
 */
const CARD_COPY: Record<string, { challenge: string; cta: string }> = {
  ka: { challenge: "🎯 შეგიძლია დამამარცხო?", cta: "ითამაშე ახლავე!" },
  en: { challenge: "🎯 Can you beat me?", cta: "Play now!" },
  es: { challenge: "🎯 ¿Puedes ganarme?", cta: "¡Juega ahora!" },
  fr: { challenge: "🎯 Peux-tu me battre ?", cta: "Joue maintenant !" },
  de: { challenge: "🎯 Schaffst du mehr?", cta: "Jetzt spielen!" },
  it: { challenge: "🎯 Riesci a battermi?", cta: "Gioca ora!" },
  pt: { challenge: "🎯 Consegue me vencer?", cta: "Jogue agora!" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return new Response("Missing code parameter", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: challenge, error } = await supabase
      .from("challenge_links")
      .select("challenger_id, challenger_nickname, challenger_score, total_questions, category_name")
      .eq("code", code)
      .single();

    if (error || !challenge) {
      return new Response("Challenge not found", { status: 404, headers: corsHeaders });
    }

    const { challenger_id, challenger_nickname, challenger_score, total_questions, category_name } = challenge;

    // Best effort: a card in the wrong language is better than no card, so a
    // failed or empty read falls through to English rather than 500ing.
    const { data: challenger } = await supabase
      .from("profiles")
      .select("preferred_language")
      .eq("user_id", challenger_id)
      .maybeSingle();
    const copy = CARD_COPY[challenger?.preferred_language ?? "en"] ?? CARD_COPY.en;

    const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7C5CFC;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#5B3FD9;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" rx="0"/>
  
  <!-- Title -->
  <text x="600" y="160" text-anchor="middle" fill="white" font-size="48" font-weight="bold" font-family="Arial, sans-serif">
    ${escapeXml(copy.challenge)}
  </text>
  
  <!-- Challenger name -->
  <text x="600" y="250" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="36" font-family="Arial, sans-serif">
    ${escapeXml(challenger_nickname)}
  </text>
  
  <!-- Score -->
  <text x="600" y="370" text-anchor="middle" fill="white" font-size="96" font-weight="bold" font-family="Arial, sans-serif">
    ${challenger_score}/${total_questions}
  </text>
  
  <!-- Category -->
  ${category_name ? `<text x="600" y="450" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="30" font-family="Arial, sans-serif">${escapeXml(category_name)}</text>` : ""}
  
  <!-- CTA -->
  <rect x="350" y="490" width="500" height="70" rx="35" fill="white"/>
  <text x="600" y="535" text-anchor="middle" fill="#7C5CFC" font-size="28" font-weight="bold" font-family="Arial, sans-serif">
    ${escapeXml(copy.cta)}
  </text>
</svg>`;

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("OG image error:", err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
