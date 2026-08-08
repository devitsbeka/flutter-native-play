// The system prompt used when a user uploads their photo: instead of a plain
// portrait, the generator produces a personalized 16:9 hero scene for the
// homepage. The generate-avatar edge function reads its prompt from the
// ai_generation_settings table (setting_type 'avatar_static'); the
// AdminAIPromptSync component keeps that row in sync with this file, so
// editing this file is the way to change the prompt.
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
Adapt the person from the reference photo into a charming, high-end stylized 3D game character (subtly larger head, expressive friendly eyes, clean rounded forms, detailed hair, soft skin shading — premium casual-game quality, never childish, plastic, uncanny or hyper-realistic).

Pose and wardrobe are FIXED: the character sits relaxed on the bean bag, leaning back comfortably, one hand holding a purple mug decorated with a small gold crown, the other hand resting on their knee, smiling warmly at the camera. They wear a purple hoodie with a small gold crown motif on the chest, dark charcoal joggers, and purple-and-gold sneakers.

CAMERA AND ZOOM — FIXED
Wide 16:9 hero composition, eye-level, straight-on. The full platform with all props is visible; the seated character occupies roughly 25–30% of the frame width, centered horizontally, with generous airy negative space above and to the sides. Do not zoom in closer than this; do not crop the platform, the stool, the cube or the trophy.

ART DIRECTION
Premium stylized 3D illustration. Soft rounded geometry, beautiful character sculpting, high-quality global illumination, soft subsurface skin shading, gentle volumetric light. Bright, light, optimistic mood — pastel lavender, lilac, pink, mint and cream palette with subtle gold accents. Highly polished casual-game production quality.

BACKGROUND INTEGRATION — CRITICAL
The scene must NOT look like a rectangular illustration placed on top of a UI. No visible hard edges, borders, frames, cards, dark corners, or abrupt boundaries. Progressively dissolve everything toward the outer edges with pale lavender-pink atmosphere, bloom and the soft brand blobs, so the extreme edges fade into a very pale #F8EAFE / #F6E8FF background and the image merges seamlessly into the app.

IMPORTANT
Generate ONLY the illustrated character and environment.
NO user interface. NO buttons. NO cards. NO badges. NO progress bars. NO menus. NO app chrome. NO text. NO typography. NO logos. NO labels. NO readable writing on books or objects. NO rectangular frame around the scene.

The final result should feel like this specific player's seat in the one shared MyTrivia world — identical set, their own recognizable character.`;
