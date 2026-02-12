

# Redesign Weekly Challenge Modal

## Changes

### File: `src/components/challenge/WeeklyChallengeModal.tsx`

**Header**
- Remove the trophy icon (the `motion.div` with `Trophy` inside)
- Keep just the text "კვირის გამოწვევა" centered in the orange gradient header

**Task Section (დავალება)**
- Replace the `Gamepad2` lucide icon with the uploaded trivia buzzer image (`trivia-buzzer-9.png`)
- Change the challenge title to "მოიგე 10 თამაში"
- Change the description to "მოიგე 10 თამაში დღეში და მიიღე ჯილდო"

**Rewards Section (ჯილდო)**
- Replace the `Gift` lucide icon with the uploaded gift box image (`unboxing-gift-3.png`)
- Update XP reward from 500 to 800
- Update coins reward from 100 to 1500

### Assets to Copy
- `user-uploads://trivia-buzzer-9.png` to `src/assets/trivia-buzzer-9.png`
- `user-uploads://unboxing-gift-3.png` to `src/assets/unboxing-gift-3.png`

Both images will be imported as ES6 modules and used as `img` tags (sized ~24px) in place of the current lucide icons next to the section labels.

