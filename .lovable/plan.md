

## Add Missing Translation Key for LevelUpModal

### Problem
The LevelUpModal displays the raw key `modals.correctAnswers` because this translation key was never added to any locale file.

### Fix
Add the `correctAnswers` key to the modals section in both locale files:

**File: `src/locales/en.ts`** (after line 932, `spinTickets`)
- Add: `correctAnswers: "correct answers"`

**File: `src/locales/ka.ts`** (after line 935, `spinTickets`)
- Add: `correctAnswers: "სწორი პასუხი"`

This will make the LevelUpModal display "20 სწორი პასუხი" in Georgian instead of "20 modals.correctAnswers".
