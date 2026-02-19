

## Decrease Gap Between Icon and Question Text by 15px

### What Changes

Reduce the vertical space between the floating category icon and the question text on all game screens. This involves two adjustments:

1. **Move the icon closer to the card** -- reduce the negative top offset
2. **Reduce the reserved top padding inside the card** -- so the text moves up accordingly

### Files to Edit

**`src/components/game/QuizGameScreenProd.tsx`** (Single-player + VS mode)
- Change icon position from `-top-12` (48px) to `-top-[33px]` (33px, a 15px reduction)

**`src/components/team/MultiplayerGameScreenV2.tsx`** (Multiplayer mode)
- Change icon position from `-top-14` (56px) to `-top-[41px]` (41px, a 15px reduction)

**`src/components/social/QuizPlayModal.tsx`** (Social quiz play)
- Change icon position from `-top-12` to `-top-[33px]`

**`src/components/ui/quiz-question-card.tsx`** (Shared question card)
- Reduce `reserveTopSpace` padding from `pt-24` to `pt-20` (16px less, closest Tailwind step)
- Adjust responsive variants proportionally: `pt-20` to `pt-16`, `pt-14` stays

### Technical Detail

The icon floats above the card using `absolute -top-X` positioning, while the card reserves internal padding (`pt-24` when `reserveTopSpace` is true) so text doesn't overlap the icon. Both values need to shrink together to close the gap by 15px.

