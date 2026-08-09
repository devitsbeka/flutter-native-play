import { CHARACTER_RENDER_STYLE } from "./characterStyle";

// The round public avatar: a square bust portrait of the SAME character the
// homepage scene shows, generated from the scene itself. It shares
// CHARACTER_RENDER_STYLE with the scene prompt so the two can never drift
// into different art styles.
//
// The edge function carries its own copy as a fallback; this one is sent with
// the request so prompt edits ship with the frontend.
export const PORTRAIT_AVATAR_PROMPT = `Create a square stylized 3D character portrait using the supplied image as the identity reference. The reference shows the character in their scene — reproduce that same character's face, hair and outfit exactly, framed as a portrait.

FRAMING
Head and shoulders, centered, facing the viewer with a warm, natural, closed-lip smile. The head fills a comfortable portion of the frame with a little headroom — a normal portrait crop, never an extreme close-up.

${CHARACTER_RENDER_STYLE}

CONSISTENCY WITH THE SCENE — CRITICAL
This portrait and the reference scene must read as the same character rendered by the same artist in the same production. Match the reference's face, skin tone, hairstyle and hair color, any headwear, and the level of realism exactly. Do not make the portrait more cartoonish, smoother, younger or more idealized than the reference, and do not make it more photographic. If the reference wears a hat or beret, keep it.

WARDROBE
The character wears their purple hoodie with the small gold crown accent, as in the reference.

BACKGROUND
Soft pastel lavender radial background (#E9CCFF) with a gentle vignette, nothing else in frame.

No text, no UI, no logos, no frame, no watermark, no border.`;
