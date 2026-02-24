

# Remaining Hardcoded Georgian Strings - Localization Plan

## Summary

After scanning the entire `src/` directory (excluding locale files and static data files), I found **hardcoded Georgian strings in 20+ user-facing files** across components, hooks, pages, and data files. Below is the full inventory grouped by priority.

---

## Priority 1: User-Facing Components (High Impact)

### 1. `src/components/team/MultiplayerResultScreen.tsx`
- `"შენ"` (You) -- used for current player label (lines 362, 492)

### 2. `src/components/team/JoinRoomModal.tsx`
- `"შესვლა..."` / `"შესვლა"` (Joining.../Join) -- button label
- `"გაუქმება"` (Cancel) -- button label

### 3. `src/components/team/AllRecentRoomsModal.tsx`
- `"დახურვა"` (Close) -- button label
- `"ზოგადი"` (General) -- fallback category name

### 4. `src/components/team/QuickPlayModal.tsx`
- `"ონლაინ"` / `"ოფლაინ"` (Online/Offline) -- friend status
- `"კლასიკა"` / `"გართობა"` / `"სწავლა"` (Classic/Fun/Learning) -- category type tabs

### 5. `src/components/team/ChatModal.tsx`
- `"ონლაინ"` / `"ოფლაინ"` (Online/Offline) -- friend status

### 6. `src/components/team/GameInvitationsSection.tsx`
- `"მეგობარი"` (Friend) -- fallback nickname
- `"ზოგადი"` (General) -- fallback category

### 7. `src/components/team/PendingChallengesSection.tsx`
- `"ზოგადი"` (General) -- fallback category

### 8. `src/components/team/GameResultsScreenV2.tsx`
- `"შემთხვევითი"` (Random) -- random category label
- `"კატეგორია"` (Category) -- fallback

### 9. `src/components/chat/FriendChatSheet.tsx`
- `"დღეს"` / `"გუშინ"` (Today/Yesterday) -- date headers

### 10. `src/components/social/EditQuizModal.tsx`
- `"წაიშალა"` / `"შეცდომა"` / `"წაშლა ვერ მოხერხდა"` -- toast messages

### 11. `src/components/social/CoverImagePicker.tsx`
- `"შეცდომა"` / `"სურათის ატვირთვა/გენერაცია ვერ მოხერხდა"` -- toast messages

### 12. `src/components/social/AddRoundToCollectionModal.tsx`
- Suggested topic labels: `"მემები"`, `"ანიმე"`, `"კოსმოსი"`, `"ფსიქოლოგია"`, `"საქართველოს ისტორია"`, `"ქართული კერძები"`, `"ცხოველები"`, `"სუპერ მანქანები"` etc.
- `"შეცდომა"` / `"რაუნდის შენახვა ვერ მოხერხდა"` -- toast messages

### 13. `src/components/social/FeedPost.tsx`
- `subjectCoverImages` keys: `"მუსიკა"`, `"მომღერლები"`, `"სპორტი"`, `"ფეხბურთი"`, `"ფილმები"`, `"სერიალები"`, `"ისტორია"`, `"გეოგრაფია"`, `"მეცნიერება"`, `"თამაშები"` -- these are used as lookup keys (keep both KA + EN keys; functional, not display strings)

### 14. `src/components/challenge/ChallengeTypeModal.tsx`
- `"ოთახი"` / `"შექმენი სათამაშო ოთახი"` (Room/Create game room)
- `"ტრივია"` / `"1 რაუნდი"` (Trivia/1 round)
- `"კოლექცია"` / `"რამდენიმე რაუნდი"` (Collection/Multiple rounds)

### 15. `src/components/challenge/LibraryCategoryPicker.tsx`
- `"კატეგორიის ძიება..."` (Search categories) -- placeholder
- `"კატეგორია ვერ მოიძებნა"` (Category not found) -- empty state

### 16. `src/components/profile/FriendInvitesTracker.tsx`
- `"ჩემი მოწვევები"` (My invitations) -- section header

### 17. `src/components/leaderboard/ClaimRewardsModal.tsx`
- `"კატეგორია"` (Category) -- fallback label

### 18. `src/components/social/QuizPlayModal.tsx`
- `"მართალია"` / `"მცდარია"` -- true/false answer detection (functional, but needs bilingual handling)

### 19. `src/components/game/QuizGameScreenProd.tsx`
- Same `"მართალია"` / `"მცდარია"` true/false detection

### 20. `src/components/controller/ControllerQuestion.tsx`
- Same `"მართალია"` / `"მცდარია"` true/false detection

### 21. `src/components/team/MultiplayerGameScreenV2.tsx`
- Same `"მართალია"` / `"მცდარია"` true/false detection

---

## Priority 2: Hooks and Utilities

### 22. `src/hooks/useConversationPreviews.ts`
- `"ახლა"` (now), `"წთ"` (min), `"გუშინ"` (yesterday) -- relative time formatting

### 23. `src/hooks/useGameInvitations.ts`
- `"მეგობარი"` (Friend) fallback + `"გიწვევს თამაშში!"` (invites you to play!) -- notification text

### 24. `src/hooks/useTriviaLobby.ts`
- `"მოთამაშე"` (Player) -- fallback nickname

### 25. `src/hooks/useMissions.ts`
- Mission titles and descriptions: `"მარათონელი"`, `"სრულყოფილება"`, `"მულტიკატეგორია"`, `"პერფექციონისტი"` etc.

### 26. `src/data/opponents.ts`
- Rank names: `"ბრინჯაო"`, `"ვერცხლი"`, `"ოქრო"`, `"პლატინა"`, `"ბრილიანტი"`, `"ოსტატი"`, `"გრანდმასტერი"`

---

## Priority 3: Admin-Only (Lower Priority)

### 27. `src/components/admin/AdminRoute.tsx`
- `"იტვირთება..."` / `"ხელახლა ცდა"` (Loading/Retry)

### 28. `src/components/admin/analytics/UserDetailModal.tsx`
- Day names: `["კვი", "ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ"]`

### 29. `src/components/admin/IconPickerModal.tsx`
- `"შეთავაზებული"` (Suggested)

### 30. `src/components/admin/ReferralAnalyticsWidget.tsx`
- `"გაგზავნილი"` / `"მიღებული"` (Sent/Received)

### 31. `src/pages/admin/Reports.tsx`
- Report type/status labels (spam, harassment, pending, resolved, etc.)

---

## Skipped (Intentional / Non-Display)

- **`src/data/categories.ts`** -- Category names/descriptions (loaded from DB in production, fallback data only)
- **`src/utils/roomNameGenerator.ts`** -- Themed Georgian room names (intentionally Georgian)
- **`src/utils/transliteration.ts`** -- Bilingual search utility (functional, not display)
- **`src/components/social/FeedPost.tsx`** `subjectCoverImages` keys -- Used as lookup keys matching DB data
- **`src/pages/AllButtons.tsx`** -- Dev/demo page only
- **`src/pages/SampleDemoTV.tsx`** -- Demo page only
- **True/False detection** (`"მართალია"/"მცდარია"`) -- These are matching against DB question data, not display strings. Should keep both KA and EN checks.

---

## Technical Approach

For each file:
1. Add new translation keys to `en.ts` and `ka.ts`
2. Import and use `useLanguage()` hook (or standalone `t()` for non-React contexts)
3. Replace hardcoded strings with `t("key")` calls
4. For fallback strings like `|| "ზოგადი"`, change to `|| t("common.general")`

Estimated: ~50 new translation keys across `en.ts` and `ka.ts`.

I recommend implementing in 2 batches:
- **Batch A**: Priority 1 items (20 component files) -- all user-facing
- **Batch B**: Priority 2 items (hooks + data) -- functional strings

Admin files (Priority 3) can be deferred since they're not user-facing.

