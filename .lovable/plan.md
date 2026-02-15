
## Directly Trigger Animation from "გააცოცხლე ავატარი" Button

### What it does now
Clicking "გააცოცხლე ავატარი" opens the full Avatar Modal. The user then has to find and click the animate button inside that modal. This is unnecessary friction.

### What it will do
1. Clicking the button will **directly start the animation process** without opening the modal
2. The button will **hide immediately** after being clicked (no double-click possible)
3. Before starting, it will **check `has_face_photo`** on the profile -- if false, show a toast message asking to upload a photo with a face
4. If face is detected, call the `animate-avatar` edge function and poll for results, all inline from `Index.tsx`

### Technical approach

**File: `src/pages/Index.tsx`**

1. Add a new state: `const [isAnimatingFromHome, setIsAnimatingFromHome] = useState(false)`
2. Create a `handleAnimateFromHome` async function that:
   - Checks `profile.has_face_photo === true` -- if not, shows toast: "გთხოვთ ატვირთოთ ფოტო სახით" (Please upload a photo with a face)
   - Sets `isAnimatingFromHome = true` (this hides the button)
   - Shows toast: "ანიმაცია იწყება... 1-2 წუთი დასჭირდება"
   - Calls `supabase.functions.invoke("animate-avatar", { body: { imageUrl, userId } })`
   - Polls for completion (same logic as in AvatarModal)
   - On success: refreshes profile, shows confetti
   - On error: resets `isAnimatingFromHome = false` so user can retry
3. Update `showAnimatePrompt` to also check `!isAnimatingFromHome`
4. Change all three `onAnimateClick` callbacks from `() => openAvatarModal()` to `() => handleAnimateFromHome()`

**File: `src/components/home/AvatarCircle.tsx`**
- No changes needed -- it already accepts `onAnimateClick` callback and conditionally renders via `showAnimatePrompt`

### Summary
- One file changed: `src/pages/Index.tsx`
- Add ~60 lines for the animate handler + polling logic
- Button disappears on click, face validation before generation, no modal needed
