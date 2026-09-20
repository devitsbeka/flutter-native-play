/**
 * The backdrops a trivia, collection or round can wear.
 *
 * A cover used to be generated: entering the last step of CreateQuizModal
 * fired `generate-cover-image` at a model, and CoverImagePicker offered
 * three more goes at it. That is a slow, paid, failable round trip for
 * decoration -- and the gradient was already sitting underneath it as the
 * fallback for when it failed (owner: "use random background gradients, or
 * upload photo option, no generations for trivia covers").
 *
 * So the gradient is the cover now, and a photo from the camera roll is the
 * other way. Six flat ramps and ten with blobs behind them, which is enough
 * that a list of covers does not look like a palette.
 *
 * This list lived in SIX files -- CreateQuizModal, CreateCollectionModal,
 * EditQuizModal, AddRoundToCollectionModal, CoverImagePicker and
 * TriviaCreationContext -- and had already drifted into four different
 * lists: 16 entries here, 10 in the picker, 6 in the rest, and
 * CreateCollectionModal's fifth gradient ended #8B5B95 where every other
 * copy has #8B5CF6. Now that the gradient IS the cover rather than the
 * thing you see when generation fails, one list is the point.
 */
export const COVER_GRADIENTS: string[] = [
  "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
  "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
  "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
  "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
  "radial-gradient(ellipse 120% 80% at 20% 30%, rgba(139,92,246,0.8) 0%, transparent 50%), radial-gradient(ellipse 100% 120% at 80% 70%, rgba(236,72,153,0.7) 0%, transparent 50%), linear-gradient(135deg, #4C1D95 0%, #831843 100%)",
  "radial-gradient(ellipse 80% 100% at 70% 20%, rgba(59,130,246,0.8) 0%, transparent 45%), radial-gradient(ellipse 100% 80% at 20% 80%, rgba(6,182,212,0.7) 0%, transparent 45%), linear-gradient(150deg, #1E3A8A 0%, #0E7490 100%)",
  "radial-gradient(ellipse 90% 110% at 30% 60%, rgba(16,185,129,0.8) 0%, transparent 50%), radial-gradient(ellipse 120% 90% at 75% 25%, rgba(52,211,153,0.6) 0%, transparent 50%), linear-gradient(160deg, #064E3B 0%, #047857 100%)",
  "radial-gradient(ellipse 100% 80% at 60% 30%, rgba(249,115,22,0.75) 0%, transparent 45%), radial-gradient(ellipse 80% 100% at 25% 75%, rgba(239,68,68,0.7) 0%, transparent 45%), linear-gradient(145deg, #7C2D12 0%, #991B1B 100%)",
  "radial-gradient(ellipse 110% 90% at 40% 70%, rgba(99,102,241,0.8) 0%, transparent 50%), radial-gradient(ellipse 90% 100% at 80% 20%, rgba(168,85,247,0.7) 0%, transparent 50%), linear-gradient(155deg, #312E81 0%, #581C87 100%)",
  "radial-gradient(ellipse 85% 115% at 25% 40%, rgba(14,165,233,0.8) 0%, transparent 50%), radial-gradient(ellipse 115% 85% at 70% 75%, rgba(34,211,238,0.7) 0%, transparent 50%), linear-gradient(140deg, #0C4A6E 0%, #155E75 100%)",
  "radial-gradient(ellipse 100% 100% at 50% 30%, rgba(217,70,239,0.8) 0%, transparent 50%), radial-gradient(ellipse 80% 120% at 30% 80%, rgba(244,114,182,0.7) 0%, transparent 50%), linear-gradient(135deg, #701A75 0%, #9D174D 100%)",
  "radial-gradient(ellipse 95% 85% at 65% 50%, rgba(245,158,11,0.8) 0%, transparent 45%), radial-gradient(ellipse 85% 95% at 25% 35%, rgba(234,179,8,0.7) 0%, transparent 45%), linear-gradient(150deg, #78350F 0%, #A16207 100%)",
  "radial-gradient(ellipse 90% 100% at 35% 25%, rgba(168,162,158,0.6) 0%, transparent 50%), radial-gradient(ellipse 100% 90% at 70% 70%, rgba(120,113,108,0.5) 0%, transparent 50%), linear-gradient(145deg, #292524 0%, #44403C 100%)",
  "radial-gradient(ellipse 105% 95% at 45% 65%, rgba(251,113,133,0.8) 0%, transparent 50%), radial-gradient(ellipse 95% 105% at 70% 25%, rgba(253,164,175,0.6) 0%, transparent 50%), linear-gradient(160deg, #881337 0%, #BE185D 100%)",
];

/**
 * One at random.
 *
 * `rng` is a seam for the tests. Clamped, because an rng that returns 1 --
 * which Math.random never does, but a stub can -- would index off the end
 * and hand back undefined, which renders as no background at all.
 */
export function randomCoverGradient(rng: () => number = Math.random): string {
  const i = Math.min(COVER_GRADIENTS.length - 1, Math.floor(rng() * COVER_GRADIENTS.length));
  return COVER_GRADIENTS[i];
}
