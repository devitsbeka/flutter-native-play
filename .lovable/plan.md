
# Translate All Remaining Hardcoded Georgian Strings

## Overview
A comprehensive audit has identified **50+ files** with hardcoded Georgian strings that need to be replaced with `t()` translation calls. This will ensure a fully localized experience when users switch languages.

## Scope

The files are grouped by area. Admin-only pages (ContentManager, DuplicateScanner, Questions, UserAnalytics, AiGenerator, etc.) are excluded since they are internal tools not exposed to end users.

---

## Group 1: Core UI Components

### `src/components/shared/OfflineBanner.tsx`
- "ინტერნეტ კავშირი არ არის" -> `t("extra.noInternet")`

### `src/components/shared/BetaGiftModal.tsx`
- Feature clues: "შექმენი ტრივია", "ითამაშე მეგობრებთან", "ითამაშე TV-ზე"
- Power-up names: "გაყინვა", "შეცვლა", "დროის წართმევა"
- "ბეტა საჩუქარი", "მადლობა, რომ ჩვენთან ხარ!", "საჩუქრად გიგზავნით 10 დღიან PRO-ს.", "სასიამოვნო გართობას გისურვებთ!", "10 დღიანი PRO", "მოგვიანებით", "PRO გააქტიურდა!", "10 დღე", "+150 მონეტა", "სცადე PRO ფუნქციები:", "დავიწყოთ!"

### `src/components/shared/FloatingGiftButton.tsx`
- alt="საჩუქარი" (minor, but should use t())

### `src/components/shared/IconOnboardingTooltip.tsx`
- "დაამატე აიკონი კითხვას!" -> `t("extra.addIconToQuestion")`

### `src/components/notifications/CompactGenerationCard.tsx`
- "წმ", "მზადდება...", "მზადდება", "მზადაა", "შეცდომა", "გამოყენება"

---

## Group 2: Home & Account

### `src/components/home/AccountSwitcherModal.tsx`
- "ექაუნთი", "მომხმარებელი", "პროფილის ნახვა", "ექაუნთის დამატება"

### `src/components/home/AvatarFrameShop.tsx`
- `rarityLabels`: "ჩვეულებრივი", "იშვიათი", "ეპიკური", "ლეგენდარული"

### `src/components/home/PrivacyModal.tsx`
- Notifications: "ანგარიში წაიშალა", "თქვენი ყველა მონაცემი წაიშალა.", "შეცდომა", "მონაცემები გადმოწერილია", etc.
- Menu labels: "კონფიდენციალურობის პოლიტიკა", "მომსახურების პირობები", "მონაცემების ჩამოტვირთვა", etc.
- "ანგარიშის წაშლა", "სამუდამოდ წაშალეთ ყველა მონაცემი", "დარწმუნებული ხართ?", "გაუქმება", "წაშლა"

### `src/components/home/StreakModal.tsx`
- "{N} დღიანი სერია!", "+{N}% XP ბონუსი აქტიურია!", "ბოლო 7 დღე"

### `src/components/home/SoundSettingsModal.tsx`
- Check for any hardcoded strings

### `src/components/home/widgets/TriviaPartyPromo.tsx`
- "ითამაშე Trivia TV"

### `src/components/home/widgets/ShopPromoWidget.tsx`
- "საჩუქრები მაღაზიაში"

---

## Group 3: Team & Multiplayer

### `src/components/team/DesktopLeftNav.tsx`
- Nav items: "მთავარი", "ძიება", "აღმოჩენა", "ონლაინ თამაში", "შეტყობინებები", "შექმნა", "დეშბორდი", "პროფილი", "მეტი"

### `src/components/team/DesktopRightSidebar.tsx`
- "მომხმარებელი", "ჩვენს შესახებ", "დახმარება", "პოლიტიკა"

### `src/components/team/TeamMenuScreen.tsx`
- "შემთხვევითი კატეგორია", "სწრაფი სტარტი", "აირჩიე ბიბლიოთეკიდან", "კატეგორიების არჩევა", "ოთახი", "შექმენი სათამაშო ოთახი", "ტრივია", "1 რაუნდი", "კოლექცია", "რამდენიმე რაუნდი", "შენი კითხვები", "შექმნა", "შემთხვევითი კატეგორია სწრაფი თამაშისთვის"

### `src/components/team/TeamRightSidebar.tsx`
- "მეგობრები ონლაინ", "ონლაინ", "არცერთი მეგობარი არ არის ონლაინ"

### `src/components/team/TVConnectModal.tsx`
- Steps: "გახსენი mytrivia.io/tv", "4-ციფრიანი კოდი გამოჩნდება", "შეიყვანე კოდი ტელეფონიდან", descriptions
- Headers: "TV-ზე თამაში", "კოდის შეყვანა", "დაკავშირებულია"
- Buttons/toasts: "გაგრძელება", "დაკავშირება", errors

### `src/components/team/TVPlayModal.tsx`
- "TV-ზე თამაში", "შეიყვანეთ კოდი TV-დან"

### `src/components/team/AllRecentRoomsModal.tsx`
- "დახურვა", "ყველა თამაში", "ჯერ არ გითამაშია", "ზოგადი"

### `src/components/team/GameInvitationsSection.tsx`
- "მოწვევები", "თამაშის მოწვევები", "ვადა ამოიწურა", time formats (სთ, წთ), "მეგობარი", "გიწვევს თამაშში!"

### `src/components/team/RecentPlayersList.tsx`
- "ბოლო მოთამაშეები", "ყველა"

### `src/components/team/RoomLobbyV2.tsx`
- Share text: "შემომიერთდი ოთახში!"

### `src/components/team/MultiplayerGameScreen.tsx`
- "შედეგები", "შემდეგი კითხვა"

### `src/components/team/GameStylePersonalTrivia.tsx`
- "მაქსიმუმ 20 კითხვა", "წაშალე ზედმეტი კითხვები ახლის დასამატებლად", "შენახვა", "დრაფტად შენახვა", etc.

### `src/components/team/RoomChatsPanel.tsx`
- "ძებნა" (aria-label)

### `src/components/team/PersonalTriviaModal.tsx`
- "დუბლირება" (title), "წაშლა" (title)

### `src/components/team/QuickPlayModal.tsx`
- "ასინქრონული გამოწვევა (48 საათი)"

---

## Group 4: TV & Controller

### `src/components/tv/TVPollScreen.tsx`
- "რა ვითამაშოთ?", "ხმა მიეცით!", "ველოდებით შემოთავაზებებს...", "მოთამაშეები", "კოდი", "ველოდებით მოთამაშეებს...", "ხმის მიცემა დასრულდა!", etc.

### `src/components/tv/TVLeaderboardPanel.tsx`
- "რეიტინგი", "გათიშული", "უპასუხა", "ფიქრობს..."

### `src/components/tv/TVRoundIntroScreen.tsx`
- "რაუნდი", "კატეგორია", "მზადაა!", "მზად ვარ", "ველოდებით ჰოსტს..."

### `src/components/controller/ControllerPollResultsGuest.tsx`
- "ხმის მიცემის შედეგები", "ხმა", "ველოდებით ჰოსტს თამაშის დასაწყებად..."

### `src/components/controller/ControllerPollResults.tsx`
- "ხმის მიცემის შედეგები", "რაუნდი", "რაუნდების რაოდენობა:", "იწყება...", "დაწყება (N რაუნდი)", toasts

### `src/components/controller/ControllerCountdown.tsx`
- "ვთამაშობთ", "დაიწყო!", "მოემზადე!", "მოემზადე პასუხებისთვის!"

### `src/components/controller/ControllerQuestion.tsx`
- "შენი კატეგორიაა!", "ამიტომ ამ რაუნდში აკვირდები", "კითხვა X/Y", "ტელევიზორზე უყურე...", "თამაშიდან გასვლა"

### `src/components/controller/ControllerCodeEntry.tsx`
- "თამაში ვერ მოიძებნა. შეამოწმეთ კოდი."

### `src/components/controller/ControllerDirectSelection.tsx`
- "კატეგორია დაემატა!", "დამატება ვერ მოხერხდა", "აირჩიე კატეგორიები", "დამატება (N)"

---

## Group 5: Game Screens

### `src/components/game/QuestionScreen.tsx`
- "+N ქულა!", "დრო ამოიწურა!", "არასწორია!", "შემდეგი კითხვა", "შედეგები"

### `src/components/game/ComingSoonModal.tsx`
- "მალე დაემატება!", "ახალი კითხვები მზადდება!", "მაღალი ხარისხის კონტენტი", "რეგულარული განახლებები", "თქვენთვის შექმნილი", "მადლობა მოთმინებისთვის!"

### `src/components/game/GameLoseModal.tsx`
- "წაგება", "შენ", "არ დანებდე! შემდეგ ჯერზე აუცილებლად მოიგებ"

### `src/components/game/CloudCategoryFlight.tsx`
- "კატეგორიის არჩევა..."

### `src/components/game/ActivePowerUpIndicator.tsx`
- "დრო გაყინულია", "შეცვლა", "+დრო"

### `src/components/game/QuizGameScreenProd.tsx`
- True/false answer matching: "მართალია"/"მცდარია" (these are data-driven, keep as-is but also match English)

### `src/pages/CategoryQuizPage.tsx`
- DIFFICULTY_LABELS: "მარტივი", "საშუალო", "რთული"
- "შემდეგი კითხვა", "შედეგები"

### `src/components/ui/quiz-next-button.tsx`
- Default text "შემდეგი კითხვა"

### `src/components/ui/exhaustion-indicator.tsx`
- Multiple status messages about question exhaustion

---

## Group 6: Shop & PRO

### `src/components/shop/ShopProSidebar.tsx`
- "გახდი PRO", "გახსენი ყველა შესაძლებლობა", "მუშავდება...", "PRO-ს გააქტიურება"
- VIP_BENEFITS titles/descriptions (from VipContext)

### `src/components/shop/ShopRightSidebar.tsx`
- Tier names, benefits, CTA texts: "სოლო PRO", "სამეგობრო PRO", benefits arrays, "გააქტიურება", "შეძენა", "აქტიური", "აქტიურია", "მუშავდება...", "გახდი PRO"

### `src/components/shop/MobileProCarousel.tsx`
- Same tier names and benefits as ShopRightSidebar, "აქტიური"

### `src/contexts/VipContext.tsx`
- VIP_BENEFITS and VIP_BENEFITS_BY_TIER arrays with hardcoded Georgian titles/descriptions

---

## Group 7: Social & Profile

### `src/components/social/CreateTriviaTypeModal.tsx`
- "სათამაშო ოთახი", "ითამაშე მეგობრებთან ერთად"

### `src/components/social/CollectionPreviewModal.tsx`
- "კოლექცია", "რაუნდი", "კითხვა", "ნათამაშები", "რაუნდები", "ითამაშე"

### `src/components/social/CreateCollectionModal.tsx`
- Topic labels (Georgian topics are content, keep as-is)
- Toasts: "დრაფტის ჩატვირთვა ვერ მოხერხდა", "შენახვა ვერ მოხერხდა", "ინახება...", "შენახვა", "კოლექცია"

### `src/components/social/EditQuizModal.tsx`
- "კითხვების ნახვა", "დარწმუნებული ხარ რომ გსურს წაშლა?"

### `src/components/profile/FriendInvitesTracker.tsx`
- "ჩემი მოწვევები", "ჯერ არცერთი მოწვევა არ გაგიგზავნიათ", status labels: "მიღებული", "ვადაგასული", "მოლოდინში", "ლინკი:", "შემოვიდა:", "გაგზავნილი:"

### `src/components/profile/ProfileRightSidebar.tsx`
- PRO_BENEFITS: "2x XP ბონუსი", "რეკლამების გარეშე", "VIP ბეჯი", "ექსკლუზიური ავატარები"
- "გახდი PRO", "განბლოკე ყველა ფუნქცია", "PRO-ს გააქტიურება"
- "კვირის გამოწვევა", "ითამაშე 10 თამაში", "შესრულებულია", "სწრაფი სტატისტიკა", "დღეს ითამაშე", "3 თამაში"

### `src/components/leaderboard/ClaimRewardsModal.tsx`
- "კვირის ჯილდოები", "ყველა ჯილდო მიღებულია!", "ახალი ჯილდოები არ გაქვს", "მთლიანი ჯილდოები:", "მიიღე ყველა", "ადგილი", "კატეგორია", "მიიღე"

### `src/components/chat/FriendChatSheet.tsx`
- "დღეს", "გუშინ", "დაიწყეთ საუბარი!", "დაწერეთ შეტყობინება...", "შეტყობინება..."

---

## Group 8: Hooks & Contexts

### `src/hooks/useConversationPreviews.ts`
- `formatRelativeTime`: "ახლა", "წთ", "გუშინ" + locale "ka-GE"

### `src/hooks/useDailyPlays.ts`
- "ახლავე", "თამაშების ლიმიტი ამოიწურა!", "დღეს რეკლამების ლიმიტი ამოიწურა", "+N თამაში მიღებულია!", "რეკლამის დამუშავება ვერ მოხერხდა"

### `src/hooks/useTrivia.ts`
- "შეცდომა მოხდა"

### `src/contexts/PendingChallengesContext.tsx`
- "მოთამაშე", "გამოგიწვია თამაშში!", "ზოგადი ცოდნა", "გამოწვევა უარყოფილია", "გამოწვევის უარყოფა ვერ მოხერხდა"

### `src/contexts/MultiplayerContext.tsx`
- "ზოგადი ცოდნა", "მოწინააღმდეგე", "მეგობარმა", "ოთახი შეიქმნა!", "გამოწვევა გაიგზავნა!", toasts

### `src/contexts/GameContext.tsx`
- "კითხვები ვერ მოიძებნა ამ ენაზე"

### `src/contexts/FriendsContext.tsx`
- "ნახვა" (toast action label)

### `src/components/auth/ReturningUserPicker.tsx`
- "არასწორი პაროლი"

---

## Implementation Approach

1. **Add ~200+ new translation keys** to `src/locales/en.ts` and `src/locales/ka.ts` organized by namespace (extra, game, tv, shop, profile, team, chat, etc.)

2. **Update each component** to import `useLanguage` (or standalone `t` for non-React contexts) and replace hardcoded strings with `t()` calls.

3. **For hooks/contexts** that cannot use `useLanguage`, use the standalone `t()` function from `LanguageContext` or the localStorage-based pattern already established in `useGenerationNotifications.ts`.

4. **For VIP_BENEFITS** in `VipContext.tsx`, convert to use translation keys instead of hardcoded Georgian strings, since these are consumed by multiple components.

5. **For time formatting helpers** (`useConversationPreviews`, `GameInvitationsSection`), pass the `t` function or use the standalone translation helper.

This is a large batch operation affecting 40+ files. The implementation will be done systematically, group by group, ensuring no Georgian string is left untranslated in user-facing components.
