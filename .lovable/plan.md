

# Translate Remaining Hardcoded Georgian Strings

## Overview
There are still many hardcoded Georgian strings across user-facing components, hooks, and pages. This plan covers translating them all into the localization system using `t()` keys. Admin-only files are excluded since they're internal tools.

## Scope of Changes

### 1. Locale Files (src/locales/en.ts and src/locales/ka.ts)
Add ~80-100 new translation keys across the `extra` namespace.

### 2. Components to Update

**Authentication / Onboarding:**
- `src/components/home/DesktopGuestSplitLayout.tsx` -- Validation messages ("სახელი საჭიროა", "მინ. 3 სიმბოლო", "პაროლი საჭიროა"), button labels ("შექმენი ანგარიში", "შესვლა"), placeholders ("სახელი", "ელფოსტა ან სახელი", "პაროლი"), toggle text ("უკვე გაქვს ანგარიში?", "არ გაქვს ანგარიში?"), camera buttons ("გადაიღე სელფი", "აირჩიე ფოტო"), error toasts
- `src/components/home/GuestActivationFlow.tsx` -- "დაიწყე თამაში", "შექმენი ანგარიში და ითამაშე"
- `src/components/onboarding/SignupOnboardingModal.tsx` -- "უსაფრთხოების კითხვა" placeholder

**Game Room (Multiplayer):**
- `src/hooks/useGameRoom.ts` -- All toast messages: room creation failed, room not found, game already started, room full, join success/failure (~10 strings)
- `src/components/team/MultiplayerGameScreen.tsx` -- "შენ" (you), "უპასუხა" (answered), "შედეგები" / "შემდეგი კითხვა" (results/next question)
- `src/components/team/RoomLobby.tsx` -- Toast messages for copy, share, host transfer, room delete, name change, invitation resend (~10 strings)

**TV Mode:**
- `src/components/controller/ControllerCountdown.tsx` -- "ვთამაშობთ", "დაიწყო!", "მოემზადე!", "მოემზადე პასუხებისთვის!"
- `src/components/controller/ControllerPollResults.tsx` -- "ხმის მიცემის შედეგები", "ხმა", "რაუნდი", "რაუნდების რაოდენობა:", "იწყება...", "დაწყება", toast messages
- `src/components/tv/TVQuestionScreen.tsx` -- "კითხვა"
- `src/components/tv/TVQuestionScreenV3.tsx` -- "ლიდერბორდი"
- `src/components/tv/TVPairingScreen.tsx` -- "ველოდებით..."
- `src/components/tv/TVMirrorButton.tsx` -- "დაკავშირება..."
- `src/components/team/TVSetupModal.tsx` -- "დაკავშირებულია!", "მზადაა თამაშისთვის"

**Collection Lobby:**
- `src/pages/CollectionLobby.tsx` -- "კოლექცია ვერ მოიძებნა", "უკან დაბრუნება", "კითხვა", "ნათამაშები", "მოწონება", "რაუნდები", question count suffix

**Shop / Monetization:**
- `src/components/home/NotEnoughCoinsModal.tsx` -- "გახდი PRO", "ულიმიტო თამაშები და ფუნქციები"
- `src/components/home/GemShopModal.tsx` -- Various purchase-related strings
- `src/components/shop/ShopPowerUpGuide.tsx` -- "როგორ გამოვიყენოთ ძალები"
- `src/components/shop/ShopProSidebar.tsx` -- "გახდი PRO", "გახსენი ყველა შესაძლებლობა"
- `src/hooks/useGemPurchase.ts` -- Authorization and payment error toasts
- `src/hooks/useDailyVipRewards.ts` -- "ძალების მიღება ვერ მოხერხდა"
- `src/hooks/useLeaderboardRewards.ts` -- Reward claim / frame equip error toasts

**Profile:**
- `src/components/profile/ProfileRightSidebar.tsx` -- "გახდი PRO", "განბლოკე ყველა ფუნქცია", "ითამაშე 10 თამაში", "დღეს ითამაშე", etc.

**Missions / Challenges:**
- `src/components/mission/MissionCompleteToast.tsx` -- "მისია შესრულდა!"

**Social / Trivia Creation:**
- `src/components/social/AddRoundToCollectionModal.tsx` -- Suggestion labels ("Disney ფილმები", "NBA ლეგენდები", etc.), toast messages, placeholder
- `src/components/team/GameStylePersonalTrivia.tsx` -- Draft save/load toasts

**Time formatting:**
- `src/hooks/usePlayLimit.ts` -- "სთ" / "წთ" (hours/minutes abbreviations)

**Country names:**
- `src/lib/countryCoordinates.ts` -- All country names in Georgian (these should use a translation lookup instead of hardcoded values)

### 3. Files Intentionally Excluded
- `src/utils/iconAnswerValidation.ts` -- Georgian word stems used for answer matching (not UI strings)
- `src/pages/SampleDemoPlayer.tsx` -- Demo/sample page with placeholder content
- All `src/components/admin/*` and `src/pages/admin/*` -- Internal admin tools
- `src/data/categories.ts` -- Categories are translated via database

## Technical Approach

1. Add all new keys to `src/locales/ka.ts` (Georgian originals) and `src/locales/en.ts` (English translations)
2. In each component/hook, import `useLanguage` (or the standalone `t` helper for non-React contexts like hooks) and replace hardcoded strings with `t("extra.keyName")` calls
3. For interpolated strings (e.g., `${count} ხმა`), use `t("extra.voteCount", { count })` pattern
4. For time formatting in `usePlayLimit.ts`, use `t("extra.hoursShort")` and `t("extra.minutesShort")`
5. For country names, add a `countryNames` section to locales and look up by country code

## Estimated Changes
- ~100 new locale keys across en.ts and ka.ts
- ~25 component/hook files edited
