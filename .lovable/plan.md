

## Restore "Longest Questions/Answers" Sorting in Question Studio

### What Happened

The database RPC `get_questions_sorted_by_length` still exists and works, but the frontend lost the sorting options. The `StudioFilters` type only supports `'newest' | 'oldest' | 'alphabetical'` — the `'longest_question'` and `'longest_answer'` options were dropped during a previous refactor.

### Fix

#### 1. Update `StudioFilters` type (`src/hooks/useQuestionStudio.ts`)

Extend `sortBy` union:
```typescript
sortBy: 'newest' | 'oldest' | 'alphabetical' | 'longest_question' | 'longest_answer';
```

#### 2. Wire the RPC for length-based sorts (`src/hooks/useQuestionStudio.ts`)

In the question fetch logic (both search and non-search paths), when `sortBy` is `'longest_question'` or `'longest_answer'`, call the existing `get_questions_sorted_by_length` RPC instead of the regular Supabase query. Pass current filters (category, language, difficulty, question type, has_icon, production status) and sort_mode.

For the non-search path (~line 326), add cases to the switch:
```typescript
case 'longest_question':
case 'longest_answer':
  // Use RPC instead of regular query
  const { data: rpcData } = await supabase.rpc('get_questions_sorted_by_length', {
    p_sort_mode: filters.sortBy,
    p_in_production: isProductionMode,
    p_category_id: selectedCategoryId || null,
    p_language: language === 'all' ? null : language,
    p_difficulty: filters.difficulty || null,
    p_question_type: filters.questionType || null,
    p_has_icon: filters.hasIcon === null ? null : (filters.hasIcon ? 'with' : 'without'),
    p_limit: PAGE_SIZE,
    p_offset: page * PAGE_SIZE,
  });
  // Extract total_count from first row, format results
  break;
```

For the search path (~line 208), apply client-side sort by `question_text.length` or max answer length.

#### 3. Add sort options to the filter UI (`src/components/admin/studio/QuestionFilters.tsx`)

Add two new items to the sort radio group:
```tsx
<DropdownMenuRadioItem value="longest_question">გრძელი კითხვები</DropdownMenuRadioItem>
<DropdownMenuRadioItem value="longest_answer">გრძელი პასუხები</DropdownMenuRadioItem>
```

Update the type cast on line 104 to include the new values.

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useQuestionStudio.ts` | Extend `sortBy` type, add RPC call for length-based sorts |
| `src/components/admin/studio/QuestionFilters.tsx` | Add two sort radio items, update type cast |

