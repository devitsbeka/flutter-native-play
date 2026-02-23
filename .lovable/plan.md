

## Make Language Switching Actually Work End-to-End

### Problem
Right now there are **two disconnected language systems**:
1. **UI strings** (`LanguageContext` / `t()` function) — hardcoded to Georgian, `setLanguage` is a no-op
2. **Questions/Categories** (`preferredLanguage` in localStorage) — used by question fetching and category hooks, but never actually set by the language switcher

Result: switching language does nothing meaningful. Category names always show in Georgian (even in admin), and UI strings never change.

### What Will Change

**1. Unlock LanguageContext (currently frozen to Georgian)**
- Remove the hardcoded `DEFAULT_LANGUAGE` override in `LanguageProvider`
- Add `useState` + `localStorage` sync for `preferredLanguage`
- Make `setLanguage` actually persist the choice and update `currentTranslations`
- The `t()` function will then return strings from the selected language (en, fr, etc.)

**2. Admin: Language Question Browser shows translated category names**
- In `LanguageQuestionBrowser.tsx`, when language is not `ka`, fetch `category_translations` for that language
- Display English category names (e.g., "Astronomy" instead of "ასტრონომია") when browsing English questions

**3. User-facing app: full language switch from Settings**
- Add a language selector to `SettingsModal` (or ensure the existing `LanguageSwitcher` is accessible)
- When user picks English:
  - `preferredLanguage` localStorage key is set to `en`
  - All UI strings switch to English via `t()`
  - Questions load from the `en` bucket (already works via `questionService.getPreferredLanguage()`)
  - Categories show English names (already works via `useCategories` which fetches `category_translations`)
  - VS mode, category mode, all game modes use English questions

**4. Standalone `t()` function also respects selected language**
- The exported standalone `t()` (used outside React) currently hardcodes `DEFAULT_LANGUAGE` — update it to read from `localStorage`

### Technical Details

**Files to modify:**

| File | Change |
|------|--------|
| `src/contexts/LanguageContext.tsx` | Add `useState` for language, read/write `localStorage('preferredLanguage')`, make `setLanguage` functional, load correct translations object |
| `src/components/admin/flow/LanguageQuestionBrowser.tsx` | Fetch `category_translations` for non-`ka` languages and use translated names in the category list |
| `src/components/home/SettingsModal.tsx` | Add language picker section (flag + name + dropdown) |
| `src/lib/i18n.ts` | Update standalone `t` re-export to use localStorage language |

**No changes needed (already working):**
- `src/services/questionService.ts` — reads `preferredLanguage` from localStorage
- `src/utils/questionFetcher.ts` — same
- `src/hooks/useCategories.ts` — already fetches `category_translations` and listens to storage changes
- `src/locales/*.ts` — all 19 translation files already exist

### Flow After Implementation

```text
User opens Settings -> picks "English"
  -> localStorage.preferredLanguage = "en"
  -> LanguageContext re-renders with English translations
  -> All t("common.play") calls return "Play" instead of "თამაში"
  -> useCategories refetches with lang="en", shows translated names
  -> questionService fetches language="en" questions
  -> VS mode, Category mode, everything loads English content
```

