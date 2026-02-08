

## Replace Old Bot Avatars with Mascot Avatars in Game Screens

### Problem

Three game-related files still import and display the old human-like `bot-avatar-*.png` images instead of the new mascot characters. This is visible in:
- The VS Screen (slot machine cycling effect shows old avatars)
- The quiz game screen (opponent avatar during gameplay)
- The category quiz page (opponent avatar)

### Changes

#### 1. `src/components/game/VSScreen.tsx`

- Remove the 10 `botAvatar` imports (lines 20-29)
- Add 8 `mascotAvatar` imports from `@/assets/avatars/mascot-avatar-*.png`
- Update `slotAvatars` array to use mascot avatars instead of bot avatars:
```
Before: [botAvatar1, botAvatar2, ..., botAvatar10]
After:  [mascotAvatar1, mascotAvatar2, ..., mascotAvatar8]
```

#### 2. `src/components/game/QuizGameScreenProd.tsx`

- Remove the 5 `botAvatar` imports (lines 23-27)
- Add 8 `mascotAvatar` imports
- Rename `botAvatars` array to use mascot avatars:
```
Before: const botAvatars = [botAvatar1, ..., botAvatar5]
After:  const mascotAvatars = [mascotAvatar1, ..., mascotAvatar8]
```
- Update the reference on line 73 (`opponentAvatarIndex` uses `botAvatars.length`) and line 354 (`botAvatars[opponentAvatarIndex]`) to use the new array name

#### 3. `src/pages/CategoryQuizPage.tsx`

- Remove the 3 `botAvatar` imports (lines 52-54)
- Add 8 `mascotAvatar` imports
- Update `BOT_AVATARS` array:
```
Before: const BOT_AVATARS = [botAvatar1, botAvatar2, botAvatar3]
After:  const BOT_AVATARS = [mascotAvatar1, ..., mascotAvatar8]
```

### Files Changed
- `src/components/game/VSScreen.tsx` -- swap bot avatar imports/array with mascot avatars
- `src/components/game/QuizGameScreenProd.tsx` -- swap bot avatar imports/array with mascot avatars
- `src/pages/CategoryQuizPage.tsx` -- swap bot avatar imports/array with mascot avatars
