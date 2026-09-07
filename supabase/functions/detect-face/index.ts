import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

/**
 * The safety screen for a photo about to become a public profile picture.
 *
 * This function used to ask Gemini one question — "Does this image contain a
 * human face?" — and that was the ONLY thing standing between an arbitrary
 * camera-roll photo and the avatar every other player sees, in a bucket that
 * is public by design. A face detector is not a content check: pornography
 * with a face in it answered YES.
 *
 * It now asks both questions in one call and returns both answers. `hasFace`
 * keeps its old meaning and its old side effect (writing
 * `profiles.has_face_photo`) so the backfill on the home screen is unchanged;
 * `isAppropriate` is the new verdict the avatar picker blocks on.
 *
 * WHY THIS FAILS CLOSED AND `validate-cover-image` DOES NOT.
 * `validate-cover-image` returns `isAppropriate: true` whenever the model
 * call errors, times out or comes back unparseable — deliberately, so a
 * provider hiccup does not stop people uploading quiz covers. That trade is
 * defensible there and wrong here. A quiz cover is attached to one quiz the
 * author can delete; an avatar rides along beside its owner in every lobby,
 * leaderboard, friend list and push notification in the app, and it is the
 * single image a reviewer is most likely to see. So when the check cannot be
 * RUN, this function says so — `isAppropriate: false` with
 * `checkFailed: true` — and the caller refuses the photo rather than
 * publishing an image nothing looked at. `checkFailed` exists so the client
 * can tell "we looked and it is not allowed" from "we could not look", and
 * apologise for the outage instead of accusing the player.
 */

interface Verdict {
  hasFace: boolean;
  isAppropriate: boolean;
  /** True when the verdict is a refusal-by-default, not a real judgement. */
  checkFailed: boolean;
  reason?: string;
}

const PROMPT = `You are screening a photo a user wants to use as their PUBLIC profile picture in a trivia game played by ages 12 and up.

Answer two separate questions about the image.

1. faceValue: does the image contain a human face?

2. appropriate: is this image acceptable as a public profile picture?
   Answer false for ANY of:
   - nudity, partial nudity, underwear/lingerie, or sexually suggestive posing
   - sexual acts or sexualised depiction of a minor of any kind
   - graphic violence, injury, gore, or a corpse
   - hate symbols, extremist insignia, or a slur written in the image
   - illegal drug use or drug paraphernalia
   - self-harm, suicide imagery, or promotion of either
   - harassment of an identifiable person, or content clearly meant to demean one
   - obscene or abusive text written in the image, in any language
   A harmless photo of anything at all — a person, a pet, a car, a cartoon, a
   landscape, a blank wall — is appropriate: true. Being a poor or boring
   avatar is not a reason to answer false.

Respond with a JSON object only, no other text:
{"faceValue": true/false, "appropriate": true/false, "reason": "a few words"}`;

serve(async (req) => {
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);
  const json = (body: Verdict | { error: string }, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Every exit below this point that is not a real verdict is a REFUSAL, not
  // a shrug: the caller is about to publish this image.
  const refuse = (reason: string): Response =>
    json({ hasFace: false, isAppropriate: false, checkFailed: true, reason });

  try {
    const { imageUrl, userId } = await req.json();
    if (!imageUrl || !userId) {
      return new Response(JSON.stringify({ error: "imageUrl and userId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!AI_API_KEY) {
      console.error("detect-face: AI_API_KEY not configured");
      return refuse("checker unavailable");
    }

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Not the -lite model any more. This call decides whether a picture
        // is publishable, which is a harder judgement than "is there a face".
        model: aiModel("google/gemini-2.5-flash"),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return refuse("checker unavailable");
    }

    const data = await response.json();
    const answer: string = data.choices?.[0]?.message?.content ?? "";

    let parsed: { faceValue?: unknown; appropriate?: unknown; reason?: unknown } | null = null;
    try {
      const match = answer.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (parseError) {
      console.error("detect-face: unparseable model answer", parseError, answer);
    }

    // An answer we cannot read is an answer we did not get. Same refusal.
    if (!parsed || typeof parsed.appropriate !== "boolean") {
      console.error("detect-face: no usable verdict in model answer:", answer);
      return refuse("checker unavailable");
    }

    const verdict: Verdict = {
      hasFace: parsed.faceValue === true,
      isAppropriate: parsed.appropriate,
      checkFailed: false,
      reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
    };

    // The has_face_photo write is unchanged, and still happens on the
    // face question alone — it drives the "animate my avatar" affordance,
    // not moderation. A photo that failed the safety check never becomes an
    // avatar, so the flag it leaves behind describes a photo nobody wears.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from("profiles")
      .update({ has_face_photo: verdict.hasFace })
      .eq("user_id", userId);

    return json(verdict);
  } catch (error) {
    console.error("detect-face error:", error);
    return refuse("checker unavailable");
  }
});
