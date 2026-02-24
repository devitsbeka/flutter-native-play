

## Localize Room Name Generation by Language

### Problem
The room name generator (both the edge function and the client-side fallback) only contains Georgian names. When a user switches to English (or any other language), room titles still appear in Georgian.

### Solution
Add multilingual room name sets to both the edge function and the client-side fallback, and pass the user's current language when requesting a name.

### Changes

**1. Edge Function: `supabase/functions/generate-room-name/index.ts`**

- Accept an optional `language` parameter from the request body (default: `ka`)
- Add English name equivalents for all 15 themes (using the comments already in the code as a guide), plus short names for FR, DE, ES, IT, PT
- `generateThemedRoomName()` will take a `language` parameter and pick names from the matching language set
- Georgian names remain the default; for non-KA languages, use the translated name sets
- The `MAX_NAME_LENGTH` check will be relaxed slightly for Latin-script languages since they use fewer characters per word

The translated names per theme (8 names each, 15 themes) for each language:
- **KA**: Keep existing Georgian names as-is
- **EN**: "Golden Cup", "Stars Battle", "Space Traveler", etc. (from the existing comments)
- **FR/DE/ES/IT/PT**: Short, catchy translated equivalents

**2. Client-Side Fallback: `src/utils/roomNameGenerator.ts`**

- Add a `THEMED_ROOM_NAMES_BY_LANG` structure with at minimum EN translations alongside the existing KA names
- Update `generateRoomName()` to accept an optional `language` parameter
- Default to KA if no language specified

**3. Room Creation UI: `src/components/team/CreateRoomPage.tsx`**

- Import `useLanguage` hook
- Pass the current `language` to the edge function call: `supabase.functions.invoke('generate-room-name', { body: { language } })`
- Update the Georgian-only fallback string `"სახალისო გუნდი"` to use a language-appropriate default (e.g., "Fun Squad" for EN)
- Update hardcoded Georgian error toast messages to use `t()` translations

**4. Room Creation Hook: `src/hooks/useGameRoom.ts`**

- Pass the current language when calling `generateRoomName()` from the fallback path

### Technical Notes
- The edge function currently parses `{ iconSlug }` from the body; we'll extend this to also accept `{ language }`
- For languages without a full translation set, English will be the fallback (not Georgian), since Latin-script users would find English more readable
- Room name max length of 18 chars works well for Georgian but may need to be 22 for longer Latin-script names like "Celebration Square"

