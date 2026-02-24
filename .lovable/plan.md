

# Complete Missing Translations: Eliminate English Fallbacks

## Problem
When a user selects Italian (or any non-English language), approximately **550-600 keys in the `extra` section** and **50-100 keys in other sections** still show English text because they were never translated. The `...en` spread pattern safely prevents crashes but silently shows English strings.

## Scope of Missing Translations

### Per-language gap in `extra` section (the biggest gap)

All 5 languages (ES, FR, DE, IT, PT) are missing translations for these blocks of `extra` keys (roughly lines 1893-3946 in `en.ts`):

| Block | Approx. Keys | Content |
|-------|-------------|---------|
| Friend context | ~15 | friendRequestReceived, alreadyFriends, requestSent, etc. |
| Social notifications | ~6 | playedYourTrivia, likedYourTrivia, someonePlayed, etc. |
| Quiz play modal | ~10 | roundCompleted, totalScore, gameOver, wellDone, etc. |
| VIP page | ~25 | vipShop, becomeVipTitle, vipBenefitsTitle, autoRenewal, etc. |
| Controller/TV game | ~15 | playersConnected, chooseTrivia, selectedRounds, etc. |
| Achievements | ~16 | achieveStreak3 through achieveMissions500 |
| Trivia detail | ~5 | leaderboardTitle, playersCount, editTrivia, etc. |
| Search/Spotlight | ~5 | searchLabel, spotlightPlay, spotlightShop, etc. |
| Edit quiz modal | ~6 | questionNumber, editMode, etc. |
| Invite friends modal | ~20 | inviteFriendsTitle, searchUserPlaceholder, pending, etc. |
| Save/loading states | ~10 | savingState, loadingState, pleaseWait, etc. |
| Report/block | ~15 | reportReason, reportSpam, blockBtn, etc. |
| Feed filters | ~6 | feedFilterLiked, feedFilterSaved, etc. |
| Profile stats | ~10 | profileTrivias, profileAwards, profileGames, etc. |
| Challenge modal | ~8 | challengeModalTitle, roomOption, triviaOption, etc. |
| My trivias widget | ~15 | myTriviasWidget, noTriviasYet, createFirstTrivia, etc. |
| MyTrivia picker | ~15 | myTriviaTitle, noCollectionsYet, draftsLabel, etc. |
| Edit round/question | ~20 | questionLabel, editRoundTitle, deleteThisQuestion, etc. |
| Power-ups detail | ~10 | myPowers, powerFiftyFifty, powerFreezeDesc, etc. |
| Shop/Pro sidebar | ~25 | becomeProSidebar, soloPro, familyPro, benefits, etc. |
| Profile sidebar | ~15 | proBenefit2xXp, quickStatsTitle, playedTodayLabel, etc. |
| Invite friends (Pro) | ~20 | inviteFriendsHeader, byEmailTab, byLinkTab, etc. |
| Daily plays/VIP | ~8 | rightNow, playsLimitReached, adLimitReached, etc. |
| User moderation | ~10 | pleaseLogin, cantReportSelf, userBlockedSuccess, etc. |
| Drafts | ~12 | draftDeleted, savedDrafts, untitledMyTrivia, etc. |
| Guest activation | ~10 | startGameCta, stepSignup, simpleSteps, etc. |
| Room Lobby extras | ~25 | playerRemovedFromRoom, hostTransfer, startRound, etc. |
| Category Picker | ~25 | cpSelectCategory, cpLibrary, cpMyTrivias, etc. |
| SpotlightSearch | ~25 | ssSearchPlaceholder, ssQuickActions, ssCategories, etc. |
| Generation notifications | ~5 | genAvatarTitle, genPreparing, genReady, etc. |
| ControllerReveal | ~12 | crResultsLoading, crCorrect, crTimeExpired, etc. |
| TV screens (all) | ~120 | tvMode, tvPairingScreen, tvLobbyScreen, tvQuestionScreen, tvResultsScreen, tvIdleScreen, tvPollScreen, tvGameOverScreen, etc. |
| Topic pool labels | ~30 | topicNetflixShows, topicDisneyMovies, topicNBALegends, etc. |
| Batch 2-3 keys | ~80 | playerRemoved, categoryChanged, triviaReady, inspirational*, country*, settings*, auth*, diff*, cbt*, cqm*, erm*, sf*, etc. |
| Phase 3-4 keys | ~40 | quickWheel, didYouKnow, mapTitle, referralWelcome, exhaustion*, etc. |

**Total: ~550-600 missing keys per language x 5 languages = ~2,800-3,000 translations needed**

### Partially translated non-`extra` sections

| Section | Languages affected | Missing keys |
|---------|-------------------|-------------|
| `shop` (full version) | ES, DE, IT, PT | ~30 keys (smallPackage, megaPackage, vipDay, etc.) |
| `legal` (full version) | All 5 | ~50 keys (only title/intro translated) |
| `tv` (full version) | All 5 | ~10 keys (playOnTV, mirrorDescription, etc.) |
| `spin` (full version) | All 5 | ~10 keys (winChances, watchAdForSpins, etc.) |
| `help` (coinsExplanation, xpExplanation) | ES, DE, IT, PT | ~2 keys |

## Execution Plan

### Phase A: Translate `extra` section for all 5 languages

Due to size constraints (~600 keys per language), each language will need 4-6 sequential edits to cover the full `extra` section. The work will proceed in batches per language:

1. **Batch 1** (per language): Keys from friend context through VIP page (~80 keys)
2. **Batch 2** (per language): Keys from Controller/TV through invite friends modal (~80 keys)
3. **Batch 3** (per language): Keys from save/loading through MyTrivia picker (~80 keys)
4. **Batch 4** (per language): Keys from edit round through Room Lobby extras (~80 keys)
5. **Batch 5** (per language): Keys from Category Picker through TV screens (~100 keys)
6. **Batch 6** (per language): Keys from topic pool through Phase 4 and remaining (~100 keys)

Languages can be processed in parallel since they're independent files.

### Phase B: Fill partial sections (shop, legal, tv, spin, help)

Add missing keys to the non-`extra` sections for each language. These are smaller (~100 keys total across all sections per language).

### Technical approach

Each edit appends translated key overrides within the existing `extra: { ...en.extra, ... }` block. Since we use the spread pattern, we only need to add the missing keys -- existing translations remain untouched.

```typescript
// Example: adding missing keys to it.ts extra section
extra: {
  ...en.extra,
  // ... existing ~230 translated keys stay ...
  // NEW translations added:
  friendRequestReceived: "{name} vuole essere tuo amico! ...",
  alreadyFriends: "Siete già amici",
  // ... etc
},
```

### Estimated total work
- ~3,000 new translated strings across 5 files
- 25-30 file edits total
- No structural changes, only adding key-value pairs

