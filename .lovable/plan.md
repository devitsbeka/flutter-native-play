

## Fix: Make error translations language-aware

### Problem
The `translateErrorMessage()` utility in `src/utils/errorTranslations.ts` has a hardcoded Georgian-only error map. When a backend error like "User not found" arrives, it translates to Georgian -- but if the user has selected English, French, German, etc., they still see the Georgian translation (or sometimes the raw English falls through). The screenshot shows "User not found" leaking through as raw English in the error modal.

### Root cause
`translateErrorMessage()` does not check the user's selected language. It always maps English backend errors to Georgian strings. It should use the locales system instead.

### Solution

**1. Add error translation keys to the locales system**

Add a new `systemErrors` section to `ka.ts` (type definition) and all 7 locale files with translations for each backend error pattern:

| Backend error pattern | Key |
|---|---|
| User not found | `systemErrors.userNotFound` |
| Invalid login credentials | `systemErrors.invalidCredentials` |
| Email not confirmed | `systemErrors.emailNotConfirmed` |
| already registered | `systemErrors.alreadyRegistered` |
| Password should be at least | `systemErrors.passwordTooShort` |
| Email rate limit exceeded / rate limit | `systemErrors.rateLimitExceeded` |
| Failed to fetch / NetworkError / network | `systemErrors.networkError` |
| New password should be different | `systemErrors.newPasswordDifferent` |
| Email already in use | `systemErrors.emailAlreadyInUse` |
| Unable to validate email | `systemErrors.invalidEmailFormat` |
| Signups not allowed | `systemErrors.signupsNotAllowed` |
| (fallback) | `systemErrors.genericError` |

**2. Refactor `translateErrorMessage` to be language-aware**

Update `src/utils/errorTranslations.ts` to:
- Import the standalone `t()` function from `src/utils/standaloneTranslation.ts` (which reads the current locale from localStorage)
- Map each English error pattern to the corresponding `systemErrors.*` translation key
- Return the localized string via `t()` instead of a hardcoded Georgian string
- Keep the same function signature so all 9+ consumer files need zero changes

**3. Files to modify**

| File | Change |
|---|---|
| `src/locales/ka.ts` | Add `systemErrors` type definition and Georgian translations |
| `src/locales/en.ts` | Add `systemErrors` with English translations |
| `src/locales/es.ts` | Add `systemErrors` with Spanish translations |
| `src/locales/fr.ts` | Add `systemErrors` with French translations |
| `src/locales/de.ts` | Add `systemErrors` with German translations |
| `src/locales/it.ts` | Add `systemErrors` with Italian translations |
| `src/locales/pt.ts` | Add `systemErrors` with Portuguese translations |
| `src/utils/errorTranslations.ts` | Refactor to use `t()` with `systemErrors.*` keys |

### What stays the same
- All 9+ consumer files (`Auth.tsx`, `SettingsModal.tsx`, etc.) keep calling `translateErrorMessage(error.message)` unchanged
- The function signature and behavior remain identical -- only the output language changes based on user preference
- No backend, database, or auth changes needed

### Expected result
- Georgian users see Georgian error messages (unchanged)
- English users see English error messages (no more Georgian leaking)
- All other languages see properly translated error messages
- No raw English backend errors leak through in any language
