

## Translate Raw English Error Messages to Georgian

### Problem
In many places across the app, raw Supabase error messages (in English) are passed directly as notification/toast descriptions. The screenshot shows "შეცდომა" (Error) as the title but "User not found" in English as the description.

### Solution

Create a utility function `translateErrorMessage(message: string): string` that maps common Supabase/auth error messages to Georgian equivalents, then apply it everywhere `error.message` is shown to the user.

### New File: `src/utils/errorTranslations.ts`

A simple helper with a map of known English error strings to Georgian translations:

| English message pattern | Georgian translation |
|---|---|
| User not found | მომხმარებელი ვერ მოიძებნა |
| Invalid login credentials | არასწორი მონაცემები |
| Email not confirmed | ელ-ფოსტა არ არის დადასტურებული |
| already registered | ეს მომხმარებელი უკვე რეგისტრირებულია |
| Password should be at least | პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს |
| Email rate limit exceeded | ძალიან ბევრი მცდელობა, სცადე მოგვიანებით |
| Network / fetch error | ინტერნეტ კავშირის შეცდომა |
| (fallback) | შეცდომა, სცადე თავიდან |

The function uses `includes()` matching against the raw message and returns the Georgian string.

### Files to Update (replace `error.message` with `translateErrorMessage(error.message)`)

1. **`src/pages/Auth.tsx`** -- 4 places where `description: error.message` or `description: result.error.message` is used
2. **`src/components/home/SettingsModal.tsx`** -- 2 catch blocks
3. **`src/pages/SettingsName.tsx`** -- 1 catch block
4. **`src/pages/SettingsPassword.tsx`** -- 1 catch block
5. **`src/pages/SettingsPrivacy.tsx`** -- 2 catch blocks
6. **`src/components/home/PrivacyModal.tsx`** -- 2 catch blocks
7. **`src/components/profile/CountrySelectModal.tsx`** -- 1 catch block
8. **`src/components/profile/EmailEditModal.tsx`** -- 1 catch block
9. **`src/components/profile/DetailsSettingsMenu.tsx`** -- 2 catch blocks (already have Georgian fallbacks, but `error.message` can still leak through)
10. **`src/hooks/useAIGenerationSettings.ts`** -- 1 catch block

Each update is a simple import + wrapping `error.message` with `translateErrorMessage(error.message)`.
