

## ✅ Completed: Dead Code Cleanup

### Changes Made

**`src/pages/CategoryQuizPage.tsx`**
- Removed unused `opponent` useMemo, `opponentScore`/`playerScore` states, and their two simulation `useEffect`s (~27 lines)
- Removed dead `getPlayerState` and `getOpponentState` callbacks (~11 lines)
- Removed unused mascot avatar imports and `BOT_AVATARS` array (~10 lines)
- Extracted shared `resetQuiz()` function replacing two duplicated replay handlers — also fixes missing `freezeTimeRemaining`/`freezeEndTime` resets

**`src/components/game/VSScreen.tsx`**
- Removed unused `defaultGuestAvatarAnimated` import
- Removed dead `prefetchReady` state and all `setPrefetchReady` calls (state was no longer read after previous fix)

### Still Pending (Optional)
- Migrate 8 files still using deprecated `@/lib/i18n` to `useLanguage()` hook
