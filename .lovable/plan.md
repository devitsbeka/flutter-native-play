

## Add Face Detection Before Showing "გააცოცხლე ავატარი"

### Problem
Currently, the "გააცოცხლე ავატარი" button shows for ANY uploaded photo (anything in Supabase storage). But AI avatar generation only works with face photos -- uploading a flower, horse, or object wastes AI credits and produces bad results.

### Solution
Add a `has_face_photo` boolean column to the `profiles` table. When a user uploads/saves a photo (original or AI-generated), call an edge function that uses Lovable AI (Gemini) to detect whether the image contains a human face. Store the result in `has_face_photo`. The "გააცოცხლე ავატარი" button only shows when `has_face_photo = true`.

### Changes

#### 1. Database Migration
- Add `has_face_photo` boolean column to `profiles` table (default `false`, nullable)

#### 2. New Edge Function: `supabase/functions/detect-face/index.ts`
- Accepts `{ imageUrl: string }`
- Uses Lovable AI (google/gemini-2.5-flash) with a simple prompt: "Does this image contain a human face? Reply with only YES or NO."
- Sends the image URL to the model
- Parses the text response for YES/NO
- Returns `{ hasFace: boolean }`
- Uses LOVABLE_API_KEY (already configured)

#### 3. Update `src/components/home/AvatarModal.tsx`
- After `saveOriginalPhoto` saves the photo URL, call the `detect-face` edge function with the new avatar URL
- Update the profile with `has_face_photo: true/false` based on the result
- Same for `saveAvatar` (AI-generated avatar from photo) -- set `has_face_photo: true` since AI generation already implies a face was provided
- Same for `selectDefaultAvatar` -- set `has_face_photo: false` since mascots are not faces

#### 4. Update `src/pages/Index.tsx`
- Change the `showAnimatePrompt` condition to include `has_face_photo`:
```
const showAnimatePrompt = !!profile?.avatar_url && 
  profile.avatar_url.includes('supabase.co/storage') && 
  profile.has_face_photo === true &&
  !profile?.animated_avatar_url;
```

#### 5. Update `src/contexts/AuthContext.tsx` (profile type)
- Add `has_face_photo` to the Profile interface if not auto-generated from types

### Flow
```text
User uploads photo
       |
       v
Photo saved to storage + profile updated
       |
       v
Call detect-face edge function (background, non-blocking)
       |
       v
Gemini analyzes: "Is there a human face?"
       |
  YES / NO
       |
       v
Update profiles.has_face_photo = true/false
       |
       v
Main page reads has_face_photo --> show/hide button
```

### Key Details
- Face detection runs in the background after save (non-blocking -- modal closes immediately)
- The button won't appear until the next profile refresh, which is fine since it happens on page load
- For AI-generated avatars (via `generateAvatar`), we auto-set `has_face_photo = true` since the generation itself requires a face
- For mascot selection, we auto-set `has_face_photo = false`
- Cost: one cheap Gemini Flash text call per photo upload (minimal)

