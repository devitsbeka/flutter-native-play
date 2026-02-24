

## Systematic Hardcoded String Elimination and Translation Readiness

### The Problem
There are **47 component files** with hardcoded Georgian strings that bypass the `t()` translation system entirely. Additionally, the locale files for FR, DE, IT, and PT are incomplete -- they spread `...en` (English) as fallback for untranslated sections, but the massive `extra` section (500+ keys) remains English-only for these languages. Spanish is the only fully translated non-English locale.

### The Solution: Two-Phase Approach

---

### Phase 1: Extract All Hardcoded Strings to Translation Keys

Go through all 47 files that contain hardcoded Georgian text and replace every string with `t("key")` calls. This is the critical step -- once all strings use the translation system, adding new languages becomes a matter of updating locale files only.

**Files requiring extraction (grouped by area):**

**Auth and Guest flows (5 files):**
- `DesktopGuestSplitLayout.tsx` -- validation messages, placeholders, error toasts
- `GuestJoinScreen.tsx` -- join flow text
- `AuthFormModal.tsx` -- auth modal strings
- `MobileAuthScreen.tsx` -- mobile auth text
- `SecurityQuestionSelector.tsx` -- security question labels

**Game and Quiz creation (8 files):**
- `CreateBlindTriviaModal.tsx` -- difficulty labels, topic suggestions, toasts
- `CreateQuizModal.tsx` -- difficulty labels, topic suggestions, format options
- `EditRoundModal.tsx` -- button titles, placeholders
- `GameStylePersonalTrivia.tsx` -- (partially done, verify remaining)
- `SocialFeed.tsx` -- ad/promo text
- `QuizResultsScreen.tsx` -- results text
- `RoundResultScreen.tsx` -- round result text
- `AIGenerationStatus.tsx` -- generation status messages

**Room and Team (6 files):**
- `RoomLobbyV2.tsx` -- lobby UI text
- `RoomScoreboard.tsx` -- scoreboard labels
- `CategoryPickerSection.tsx` -- (partially done, verify remaining)
- `TeamMenuScreen.tsx` -- menu option text
- `CreateRoomPage.tsx` -- (partially done, verify remaining)
- `RoomChatSection.tsx` -- chat placeholders

**Profile and Settings (5 files):**
- `AvatarFrameShop.tsx` -- purchase toasts
- `ProfilePage.tsx` -- profile labels
- `SettingsModal.tsx` -- settings text
- `CountrySelectModal.tsx` -- country selection text
- `EmailEditModal.tsx` -- email edit text

**Map and Adventure (4 files):**
- `AdventureMapPage.tsx` -- map labels
- `AdventureHelpModal.tsx` -- help text
- `PowerUpDemoPreview.tsx` -- power-up labels
- `MapNodePopup.tsx` -- node popup text

**Leaderboard (3 files):**
- `LeagueHeroHeader.tsx` -- league names
- `WeeklyRewardsModal.tsx` -- rewards text
- `LeaderboardPage.tsx` -- leaderboard labels

**Other (16+ files):**
- Various modals, toasts, and utility components with scattered Georgian strings

For each file:
1. Identify all hardcoded Georgian strings
2. Create appropriate keys in `ka.ts` (if not already present)
3. Add corresponding English translations in `en.ts`
4. Replace the hardcoded string with `t("section.keyName")`

---

### Phase 2: Complete the Missing Locale Files

Once all strings flow through `t()`, complete the translations for the 5 remaining languages:

**Current state of each locale file:**
- `ka.ts` -- 3,389 lines, complete (source of truth)
- `en.ts` -- 3,358 lines, complete
- `es.ts` -- 524 lines, complete (has full `extra` section)
- `fr.ts` -- 121 lines, missing: `extra`, `errors`, `shop`, `guestModal`, `authModal`, `proModal`, `completedLevel`, `powerUpDetail`, `guestJoin`, `controllerWaiting`, `gameInvite`, `categoryWheel`, `playLimit`, `notificationsPanel`
- `de.ts` -- 29 lines, same gaps as FR
- `it.ts` -- 39 lines, same gaps as FR
- `pt.ts` -- 39 lines, same gaps as FR

**What needs translating per language (FR, DE, IT, PT):**
- The `extra` section (~200 keys) -- the biggest gap
- `guestModal`, `authModal`, `proModal` sections
- `completedLevel`, `powerUpDetail`, `guestJoin` sections
- `controllerWaiting`, `gameInvite`, `categoryWheel` sections
- `playLimit`, `notificationsPanel` sections
- Any new keys added during Phase 1

**Approach:** Each locale file already uses `...en` spread for missing sections, so the app won't break -- English text shows as fallback. The translation work fills in native-language values progressively.

---

### Execution Plan

This is a large task. I recommend tackling it in batches:

**Batch 1:** Auth flows + Game creation components (13 files) -- these are the most user-facing
**Batch 2:** Room/Team + Profile/Settings (11 files)
**Batch 3:** Map, Leaderboard, and remaining components (23+ files)
**Batch 4:** Complete FR locale file (biggest gap after EN/ES)
**Batch 5:** Complete DE, IT, PT locale files

Each batch adds the new keys to both `ka.ts` and `en.ts`, replaces hardcoded strings with `t()` calls, and the other locale files automatically fall back to English until their translations are filled in.

### Why This Works
- **No more hunting:** Once Phase 1 is done, every user-visible string goes through `t()`. Adding a new language = adding one file.
- **Graceful fallback:** The `...en` spread pattern means untranslated keys show in English (not Georgian) for non-KA users.
- **Incremental:** Each batch is independently deployable. Users see English fallback for not-yet-translated sections.

### Would you like to start with Batch 1 (Auth + Game creation)?

