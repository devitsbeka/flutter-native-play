

## Fix: Russian Flag Still Appearing via Timezone Detection

### Problem

The Russian flag appears in the admin panel because the timezone-to-country detection in `src/hooks/useUserPresence.ts` maps `Europe/Moscow` to `ru`. When a user has this timezone, the system stores `ru` as their `country_code` in the presence table, and the admin panel renders the corresponding flag from flagcdn.

### Root Cause

**File: `src/hooks/useUserPresence.ts`, line 44:**
```
'Europe/Moscow': 'ru',
```

This is the only remaining place where the `ru` country code can be assigned to users.

### Additional Leftover: Edge Functions

Two backend functions still list Russian in their language maps (used for question translation/generation):
- `supabase/functions/translate-questions/index.ts` (line 7): `'ru': 'Russian'`
- `supabase/functions/generate-multilang-trivia/index.ts` (line 8): `'ru': 'Russian'`

These don't cause the flag issue but are leftover references that should also be cleaned up for consistency.

### Proposed Changes

**1. `src/hooks/useUserPresence.ts`**
- Change `'Europe/Moscow': 'ru'` to `'Europe/Moscow': 'ge'` (default to Georgia, matching the app's default behavior for new registrations)

**2. `supabase/functions/translate-questions/index.ts`**
- Remove the `'ru': 'Russian (Русский)'` entry from the language map

**3. `supabase/functions/generate-multilang-trivia/index.ts`**
- Remove the `'ru': 'Russian (Русский)'` entry from the language map

**4. `supabase/functions/fix-generated-question/index.ts`**
- Remove the `lang === 'ru' ? 'Russian'` fallback from the language name resolution

These are all small, safe changes -- removing dead references to a language the app no longer supports.

