

## Fix: Empty Questions with No Answer Buttons

### Root Cause

Found 2 questions in the database with `incorrect_answers: []` (empty array). These pass the current validation (`isValidQuestionLength`) because that function only checks text length, not whether answers actually exist. When such a question enters the game:

- `allAnswers` = only the correct answer (1 item instead of 4)
- No meaningful answer buttons render
- The player sees a question card with an icon but nothing to interact with

The 2 broken questions:
- `adc35532-...` - "რომელ პერიოდში გვხვდება ქვის იარაღების უძველესი ფორმები?"
- `0e6d3c10-...` - "რა კერძია ბოსტნეულის სალათი ისპანახით, ჭარხლით, ბადრიჯნით?"

### Solution

Two changes:

**1. Deactivate the broken questions in the database** (migration)
- Set `is_active = false` for the 2 questions with empty `incorrect_answers`

**2. Add validation guard in `questionService.ts`**
- Expand `isValidQuestionLength` to also reject questions where `incorrect_answers` parses to fewer than 1 item (ideally 3 for a 4-option quiz)
- This prevents any future broken questions from entering gameplay

### Technical Details

**Database migration:**
```sql
UPDATE questions SET is_active = false 
WHERE incorrect_answers::text = '[]' AND is_active = true;
```

**File: `src/services/questionService.ts`** -- Expand validation function

Add a check inside `isValidQuestionLength` (around line 142-148):
- Parse `incorrect_answers` and verify the array has at least 1 entry (minimum for a playable question)
- Return `false` if no incorrect answers exist

### Files to Edit
- `src/services/questionService.ts` -- add incorrect_answers validation
- Database migration -- deactivate 2 broken questions
