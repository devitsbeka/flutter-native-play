
## Remove Russian Language and Flag from the App

### Overview
Remove all references to Russian as a supported language throughout the application. This includes the language selector, admin panels, analytics, opponent data, and country priority lists.

### Files to Change

**1. `src/locales/index.ts`**
- Remove `import { ru } from './ru'` 
- Remove `ru` from the `translations` record
- Remove the Russian entry from the `LANGUAGES` array (line 52)
- Remove `ru` from the bottom re-export line

**2. `src/components/layout/LanguageSelectorModal.tsx`**
- Remove `ru: "europe"` from the `LANGUAGE_REGIONS` mapping

**3. `src/pages/admin/Flow.tsx`**
- Remove `{ code: 'ru', name: 'Russian', flag: '\u{1F1F7}\u{1F1FA}' }` from the admin language list

**4. `src/data/opponents.ts`**
- Remove `{ code: "RU", name: "Russia", flag: "\u{1F1F7}\u{1F1FA}" }` from opponent countries
- Remove `{ code: "RU", weight: 3 }` from weighted countries

**5. `src/components/admin/PalantirAnalyticsWidget.tsx`**
- Remove `'ru'` from the `languages` array in `fetchLanguageBuckets`
- Remove `'ru'` from the `predefinedRegions` array

**6. `src/components/profile/CountrySelectModal.tsx`**
- Remove `'ru'` from the `priorityCountries` array

**7. `src/hooks/useQuestionAvailability.ts`**
- Remove `'ru': '\u10E0\u10E3\u10E1\u10E3\u10DA'` from both language name maps (lines 206 and 290)

### Not Changing (timezone mapping)
- `src/hooks/useSessionTracker.ts` and `src/hooks/useUserPresence.ts` map `Europe/Moscow` timezone to region `'ru'` -- these are for detecting where users connect from, not for language support. They stay as-is since users from that timezone still exist.

### Summary
- 7 files modified
- No database changes
- The `src/locales/ru.ts` file can remain on disk (unused) -- removing the import is sufficient
