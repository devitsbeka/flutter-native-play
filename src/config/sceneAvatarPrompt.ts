// The system prompt used when a user uploads their photo: instead of a plain
// portrait, the generator produces a personalized 16:9 hero scene for the
// homepage. The generate-avatar edge function reads its prompt from the
// ai_generation_settings table (setting_type 'avatar_static'); the
// AdminAIPromptSync component keeps that row in sync with this file, so
// editing this file is the way to change the prompt.
// Image model for scene generation, resolved by the AI gateway (OpenRouter
// model id). GPT Image 2 leads on identity preservation from a reference
// photo; "bytedance-seed/seedream-4.5" is the strong alternative.
export const SCENE_AVATAR_MODEL = "openai/gpt-image-2";

export const SCENE_AVATAR_PROMPT = `Create a premium stylized 3D game-avatar scene using the uploaded face photo as the identity reference.

The main character must clearly resemble the person in the uploaded photo. Preserve their recognizable facial identity and important attributes including face shape, skin tone, hairstyle, hair texture, hair color, eyebrows, eyes, nose, facial hair, and general facial proportions. The result should feel unmistakably like a stylized game-character version of the same person, not a generic replacement.

Render the character as a friendly, high-quality casual-game 3D avatar with soft rounded forms, slightly stylized proportions, expressive eyes, a warm confident expression, and polished animated-game rendering. Keep the character human and recognizable, with only moderate stylization. Do not make the character extreme chibi.

Dress the character in a modern casual purple outfit with subtle gold/yellow accents, such as a premium purple hoodie or jacket, dark casual trousers, and purple/gold sneakers. Small crown-inspired details may be incorporated subtly into the clothing or accessories.

Create a cozy personal-space micro-environment around the character, but DO NOT create a conventional enclosed room.

The entire scene must exist within a very light pastel lavender, blush-pink and near-white gradient background, matching a bright playful trivia-game universe.

The environment should feel like an OPEN FLOATING DIORAMA that organically emerges from this background.

There must be:
no visible room box,
no hard walls,
no rectangular architectural boundaries,
no hard floor-to-wall transition,
no visible horizon line,
no dark background,
no hard scene edges.

Instead, any rug, furniture and props should gradually dissolve into the light pastel background with soft atmospheric haze, bloom, extremely soft shadows and gradient falloff.

The outer areas of the image should become increasingly minimal and bright, seamlessly transitioning into the plain light lavender/pink background.

Include several large softly blurred floating blobs or spheres around the scene in pastel lavender, purple, lilac, mint and pale green. Some should appear behind the character and some closer to the foreground edges to create depth. They should be soft, translucent and slightly out of focus.

Place the character casually relaxing in their personal trivia space, sitting comfortably on a soft purple beanbag or lounge seat, with a natural relaxed pose. The character may hold a purple mug with a small crown symbol, resting one hand casually while looking toward the viewer with a friendly confident expression.

Around the character, include only a small number of carefully arranged objects:
a soft rounded purple rug,
a small low rounded side table,
a small plant,
a notebook or closed book,
a few trivia or knowledge-themed books,
a subtle glowing question-mark cube,
a small trophy or crown-inspired decorative object,
a soft glowing spherical lamp.

Keep all objects rounded, playful and consistent with the same premium 3D game visual language.

Do not overcrowd the scene.

The character must remain the obvious focal point.

Use generous negative space around the character so that application UI can later be placed over the artwork separately.

Composition should feel balanced and suitable for a desktop or mobile game home screen hero area.

Use bright diffuse studio lighting, soft global illumination, lavender ambient bounce, slightly warm highlights, subtle bloom, extremely soft contact shadows and a clean airy atmosphere.

The visual quality should feel like premium modern casual mobile-game key art: polished 3D character rendering, soft dimensionality, friendly expressive design, tactile rounded materials and sophisticated pastel lighting.

The image must be a wide 16:9 landscape composition.

IMPORTANT: Generate artwork only.

Absolutely NO UI.
NO navigation.
NO cards.
NO buttons.
NO XP bars.
NO level badges.
NO currency counters.
NO menus.
NO profile frames.
NO app interface.
NO floating interface elements.
NO labels.
NO logos.
NO typography.
NO readable text anywhere in the image.

Do not generate fake application UI.

The final image should look like the character's own personal trivia space floating naturally inside an infinite soft pastel lavender world, with the environment seamlessly fading into the surrounding light background rather than appearing as a separate room.`;
