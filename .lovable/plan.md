

# Fix Duplicate Keys and Translate All Remaining Hardcoded Georgian Strings

## Phase 1: Fix Build Errors (Duplicate Keys)

Remove duplicate translation keys from both `en.ts` and `ka.ts`. The following keys already exist earlier in the files and were accidentally re-added:

**In `en.ts`** - remove these duplicates from the newly added block (lines ~2746-2876):
- `navHome` (already at line 1541)
- `navOnlineGame` (already at line 1545)
- `navMore` (already at line 1546)
- `whatToPlay` (already at line 1607) -- rename new one to `whatToPlayTV`
- `vipNoAdsDesc` (already at line 1917)
- `vipStatusDesc` (already at line 1925)
- `vipAvatarsDesc` (already at line 1919)
- `collectionLabel` (already at line 1622)
- `gameRoomLabel2` -- keep this one (no duplicate, name is already unique)

**In `ka.ts`** - same set of duplicates to remove/rename.

For keys that have different values in the two locations (like `whatToPlay`), we'll rename the new one to `whatToPlayTV` to distinguish TV poll context vs room context.

For keys with identical values, we'll simply delete the duplicate and use the existing key in the components.

## Phase 2: Update Components (Group 1 - Core UI)

### `src/components/shared/OfflineBanner.tsx`
- Add `useLanguage` hook, replace hardcoded "ინტერნეტ კავშირი არ არის" with `t("extra.noInternet")`

### `src/components/shared/BetaGiftModal.tsx`
- Add ~15 new keys: `betaGiftTitle`, `thankYouForBeingHere`, `sendingYou10DayPro`, `enjoyTrivia`, `tenDayPro`, `laterBtn`, `proActivated`, `tenDays`, `plus150Coins`, `tryProFeatures`, `letsStartBtn`, `createTrivia`, `playWithFriends`, `playOnTV`, `freezePowerUp`, `replacePowerUp`, `timeDrainPowerUp`
- Replace all hardcoded text with `t()` calls, pass `t` to sub-components

### `src/components/shared/FloatingGiftButton.tsx`
- Replace `alt="საჩუქარი"` with `t("extra.giftAlt")`

### `src/components/shared/IconOnboardingTooltip.tsx`
- Replace hardcoded text with `t("extra.addIconToQuestion")`

### `src/components/notifications/CompactGenerationCard.tsx`
- Replace "წმ", "მზადდება...", "მზადდება", "მზადაა", "შეცდომა", "გამოყენება" with t() calls

## Phase 3: Update Components (Group 2 - Home & Account)

### `src/components/home/AccountSwitcherModal.tsx`
- Replace "ექაუნთი", "მომხმარებელი", "პროფილის ნახვა", "ექაუნთის დამატება"

### `src/components/home/AvatarFrameShop.tsx`
- Replace rarityLabels with t() calls

### `src/components/home/PrivacyModal.tsx`
- Replace all menu labels, confirmation dialogs, and toast messages

### `src/components/home/StreakModal.tsx`
- Replace streak-related strings

### `src/components/home/widgets/TriviaPartyPromo.tsx`
- Replace "ითამაშე Trivia TV"

### `src/components/home/widgets/ShopPromoWidget.tsx`
- Replace "საჩუქრები მაღაზიაში"

## Phase 4: Update Components (Group 3 - Team & Multiplayer)

Files: `DesktopLeftNav.tsx`, `DesktopRightSidebar.tsx`, `TeamMenuScreen.tsx`, `TeamRightSidebar.tsx`, `TVConnectModal.tsx`, `TVPlayModal.tsx`, `AllRecentRoomsModal.tsx`, `GameInvitationsSection.tsx`, `RecentPlayersList.tsx`, `RoomLobbyV2.tsx`, `MultiplayerGameScreen.tsx`, `GameStylePersonalTrivia.tsx`, `RoomChatsPanel.tsx`, `PersonalTriviaModal.tsx`, `QuickPlayModal.tsx`

Each will get `useLanguage` hook and replace Georgian strings with `t()` calls using the keys already added or new ones as needed.

## Phase 5: Update Components (Group 4 - TV & Controller)

Files: `TVPollScreen.tsx`, `TVLeaderboardPanel.tsx`, `TVRoundIntroScreen.tsx`, `ControllerPollResultsGuest.tsx`, `ControllerPollResults.tsx`, `ControllerCountdown.tsx`, `ControllerQuestion.tsx`, `ControllerCodeEntry.tsx`, `ControllerDirectSelection.tsx`

## Phase 6: Update Components (Group 5 - Game Screens)

Files: `QuestionScreen.tsx`, `ComingSoonModal.tsx`, `GameLoseModal.tsx`, `CloudCategoryFlight.tsx`, `ActivePowerUpIndicator.tsx`, `QuizGameScreenProd.tsx`, `CategoryQuizPage.tsx`, `quiz-next-button.tsx`, `exhaustion-indicator.tsx`

## Phase 7: Update Components (Group 6 - Shop & PRO)

Files: `ShopProSidebar.tsx`, `ShopRightSidebar.tsx`, `MobileProCarousel.tsx`

### `src/contexts/VipContext.tsx`
- Convert `VIP_BENEFITS` arrays to use translation keys instead of hardcoded strings

## Phase 8: Update Components (Group 7 - Social & Profile)

Files: `CreateTriviaTypeModal.tsx`, `CollectionPreviewModal.tsx`, `CreateCollectionModal.tsx`, `EditQuizModal.tsx`, `FriendInvitesTracker.tsx`, `ProfileRightSidebar.tsx`, `ClaimRewardsModal.tsx`, `FriendChatSheet.tsx`

## Phase 9: Update Hooks & Contexts (Group 8)

Files using standalone `t()` from LanguageContext (not the hook):
- `useConversationPreviews.ts` - time formatting
- `useDailyPlays.ts` - toast messages
- `useTrivia.ts` - error message
- `PendingChallengesContext.tsx` - toast messages
- `MultiplayerContext.tsx` - toast messages
- `GameContext.tsx` - error message
- `FriendsContext.tsx` - toast action label
- `ReturningUserPicker.tsx` - error message

---

## Technical Details

- **Total new translation keys**: ~200+ across `en.ts` and `ka.ts`
- **Total files modified**: ~50 component/hook/context files + 2 locale files
- **Pattern**: Components use `const { t } = useLanguage()`, hooks/contexts use standalone `t()` import from `@/contexts/LanguageContext`
- **No breaking changes**: All keys are additive; existing keys are reused where they match
- **Build error fix**: Remove 8 duplicate keys from each locale file

