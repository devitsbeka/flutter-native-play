

# Translate Hardcoded Georgian Strings in Gameplay Screens

## Files to Update

### 1. `src/components/game/QuestionScreen.tsx`
- Add `useLanguage` import and `const { t } = useLanguage()`
- Line 447: `+${lastPointsEarned} ქულა!` -> `t("extra.plusPoints", { count: lastPointsEarned })`
- Line 449: `"დრო ამოიწურა!"` -> `t("extra.timeUpLabel")`
- Line 450: `"არასწორია!"` -> `t("extra.incorrectLabel")`
- Line 468: `"შემდეგი კითხვა"` / `"შედეგები"` -> `t("game.nextQuestion")` / `t("game.results")`

### 2. `src/components/ui/quiz-next-button.tsx`
- Line 16: Default prop `text = "შემდეგი კითხვა"` -> Change default to `"Next Question"` (callers should pass translated text; this is a UI primitive)

### 3. `src/components/game/PowerUpEffectOverlay.tsx`
- Lines 23-27: Hardcoded `POWER_UP_NAMES` (`"გაყინვა"`, `"შეცვლა"`, `"+ 10 წამი"`) -> Use `t()` keys: `t("extra.powerFreezeName")`, `t("extra.powerReplaceName")`, `t("extra.powerTimeDrainName")`
- This component doesn't use hooks, so it needs to accept `t` as a prop or use the standalone `t` import from LanguageContext

### 4. `src/components/game/ActivePowerUpIndicator.tsx`
- Lines 27, 34, 41: Hardcoded labels (`"დრო გაყინულია"`, `"შეცვლა"`, `"+დრო"`) -> Convert to use `t()` keys
- Refactor `POWER_UP_CONFIG` to be a function that takes `t` and returns the config

### 5. `src/components/mission/MissionCompleteToast.tsx`
- Line 73: `"მისია შესრულდა! 🎉"` -> New key `extra.missionCompleted`
- Lines 16-21: Hardcoded `POWER_UP_NAMES` -> Same approach as PowerUpEffectOverlay

### 6. `src/components/challenge/ChallengeShareModal.tsx`
- Line 83: `"შეგიძლია დამამარცხო?"` -> New key
- Line 84: `მოთამაშემ მოაგროვა... შეგიძლია დაამარცხო?` -> New key with interpolation
- Line 98/105: `"ბმული დაკოპირდა!"` -> New key
- Line 122: `"გამოიწვიე მეგობრები"` -> New key
- Line 125: `"მოაწყვე შეჯიბრი მეგობრებს შორის"` -> New key
- Line 132: `"შენი შედეგი"` -> New key
- Line 133: `ქულა` -> New key
- Line 135: `სწორი პასუხი` -> New key
- Line 145: `"ბმული იქმნება..."` -> New key
- Line 156: `"გაუზიარე მეგობრებს"` -> New key
- Line 166: `"დაკოპირდა!" / "ბმულის კოპირება"` -> New keys

### 7. `src/components/tv/TVCountdownScreenV2.tsx`
- Line 39/89: `'დაიწყო!'` -> Existing key `extra.gameStarted` or new key
- Line 55: `'რაუნდი'` -> New key
- Line 125: `'წავედით!' / 'მოემზადეთ...'` -> New keys

### 8. `src/components/tv/TVRevealScreen.tsx`
- Line 160: `სწორი` -> New key
- Line 164: `არასწორი` -> New key
- Line 175: `"შემდეგი კითხვა მოდის..."` -> Use existing `extra.nextQuestionSoon`

### 9. `src/components/controller/ControllerCountdown.tsx`
- Line 34: `"ვთამაშობთ"` -> New key
- Line 64: `'დაიწყო!' / 'მოემზადე!'` -> New keys
- Line 66: `"მოემზადე პასუხებისთვის!"` -> New key

### 10. `src/config/rewardConfig.ts`
- Line 60-62: Hardcoded reward labels (`"250 მონეტა"`, `"1 ალმასი"`, `"ძალა"`) -> These are static config; will need dynamic label resolution

## New Locale Keys to Add

In `en.ts` and `ka.ts` `extra` namespace:
- `missionCompleted`: "Mission Complete! :tada:" / "მისია შესრულდა! :tada:"
- `challengeTitle`: "Can you beat me?" / "შეგიძლია დამამარცხო?"
- `challengeShareText`: "{player} scored {score}/{total} points{category}. Can you beat them?" / "{player} მოაგროვა {score}/{total} ქულა{category}. შეგიძლია დაამარცხო?"
- `linkCopied`: "Link copied!" / "ბმული დაკოპირდა!"
- `challengeFriends`: "Challenge Friends" / "გამოიწვიე მეგობრები"
- `challengeSubtitle`: "Set up a competition among friends" / "მოაწყვე შეჯიბრი მეგობრებს შორის"
- `yourResult`: "Your Result" / "შენი შედეგი"
- `pointsLabel`: "points" / "ქულა"
- `correctAnswersCount`: "{count} correct answers" / "{count} სწორი პასუხი"
- `linkCreating`: "Creating link..." / "ბმული იქმნება..."
- `shareWithFriends`: "Share with Friends" / "გაუზიარე მეგობრებს"
- `copied`: "Copied!" / "დაკოპირდა!"
- `copyLink`: "Copy Link" / "ბმულის კოპირება"
- `letsGo`: "Let's go!" / "წავედით!"
- `getReady`: "Get ready..." / "მოემზადეთ..."
- `started`: "Started!" / "დაიწყო!"
- `roundLabel`: "Round" / "რაუნდი"
- `correctCount`: "correct" / "სწორი"
- `incorrectCount`: "incorrect" / "არასწორი"
- `playing`: "Playing" / "ვთამაშობთ"
- `getReadyExcl`: "Get ready!" / "მოემზადე!"
- `getReadyForAnswers`: "Get ready for answers!" / "მოემზადე პასუხებისთვის!"
- `timerFrozen`: "Timer frozen" / "დრო გაყინულია"
- `timePlus`: "+Time" / "+დრო"
- `powerUpTimeDrainLabel`: "+ 10 sec" / "+ 10 წამი"
- `powerUpQuestionReplace`: "Question replace" / "კითხვის შეცვლა"
- `powerUpTimeFreeze`: "Time freeze" / "დროის გაყინვა"

## Technical Notes
- `QuestionScreen.tsx` needs `useLanguage` added (it currently doesn't import it)
- `QuizGameScreenProd.tsx` already uses `t()` for "Next Question"/"Results" -- no changes needed there
- `PowerUpEffectOverlay.tsx` and `ActivePowerUpIndicator.tsx` use static config objects outside the component; will convert labels to functions that call `t()`
- `MissionCompleteToast.tsx` is called from a non-React context via `showMissionCompleteToast`; the toast itself is a component so `useLanguage` works inside it
- Existing keys will be reused where possible (e.g., `game.nextQuestion`, `game.results`, `extra.plusPoints`, `extra.timeUpLabel`, `extra.incorrectLabel`)

