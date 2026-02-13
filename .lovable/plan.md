

## Encourage Photo Uploads and Conditionally Show Animate Button

### Problem
Currently, the "ანიმაცია" (Animate) button appears for all users regardless of avatar type. Users with mascot/default avatars see the animate button even though animation only makes sense for real photos. Users are not motivated to upload their own photo or take a selfie.

### Solution
In `src/components/home/AvatarModal.tsx`, detect whether the current avatar is a preset mascot avatar or a user-uploaded image, then:

1. **If avatar is a mascot/default preset**: Hide the animate button entirely. Instead, show a short engaging message below "მიმდინარე ავატარი" encouraging users to upload a real photo, e.g.:
   - "ატვირთე შენი ფოტო და გააცოცხლე პროფილი! ✨" (Upload your photo and bring your profile to life!)
   - This creates curiosity and nudges users toward the selfie/upload buttons below.

2. **If avatar is a user-uploaded image**: Show the "ანიმაცია" button as it currently works (PRO-gated).

### Detection Logic
A helper function `isMascotAvatar(url)` will check if the avatar URL matches the mascot pattern (`/src/assets/avatars/mascot-avatar-*.png` or resolved bundled equivalents from `DEFAULT_AVATAR_PATHS` and `DEFAULT_AVATARS` arrays already defined in the file).

### Technical Details

**File: `src/components/home/AvatarModal.tsx`**

1. Add a helper function (around line 69, inside the component):
```typescript
const isCurrentAvatarMascot = (() => {
  const url = profile?.avatar_url;
  if (!url) return true; // No avatar = treat as mascot
  // Check canonical mascot paths
  if (DEFAULT_AVATAR_PATHS.some(p => url.includes(p) || p.includes(url))) return true;
  // Check bundled URLs
  if (DEFAULT_AVATARS.some(b => url === b)) return true;
  // Check pattern
  if (/mascot-avatar-\d+/.test(url) || /bot-avatar-\d+/.test(url)) return true;
  return false;
})();
```

2. Modify the animate button section (lines 641-679): Replace the entire `{profile?.avatar_url && (...)}` block with conditional logic:
   - If `isCurrentAvatarMascot`: Show an encouraging message like "გადაიღე სელფი ან ატვირთე ფოტო და გააცოცხლე შენი ავატარი!" (Take a selfie or upload a photo to bring your avatar to life!)
   - If NOT mascot (user photo): Show the existing animate button (PRO/non-PRO variants unchanged)

3. Add translations to locale files for the encouragement message:
   - `ka.ts`: `avatar.uploadEncouragement: "📸 ატვირთე შენი ფოტო და გააცოცხლე პროფილი!"`
   - `en.ts`: `avatar.uploadEncouragement: "📸 Upload your photo and bring your profile to life!"`
   - Same for `es.ts`, `ru.ts`, `fr.ts`

### Files to Edit
- `src/components/home/AvatarModal.tsx` -- add mascot detection + conditional rendering
- `src/locales/ka.ts` -- add encouragement text
- `src/locales/en.ts` -- add encouragement text
- `src/locales/es.ts` -- add encouragement text
- `src/locales/ru.ts` -- add encouragement text
- `src/locales/fr.ts` -- add encouragement text

