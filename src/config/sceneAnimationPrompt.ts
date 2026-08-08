// Scene idle-loop animation — model + system prompt, source-controlled here.
// The AvatarModal passes these to the animate-avatar edge function (mode
// "scene"), so prompt tweaks ship with the frontend deploy; the edge function
// only needs redeploying when the flow itself changes.
export const SCENE_ANIMATION_MODEL = "fal-ai/kling-video/v2.5-turbo/pro/image-to-video";

export const SCENE_ANIMATION_PROMPT = `Create a perfectly seamless, infinitely repeatable idle animation loop. The final frame must match the first frame exactly in composition, character pose, facial expression, camera position, lighting, object positions, and environment state, with no visible jump when repeated.

Keep the scene calm and nearly still, with subtle premium-quality ambient animation only. The character remains seated in the same relaxed pose. Add very gentle natural breathing through tiny chest and shoulder movement, one subtle blink during the loop, extremely slight relaxed head micro-movement, and minimal hand/finger settling while maintaining the exact grip and pose. Keep the smile and facial expression calm.

Add delicate environmental life: extremely slow floating motion of the background spheres, tiny soft movement in the plant leaves, subtle atmospheric depth and light shimmer, and barely perceptible ambient motion that makes the scene feel alive rather than frozen.

Every movement must be cyclic: all animated elements smoothly travel away from their initial state and naturally return to their exact original position, rotation, shape and appearance before the final frame. Breathing completes a full cycle. Any head or body micro-motion returns to the starting pose. Floating objects return to their starting coordinates. Lighting returns to its initial intensity.

Camera must remain completely locked: no zoom, pan, tilt, dolly, orbit, reframing, shake, focus shift or perspective change. Preserve the original framing and 3D character design exactly. No speaking, lip movement, exaggerated expressions, waving, drinking, body repositioning, new objects, disappearing objects, morphing, deformation, texture changes or scene transitions.

Motion should feel like a polished AAA game character's premium idle state: subtle, charming, alive, soft and sophisticated rather than an action animation.

Critical loop requirement: design the entire animation as one closed motion cycle. Ease all motion smoothly into the original state before the end. Frame 1 and the final frame must be visually indistinguishable so the video can repeat indefinitely with zero perceptible cut, jump, acceleration change or lighting discontinuity.`;
