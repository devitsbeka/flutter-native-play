// The ONE definition of how a MyTrivia character is rendered.
//
// The homepage scene and the round public avatar are two different
// generations of the same person, so they must look like the same character
// from the same world. They previously carried their own wording and drifted
// apart — the scene came out near-photographic while the avatar came out like
// an animated-movie character. Both prompts now embed this block, so the
// style can never diverge again: edit it here and both follow.
//
// The target sits deliberately BETWEEN the two extremes: a polished CG
// interpretation of a real person — clearly stylized rendering, but real
// human proportions and real facial geometry.
export const CHARACTER_RENDER_STYLE = `CHARACTER RENDER STYLE — the MyTrivia house style
Render the person as a premium stylized 3D character: a high-end animated-feature or AAA game cinematic interpretation of this exact person. The style sits deliberately halfway between photography and cartoon — neither extreme is acceptable.

Keep from reality (do NOT stylize away):
- True adult facial geometry and proportions: normal-sized eyes, real nose and lip shapes, natural jaw and cheekbones, correct eye spacing.
- The likeness itself: face shape, hairstyle, hair color, facial hair silhouette, eyebrows, skin tone, distinctive features. The person must be unmistakably recognizable.
- Natural head-to-body scale.

Stylize (surface treatment only):
- Smooth idealized CG skin with soft subsurface shading instead of photographic pores, blemishes and skin texture.
- Cleanly groomed, sculpted hair with defined strand shapes instead of photographic hair detail.
- Soft, even, flattering studio light instead of camera-real lighting; gentle rim light and clean specular highlights.
- Slightly softened, rounded forms in clothing and silhouette.

Explicitly forbidden in BOTH directions:
- No photorealism: not a photograph, not a retouched photo, no photographic skin texture, no camera grain or lens artifacts.
- No cartoon exaggeration: no oversized or glossy anime eyes, no enlarged head, no shrunken nose, no doll or caricature look, no chibi, no bobblehead, no plastic or toy appearance, no uncanny waxy skin.`;
