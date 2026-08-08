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
// gpt-image-2" made generate-avatar 500 on the prod gateway).
export const SCENE_AVATAR_MODEL = "google/gemini-3-pro-image-preview";

export const SCENE_AVATAR_PROMPT = `Create a premium stylized 3D gamified character scene for the MyTrivia app, using the uploaded portrait as the identity reference.

IDENTITY
Preserve the person’s recognizable facial identity and key visual attributes from the reference image: face shape, skin tone, hairstyle, hair color, facial hair, eyebrows, eyes, nose, lips, proportions, and other distinctive features. The result should clearly resemble the same person, but transformed into a polished stylized 3D game character rather than a photorealistic human.

CHARACTER STYLE
Render the person as a charming, expressive, high-end 3D game avatar with slightly exaggerated friendly proportions: subtly larger head, expressive eyes, clean rounded forms, detailed hair, soft skin shading, and appealing character animation aesthetics. Aim for the quality and personality of a premium modern casual game character. Do not make the character childish, plastic, uncanny, hyper-realistic, or generic.

OUTFIT
Dress the character in a premium purple/lavender casual outfit inspired by MyTrivia’s visual identity, with subtle gold/yellow accents and a small crown motif. Contemporary, playful, intelligent, adventurous, and sophisticated. Outfit can adapt naturally to the pose and scene.

SCENE
Place the character inside a whimsical personal “Trivia World” environment representing curiosity, knowledge, achievement, exploration, and friendly competition.

Create a cozy fantasy study / knowledge sanctuary opening into a magical pastel world. Include tasteful environmental storytelling elements such as:
- books and knowledge objects
- a beautiful globe or exploration artifact
- trophy or achievement objects
- subtle crown motifs
- mystery/question-mark artifacts
- warm magical lanterns
- floating islands or distant fantasy architecture
- soft clouds and atmospheric particles
- occasional purple flowers or plants

The character should be naturally interacting with the environment rather than simply posing for a portrait. Choose an appealing candid activity or pose such as reading, thinking, studying a globe, examining a mysterious object, celebrating an achievement, relaxing after a trivia challenge, writing, exploring, or interacting with a magical knowledge artifact.

COMPOSITION
Character is the clear primary focal point and should occupy roughly the central 30–40% of the composition. Show most or all of the body and enough surrounding environment to make the image feel like the character’s personal world.

Use a wide cinematic composition suitable for placement as a hero scene inside a desktop/web application.

ART DIRECTION
Premium stylized 3D illustration.
Soft rounded geometry.
Beautiful character sculpting.
High-quality global illumination.
Soft subsurface skin shading.
Detailed stylized hair.
Soft volumetric lighting.
Dreamy depth of field.
Warm golden practical lights mixed with lavender ambient light.
Pastel lavender, lilac, pink, cream and subtle gold palette.
Magical but sophisticated.
Friendly, optimistic and intelligent.
Highly polished casual-game production quality.

BACKGROUND INTEGRATION — CRITICAL
The scene must NOT look like a rectangular illustration placed on top of a UI.

Do not create visible hard edges, borders, frames, cards, rectangular backgrounds, dark corners, or abrupt scene boundaries.

Instead, progressively dissolve the environment toward every outer edge using atmospheric perspective, lavender/pink mist, bloom, soft light, translucent clouds and increasingly simplified low-contrast geometry.

The extreme outer edges should naturally fade into a very pale #F8EAFE / #F6E8FF style lavender-pink background so the image can visually merge directly into the MyTrivia application background.

Think of the environment as emerging organically from soft pastel fog in the center and disappearing back into that fog around the perimeter.

Keep important objects away from the extreme edges so they are not visibly cut off.

LIGHTING
Use soft cinematic lighting centered around the character. Keep the character crisp and dimensional while allowing environmental contrast and detail to progressively decrease toward the perimeter.

IMPORTANT
Generate ONLY the illustrated character and environment.

NO user interface.
NO buttons.
NO navigation.
NO cards.
NO badges.
NO progress bars.
NO counters.
NO menus.
NO app chrome.
NO text.
NO typography.
NO logos.
NO labels.
NO readable writing on books or objects.
NO rectangular frame around the scene.

The final result should feel like a living personalized world belonging to this specific MyTrivia player, with their recognizable avatar naturally inhabiting it.`;
