

# Full Localization: Readiness Check and Execution Plan

## Current State

### What IS ready
- **ka.ts** (Georgian): 3,878 lines -- fully complete, the primary source of truth
- **en.ts** (English): 3,847 lines -- fully complete, used as fallback base for all other languages
- All 5 remaining languages (ES, FR, DE, IT, PT) use `...en` spread, so the app already works in all languages (falling back to English for untranslated keys)

### What is NOT ready

**Step 1 -- Still ~70 hardcoded Georgian strings in components/hooks that need `t()` wiring:**

| File | Hardcoded strings |
|------|-------------------|
| `ChallengeTypeModal.tsx` | Room/Trivia/Collection labels |
| `TVConnectModal.tsx` | Full connection flow instructions |
| `CollectionLobby.tsx` | Collection UI labels |
| `LibraryCategoryPicker.tsx` | Search placeholder, empty state |
| `AllFriendsModal.tsx` | Friend status labels |
| `PlayerProfileModal.tsx` | Profile stats labels |
| `usePlayLimit.ts` | Time units (hours/minutes) |
| `useLeagueLeaderboard.ts` | League names (Bronze-Grandmaster) |
| `VipContext.tsx` | VIP benefit descriptions, toasts |
| `TVGameContext.tsx` | Toast notifications |
| `MultiplayerContextV2.tsx` | Toast messages |
| `opponents.ts` | Rank name wiring |
| `FriendChatSheet.tsx` | Today/Yesterday headers |

**Step 2 -- 5 language files need full translation:**

| Language | Current coverage | Keys to translate |
|----------|-----------------|-------------------|
| Spanish (es.ts) | ~60% done | ~400 remaining keys |
| French (fr.ts) | ~15% done | ~800 remaining keys |
| German (de.ts) | ~10% done | ~850 remaining keys |
| Italian (it.ts) | ~10% done | ~850 remaining keys |
| Portuguese (pt.ts) | ~10% done | ~850 remaining keys |

## Execution Plan

### Phase 1: Wire remaining hardcoded strings (MUST do first)
Replace all ~70 hardcoded Georgian strings with `t()` calls in the 13 files listed above. Add any missing translation keys to both `en.ts` and `ka.ts`.

### Phase 2: Translate all 5 languages (can be parallel)
Since all 5 files use `...en` as the base spread, they are independent of each other. We can update all 5 in parallel.

Each file will be expanded to include full translations for every section that `en.ts` has:
- `common`, `auth`, `forgotPassword`, `onboarding`, `powerups`, `nav`, `menu`
- `game`, `discover`, `profile`, `leaderboard`, `team`, `modals`, `settings`
- `dailyRewards`, `missions`, `shop`, `help`, `legal`, `tv`, `spin`
- `notifications`, `sound`, `errors`, `success`, `avatar`, `category`
- `chest`, `featured`, `iap`, `gameExtra`, `social`, `challenge`
- `chat`, `controllerWaiting`, `gameInvite`, `categoryWheel`, `playLimit`
- `notificationsPanel`, `extra`, `completedLevel`, `powerUpDetail`, `guestJoin`

### Recommended approach: All 5 in parallel
- All 5 files are independent (no cross-dependencies)
- Each uses `...en` spread so partial updates are safe
- We can process them in batches per section to ensure consistency
- Due to file size constraints, each language will be done across 2-3 edits

### Technical Details

**File structure for each language (same pattern):**
```typescript
export const fr: KaTranslations = {
  ...en,
  common: { ...en.common, play: "Jouer", ... },
  auth: { ...en.auth, signIn: "Connexion", ... },
  // ... all sections with translated overrides
};
```

The `...en` spread ensures any keys we miss still show English (not broken UI). Each section override uses `...en.sectionName` to inherit defaults, then overrides with translated strings.

**Estimated scope:** ~4,000 translated strings across 5 files.

