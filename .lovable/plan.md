

# Complete Georgian String Translation - Full App Audit

## Critical: Build Error Fix (Immediate)

**File: `src/components/tv/TVRoundIntroScreen.tsx` line 135**
- Syntax error: `{t("extra.tvImReady")}` needs to be wrapped in a fragment or be a plain expression inside the ternary
- Fix: Change `{t("extra.tvImReady")}` to `t("extra.tvImReady")` (remove the curly braces since it's already inside JSX)

---

## Scope Summary

**298 files** contain Georgian strings outside of locale files. Many are data/config (icon mappings, mock data, semantic match dictionaries) which should NOT be translated. The user-facing UI strings are spread across **~120 files** in **15 directories**.

This plan is divided into **6 phases** by area, each implementable independently.

---

## Phase 1: TV & Controller Screens (Remaining Fixes)
**~15 strings across 5 files**

These files still have leftover Georgian after the previous batch:

| File | Strings |
|------|---------|
| `TVLobbyScreenV2.tsx` | `"კოდი: "`, `"დაწყება (N რაუნდი)"`, `"თამაშის დაწყება"` |
| `TVRevealScreenV2.tsx` | `GEORGIAN_LABELS = ['ა','ბ','გ','დ']` (answer labels A/B/C/D -- these are intentional Georgian alphabet labels, keep as-is OR make locale-aware) |
| `TVQuestionScreenV4.tsx` | `GEORGIAN_LABELS = ['ა','ბ','გ','დ']` (same) |
| `QRCodeDisplay.tsx` | `"შემოუერთდი თამაშს"`, `"დაასკანერე QR კოდი შენი ტელეფონით"` |
| `ControllerPollResultsGuest.tsx` | `"ხმის მიცემის შედეგები"`, `"ხმა"`, `"ველოდებით ჰოსტს თამაშის დასაწყებად..."` |
| `ControllerQuestion.tsx` | `"წ"` (seconds suffix), `"მართალია"/"მცდარია"` (true/false detection logic -- keep as data, add English equivalents already present) |
| `ControllerDirectSelection.tsx` | `"ითამაშე"` |

**Decision needed for `GEORGIAN_LABELS`**: The answer option labels "ა, ბ, გ, დ" are the Georgian equivalent of "A, B, C, D". These should be locale-switched: Georgian users see ა/ბ/გ/დ, others see A/B/C/D.

---

## Phase 2: Game Screens
**~40 strings across 8 files**

| File | Strings |
|------|---------|
| `QuestionScreen.tsx` | `"ა","ბ","გ","დ"` (answer labels), `"წ"` (freeze timer suffix) |
| `ActivePowerUpIndicator.tsx` | `"წ"` (timer suffix) |
| `VSScreen.tsx` | `"სხვადასხვა"` (mixed category), `"მოგება"` (win reward label) |
| `CloudCategoryFlight.tsx` | `"კატეგორიის არჩევა..."` |
| `ComingSoonModal.tsx` | `"მალე დაემატება!"`, `"ახალი კითხვები მზადდება!"`, `"დონე N-ის..."`, `"მაღალი ხარისხის კონტენტი"`, `"რეგულარული განახლებები"`, `"თქვენთვის შექმნილი"`, `"მადლობა მოთმინებისთვის!"` |
| `GameLoseModal.tsx` | `"წაგება"`, `"შენ"`, `"არ დანებდე!..."`, `"ნუგეშის მონეტები"`, `"თავიდან სცადე"` |
| `quiz-question-card.tsx` | `"წ"` (freeze timer) |
| `exhaustion-indicator.tsx` | `"ახლადან დაიწყო"`, `"შერეული კატეგორიები"`, `"ყველა ნანახია"`, `"% დარჩა"`, `"ახალი კითხვები"`, `"კითხვა ნანახია"` |

---

## Phase 3: Home, Navigation & Widgets
**~35 strings across 8 files**

| File | Strings |
|------|---------|
| `QuickActionsBar.tsx` | `"ბორბალი"`, `"რეიტინგი"`, `"მაღაზია"` |
| `DailyRewardsModal.tsx` | `"+50% ბონუსი"` |
| `DidYouKnowWidget.tsx` | `"იცოდით თუ არა?"`, `"ფაქტები მალე დაემატება..."`, `"ვიცოდი"`, `"არ ვიცოდი"`, `"ხმა"`, `"ახალი ფაქტი N წამში..."`, `"შედით ანგარიშზე ხმის მისაცემად"` |
| `FeaturedCard.tsx` | `"მონეტები"`, `"კითხვები"`, `"პროგრესი"` (title attributes) |
| `SoundSettingsModal.tsx` | (check for remaining strings) |
| `UnifiedDesktopNav.tsx` | `"შექმენი ანგარიში და ჩაერთე თამაშში უფასოდ"` |
| `AdventureQuickActions.tsx` | `"საჩუქარი"`, `"მისია"`, `"სკივრი"`, `"დახმარება"` |
| `VideoAdventureMap.tsx` | `"რუქა"` |
| `LevelCircle.tsx` | `"საფეხური"` |
| `PowerUpsBar.tsx` | `"შენი ძალები"` |

---

## Phase 4: Auth, Profile, Onboarding & VIP
**~50 strings across 8 files**

| File | Strings |
|------|---------|
| `Auth.tsx` | `"მოგესალმებით!"`, `"მოწვეული ხარ!"`, `"დარეგისტრირდი..."`, `"ელ-ფოსტა"` fallback, `"მომხმარებელი ვერ მოიძებნა"`, `"ანგარიშის შექმნა"`, `"იქმნება..."`, `"ეს მომხმარებელი უკვე რეგისტრირებულია"`, `"უკან"` |
| `ReturningUserPicker.tsx` | `"არასწორი პაროლი"` |
| `SignupOnboardingModal.tsx` | `"მხოლოდ ასოები..."`, `"აირჩიე უსაფრთხოების კითხვა"`, `"შეიყვანე პასუხი"`, `"უსაფრთხოების კითხვა"`, `"პასუხი"` |
| `DetailsSettingsMenu.tsx` | `"შეცდომა"`, `"წარმატება"`, `"სახელის შეცვლა"`, `"ახალი სახელი"`, `"პაროლები არ ემთხვევა"`, `"გასვლა"`, `"დახმარება"`, `"კონფიდენციალურობა"` |
| `EmailEditModal.tsx` | `"შეცდომა"`, `"წარმატება!"`, `"ელ-ფოსტის შეცვლა"`, `"მიმდინარე ელ-ფოსტა"` |
| `VipBenefitsPopup.tsx` | `"VIP ბენეფიტები"`, `"PRO ბენეფიტები"`, `"დარჩა N დღე"` |
| `VipActivationSuccessModal.tsx` | `"VIP აქტივირებულია!"`, `"შენ გახდი PRO..."`, `"დავიწყოთ!"` |
| `CategoryLeaderboard.tsx` | `"დ"` (days suffix) |

---

## Phase 5: Shop, Challenges, Leaderboard, Social & Search
**~80 strings across 12 files**

| File | Strings |
|------|---------|
| `ShopProSidebar.tsx` | `"გახდი PRO"`, `"გახსენი ყველა შესაძლებლობა"`, `"მუშავდება..."`, `"PRO-ს გააქტიურება"` |
| `ShopItemCard.tsx` | Fallback Georgian strings in badge texts: `"პოპულარული"`, `"საუკეთესო ფასი"`, `"შეზღუდული"`, `"ახალი"`, `"შეძენილი"` |
| `MobileProCarousel.tsx` | `"სოლო PRO"`, `"სამეგობრო PRO"`, benefit lists, `"აქტიური"`, `"შეძენა"`, `"მუშავდება..."` |
| `ShopTabBar.tsx` | `"ფასდაკლება"`, `"ძალები"`, `"ჩარჩოები"`, `"მონეტები"` |
| `ChallengeTypeModal.tsx` | `"შემთხვევითი კატეგორია"`, `"აირჩიე ბიბლიოთეკიდან"`, `"ოთახი"`, `"ტრივია"`, `"კოლექცია"`, `"გამოწვევა"`, `"აირჩიე რას ითამაშებთ"` |
| `LibraryCategoryPicker.tsx` | `"კატეგორიის ძიება..."`, `"კატეგორია ვერ მოიძებნა"` |
| `ClaimRewardsModal.tsx` | `"კვირის ჯილდოები"`, `"ყველა ჯილდო მიღებულია!"`, `"ახალი ჯილდოები არ გაქვს"`, `"მთლიანი ჯილდოები:"`, `"მიიღე ყველა"`, `"# ადგილი"`, `"კატეგორია"`, `"მიიღე"` |
| `LeagueHeroHeader.tsx` | `"საქართველო"` |
| `SearchMiniCards.tsx` | `"კითხვა"`, `"რაუნდი"` |
| `CreateCollectionModal.tsx` | ~30+ strings (topic suggestions in Georgian, toast messages, round labels) |
| Other social components | (additional strings in trivia/collection creation flows) |

---

## Phase 6: Contexts, Hooks, Services & Config
**~60 strings across 15 files**

| File | Strings |
|------|---------|
| `MultiplayerContextV2.tsx` | `"კითხვების სინქრონიზაცია ვერ მოხერხდა"`, `"ოთახი დაიხურა"`, `"ჯერ გაიარე ავტორიზაცია"`, `"ოთახი შეიქმნა!"`, `"ოთახი ვერ მოიძებნა"`, `"ოთახი სავსეა"`, `"კითხვები ვერ მოიძებნა"`, etc. |
| `TVGameContext.tsx` | `"ვერ დაიწყო შემდეგი რაუნდი"`, `"სხვადასხვა"`, `"რაუნდები დასრულდა"` |
| `BackgroundGenerationContext.tsx` | `"მაქსიმუმ 5 ავატარის..."`, `"სურათი გენერირდება..."`, `"გარეკანი შეიქმნა!"`, `"სურათის გენერაცია ვერ მოხერხდა"` |
| `useDailyPlays.ts` | `"ახლავე"`, `"სთ"/"წთ"` suffixes, `"თამაშების ლიმიტი ამოიწურა!"`, `"+N თამაში მიღებულია!"` |
| `useQuestionStudio.ts` | ~15 toast messages for admin question management |
| `useQuestionParser.ts` | ~10 validation warning strings |
| `useDuplicateDetection.ts` | ~6 toast/error strings |
| `useLeagueLeaderboard.ts` | `nameKa` properties (these are data, used by language selection -- OK) |
| `leaderboardRewards.ts` | Reward names and descriptions in Georgian |
| `notificationConfig.ts` | `"AI გენერაცია"`, `"ახალი შეტყობინება"` labels |
| `GenerationQueueDropdown.tsx` | `"ავატარი"`, `"სურათი"`, `"წმ"`, `"მზადდება..."`, `"მზადაა"`, `"შეცდომა"`, `"AI გენერაციები"`, `"დასრულებული"`, `"წარუმატებელი"` |
| `FriendChatSheet.tsx` | `"დღეს"`, `"გუშინ"`, `"დაიწყეთ საუბარი!"`, `"დაწერეთ შეტყობინება..."` |

---

## Files to SKIP (not user-facing UI strings)

These files contain Georgian as **data/content**, not UI labels:

| File | Reason |
|------|--------|
| `iconAnswerValidation.ts` | Semantic match dictionary -- Georgian word stems for answer matching |
| `categoryIconMapping.ts` | Category name-to-icon mapping (Georgian category names from DB) |
| `TVMockContext.tsx` | Mock player names (თამარი, გიორგი, etc.) -- test data |
| `PersonalTriviaModal.tsx` | `EXAMPLE_QUESTIONS` array -- Georgian example trivia questions (content, not UI) |
| `useLeagueLeaderboard.ts` | `nameKa` properties -- already bilingual data model |

---

## Pages with Georgian strings (~46 page files)

Major pages to update include:
- `Auth.tsx`, `CategoryQuizPage.tsx`, `TriviaLobby.tsx`
- Plus ~43 other page files (admin pages can be lower priority since only admins see them)

---

## Admin Components (~48 files)

The `src/components/admin/` directory has **48 files** with Georgian strings. These are admin-only interfaces. They should still be translated but can be **lowest priority** since only admin users see them.

---

## Estimated Totals

| Phase | Files | Strings | Priority |
|-------|-------|---------|----------|
| Build fix | 1 | 1 | IMMEDIATE |
| Phase 1: TV/Controller remaining | 5 | ~15 | High |
| Phase 2: Game screens | 8 | ~40 | High |
| Phase 3: Home/Nav/Widgets | 10 | ~35 | High |
| Phase 4: Auth/Profile/VIP | 8 | ~50 | High |
| Phase 5: Shop/Challenge/Social | 12 | ~80 | Medium |
| Phase 6: Contexts/Hooks/Config | 15 | ~60 | Medium |
| Pages (non-admin) | ~20 | ~80 | Medium |
| Admin components | ~48 | ~200+ | Low |
| **TOTAL** | **~127** | **~560+** | |

---

## Technical Approach

1. **Add all new locale keys** to `en.ts` and `ka.ts` in batches per phase
2. **Import `useLanguage`** in each component that doesn't have it
3. **Replace hardcoded strings** with `t("extra.keyName")` or `t("extra.keyName", { param: value })`
4. **For non-React contexts** (hooks, services): use the standalone `t()` import from `LanguageContext` which reads directly from `localStorage`
5. **For time suffixes** (წ, სთ, წთ, დ): create locale keys like `extra.secondsShort`, `extra.hoursShort`, `extra.minutesShort`, `extra.daysShort`
6. **For answer labels** (ა/ბ/გ/დ vs A/B/C/D): create locale-aware array `t("extra.answerLabelA")` etc.

Due to the massive scope (~560+ strings), I recommend implementing this in multiple approved batches, starting with the build fix + Phase 1-2, then Phase 3-4, then Phase 5-6, and finally admin/pages.

