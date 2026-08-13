// The system prompt used when a user uploads their photo: instead of a plain
// portrait, the generator produces a personalized 16:9 hero scene for the
// homepage. The generate-avatar edge function reads its prompt from the
// ai_generation_settings table (setting_type 'avatar_static'); the
// AdminAIPromptSync component keeps that row in sync with this file, so
// editing this file is the way to change the prompt.
import { CHARACTER_RENDER_STYLE } from "./characterStyle";

// Image model for scene generation, resolved by the AI gateway. Nano Banana
// Pro (Gemini 3 Pro Image) is Google's top image model — strong identity
// preservation from reference photos, 2K output — and being a Google model it
// resolves on every provider branch, unlike OpenRouter-only ids ("openai/
// gpt-image-2" made generate-avatar 500 on the prod gateway). When FAL_KEY is
// configured the function generates on GPT Image 2 via fal.ai instead.
export const SCENE_AVATAR_MODEL = "google/gemini-3-pro-image-preview";

// The scene is a FIXED branded set — every player gets the same cozy corner,
// same props, same camera; only the character's appearance adapts to their
// reference photo. Keep this stable so all player homepages feel like one
// consistent world.
export const SCENE_AVATAR_PROMPT = `Create the MyTrivia hero scene: a premium stylized 3D character scene for a trivia game homepage, using the uploaded portrait ONLY as the identity reference for the character's appearance.

THE SCENE IS FIXED — REPRODUCE IT EXACTLY
This is a standardized branded set. Every generation must reproduce the SAME environment, props, palette, lighting and camera. The ONLY thing that changes between generations is the character's physical appearance (face, hairstyle, hair color, skin tone, facial hair, gender presentation, body build) taken from the reference photo.

THE SET
A soft, light, airy pastel world:
- A large plump light-purple bean bag chair sitting on a round flat lavender platform rug, centered in the frame.
- To the left of the bean bag: a small pink three-legged wooden stool with a terracotta pot holding a small green plant.
- Purple hardcover books stacked casually on the platform beside the bean bag, one with a tiny gold crown on the cover.
- To the right on the platform: a glowing purple cube with a bright question-mark symbol on its faces, and a shiny purple trophy on a small base.
- Background: a very pale lavender-pink void (#F6E8FF style) with large, soft, out-of-focus 3D blobs floating gently — mint green and light purple rounded blob shapes, the MyTrivia brand blobs — plus a few tiny soft sparkle particles.
- Ground contact: soft, subtle shadows under the platform and props; the platform floats in the pastel void.

THE CHARACTER
Adapt the person from the reference photo into a charming, high-end stylized 3D game character (expressive friendly eyes, clean rounded forms, detailed hair, soft skin shading — premium casual-game quality, never plastic, uncanny or hyper-realistic).

AGE — READ IT FROM THE PHOTO FIRST
Before anything else, judge the person's age from the reference photo and build the whole character to that age. A child must come out as a child, a teenager as a teenager, an adult as an adult. Never turn a child into a small adult, and never turn an adult into a youth. Age shows in the BODY, not only the face: body length, limb length, shoulder width, hand size, and above all head-to-body ratio.

BODY PROPORTIONS — MOST IMPORTANT RULE
Real human proportions for the age you just read. Use the matching set of checks and make all of them hold:

ADULT (roughly 18+) — about 7.5 head-heights tall standing:
- Shoulder width at least 2.5 times the width of the head.
- Head height (chin to crown) at most 1/3 of the torso length from shoulder to hip.
- Upper arm, shoulder to elbow, longer than the head is tall.
- Thigh, hip to knee, about 1.5 times the head height.

TEENAGER (roughly 13-17) — about 7 head-heights:
- Shoulder width about 2.25 times the head width; a lighter, narrower frame than an adult.
- Head height about 1/3 of the shoulder-to-hip torso length.
- Limbs long relative to the torso, slightly gangly.

CHILD (roughly 6-12) — about 6 head-heights:
- Shoulder width about 2 times the head width, narrow and soft, with no adult shoulder shelf.
- Head height about 40% of the shoulder-to-hip torso length — genuinely larger than an adult's, which is correct and must not be "corrected".
- Short arms and legs, small hands, rounded cheeks, no adult muscle definition or jawline.

YOUNG CHILD (roughly 3-5) — about 5 head-heights:
- Shoulder width about 1.75 times the head width.
- Head height about half the shoulder-to-hip torso length.
- Very short limbs, soft rounded body, chubby hands.

SCALE AGAINST THE FIXED SET — HOW AGE READS
The bean bag, stool, books, cube and trophy are always the SAME physical size, so the character's size against them is what tells a viewer how old they are. An adult fills the bean bag and their feet reach the platform comfortably. A child is visibly smaller in the same bean bag, sits further back into it, and their shorter legs mean the knees bend less and the feet reach barely past the front edge or rest just short of it. Do not resize the furniture to fit the character — resize the character against the furniture.

Absolutely forbidden at every age: bobblehead, chibi, caricature or doll looks; a cranium inflated past that age's real ratio; a head that dominates the silhouette. Within the age you read, the head, face and body all share one consistent realistic-stylized scale.

${CHARACTER_RENDER_STYLE}

Pose and wardrobe are FIXED: the character sits relaxed on the bean bag, leaning back comfortably, one hand holding a purple mug decorated with a small gold crown, the other hand resting on their knee, smiling warmly at the camera. They wear a purple hoodie with a small gold crown motif on the chest, dark charcoal joggers, and purple-and-gold sneakers. The clothes are cut for the age and size of the character — a child wears a child's hoodie and a child's sneakers, not adult clothing scaled down.

PAIRED PARTS — CHECK EACH ONE BEFORE FINISHING
The two most-noticed mistakes in this scene are both about pairs. Get these exactly right:

SHOES — the left and right sneaker are MIRROR IMAGES of each other, never two copies of the same shoe.
- The big toe is on the INNER side of each foot, so the two shoes' widest points face each other and the outer edges curve away.
- Lace panels, side stripes, logo placement, the toe cap and the sole tread all run in opposite directions on the two shoes, mirrored about the body's centre line.
- Both shoes are the same size, the same model and the same colourway, and each is attached to its own ankle at a natural angle.
- Never render two right shoes or two left shoes. This is the single most common failure in this scene — verify it explicitly.

HANDS — five fingers on each hand, one thumb per hand, thumbs on the inner side facing each other.
- The hand on the mug wraps it naturally: fingers curled around the handle or the body of the mug, thumb opposing them, nothing fused, no extra or missing digits, no finger passing through the ceramic.
- The hand resting on the knee lies flat and relaxed with fingers slightly apart and clearly separated.

EYES, EARS, EYEBROWS — naturally matched pairs: same size, same level, same colour, both looking at the camera together.

MUG — one handle, on one side only, with a clean elliptical rim consistent with the camera's eye level.

WEIGHT AND CONTACT — the bean bag visibly compresses under the character, the fabric creasing around where they sit; the sneakers rest ON the platform surface with soft contact shadows, never floating above it or sinking into it.

CAMERA AND ZOOM — FIXED
Wide 16:9 hero composition, eye-level, straight-on, with the camera pulled far back. The full platform with all props is visible with a wide margin around it; the seated character occupies roughly 15–18% of the frame width and no more than 55% of the frame height, centered horizontally, with generous airy negative space above, below and to the sides. Do not zoom in closer than this; do not crop the platform, the stool, the cube or the trophy.

SAFE AREA — CRITICAL
The outer 15% of the frame on EVERY side (top, bottom, left, right) must contain ONLY pale atmosphere, soft blobs and empty pastel void — no part of the character, platform or props may enter it. All meaningful content stays inside the central 70% of the frame. The app displays this artwork on many screen sizes and freely crops or fades any edge, so anything near an edge will be lost — compose as if the edges do not exist.

ART DIRECTION
Premium stylized 3D illustration. Soft rounded geometry, beautiful character sculpting, high-quality global illumination, soft subsurface skin shading, gentle volumetric light. Bright, light, optimistic mood — pastel lavender, lilac, pink, mint and cream palette with subtle gold accents. Highly polished casual-game production quality.

BACKGROUND INTEGRATION — CRITICAL
The scene must NOT look like a rectangular illustration placed on top of a UI. No visible hard edges, borders, frames, cards, dark corners, or abrupt boundaries. Progressively dissolve everything toward the outer edges with pale lavender-pink atmosphere, bloom and the soft brand blobs, so the extreme edges fade into a very pale #F8EAFE / #F6E8FF background and the image merges seamlessly into the app.

IMPORTANT
Generate ONLY the illustrated character and environment.
NO user interface. NO buttons. NO cards. NO badges. NO progress bars. NO menus. NO app chrome. NO text. NO typography. NO logos. NO labels. NO readable writing on books or objects. NO rectangular frame around the scene.

The final result should feel like this specific player's seat in the one shared MyTrivia world — identical set, their own recognizable character.`;
