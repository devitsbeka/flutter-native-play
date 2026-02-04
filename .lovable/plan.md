

# Plan: Enhanced Sign-Up Mode with Avatar Selection in AuthRequiredModal

## Overview

When users click "შექმენი" (Create Account) in the AuthRequiredModal, the modal will transform to show:
1. A clickable mascot circle in the header (replaces logo)
2. "გამარჯობა!" title with signup messaging
3. Clicking the mascot circle opens avatar upload options (camera or gallery)
4. User can select/capture a photo before creating their account

## Current Behavior

- Login mode: Shows `MyTriviaLiveLogo` + "შესაძენად საჭიროა შესვლა" message
- Sign-up mode: Same logo display (no mascot, no avatar selection)

## Proposed Changes

### Visual States

**Login Mode (current)**
```
┌─────────────────────────────────────┐
│         MyTrivia LIVE Logo          │
│                                     │
│    "შესაძენად საჭიროა შესვლა"       │
│                                     │
│   [email/username input]            │
│   [password input]                  │
│   [  🔒 შესვლა  ]                   │
└─────────────────────────────────────┘
```

**Sign-Up Mode (new)**
```
┌─────────────────────────────────────┐
│       ┌─────────────┐               │
│       │  [Mascot]   │  ← Clickable! │
│       │  📷 badge   │               │
│       └─────────────┘               │
│                                     │
│        "გამარჯობა!"                 │
│  "შექმენი ანგარიში და ჩაერთე       │
│   თამაშში უფასოდ"                   │
│                                     │
│   [სახელი input]                    │
│   [პაროლი input]                    │
│   [  ✨ შექმენი ანგარიში  ]         │
└─────────────────────────────────────┘
```

### Implementation Details

**File: `src/components/shared/AuthRequiredModal.tsx`**

Changes:
1. Add imports for `useCamera`, `SinglePlayVideo`, `Popover`, `Camera`, `ImagePlus` icons
2. Add `guestWelcomeVideo` asset import
3. Add state for avatar selection: `selectedPhoto`, `videoEnded`, `showUploadOptions`
4. Add camera handlers: `handleTakePhoto`, `handleSelectFromGallery`
5. Conditionally render header based on `isSignUp` state:
   - Login mode: Logo + custom message
   - Sign-up mode: Clickable mascot circle with camera badge + "გამარჯობა!" title

### Code Structure

```tsx
// New imports
import { Camera, ImagePlus } from "lucide-react";
import { SinglePlayVideo } from "@/components/shared/SinglePlayVideo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCamera } from "@/hooks/useCamera";
import guestWelcomeVideo from "@/assets/guest-welcome-avatar.mp4";

// New state in component
const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
const [videoEnded, setVideoEnded] = useState(false);
const [showUploadOptions, setShowUploadOptions] = useState(false);
const { takePhoto, selectFromGallery, isLoading: isCameraLoading } = useCamera();

// Handler functions for photo selection
const handleTakePhoto = async () => {
  setShowUploadOptions(false);
  const photo = await takePhoto();
  if (photo?.dataUrl) setSelectedPhoto(photo.dataUrl);
};

const handleSelectFromGallery = async () => {
  setShowUploadOptions(false);
  const photo = await selectFromGallery();
  if (photo?.dataUrl) setSelectedPhoto(photo.dataUrl);
};

// In the render - header changes based on isSignUp
{isSignUp ? (
  // Sign-up header with mascot circle
  <div className="flex flex-col items-center mb-4">
    <Popover open={showUploadOptions} onOpenChange={setShowUploadOptions}>
      <PopoverTrigger asChild>
        <button className="rounded-full overflow-hidden relative">
          {selectedPhoto ? (
            <img src={selectedPhoto} className="w-[90px] h-[90px] object-cover" />
          ) : (
            <SinglePlayVideo src={guestWelcomeVideo} onEnded={() => setVideoEnded(true)} />
          )}
          {/* Camera badge */}
          <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5">
            <Camera className="w-3.5 h-3.5 text-white" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent>
        {/* Camera / Gallery options */}
      </PopoverContent>
    </Popover>
    <h2 className="font-slackey text-2xl">გამარჯობა!</h2>
    <p>შექმენი ანგარიში და ჩაერთე თამაშში უფასოდ</p>
  </div>
) : (
  // Login header with logo
  <div className="flex flex-col items-center mb-4">
    <MyTriviaLiveLogo size="md" textColor="dark" />
    <p>{message || "შესაძენად საჭიროა შესვლა"}</p>
  </div>
)}
```

### Avatar Integration with Account Creation

The selected photo will be stored in component state and can be:
1. Displayed as preview in the mascot circle
2. Passed to the sign-up flow for avatar generation after account creation

For the initial implementation, the photo selection will:
- Replace the mascot video with the selected photo preview
- Store the photo for potential use after successful registration
- Trigger the AvatarCreationFlow post-registration if a photo was selected

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/shared/AuthRequiredModal.tsx` | Add conditional header rendering, mascot circle with camera popover, photo selection handlers |

---

## User Experience Flow

```
1. User sees AuthRequiredModal (Login mode by default)
   → Shows logo + "შესაძენად საჭიროა შესვლა"

2. User clicks "შექმენი" link
   → Modal transforms to Sign-Up mode
   → Shows animated mascot in circle with camera badge
   → Shows "გამარჯობა!" title

3. User clicks on mascot circle
   → Popover appears with two options:
     - "გადაიღე ფოტო" (Take Photo)
     - "აირჩიე გალერიიდან" (Choose from Gallery)

4. User selects/captures photo
   → Mascot replaced with photo preview
   → User fills in username + password
   → Clicks "შექმენი ანგარიში"

5. Account created successfully
   → Modal closes
   → User is logged in
```

---

## Technical Considerations

1. **Asset Import**: Uses existing `guest-welcome-avatar.mp4` mascot video
2. **Camera Hook**: Reuses existing `useCamera` hook for native/web camera access
3. **Video Component**: Reuses `SinglePlayVideo` for optimized video playback
4. **Popover**: Uses existing Radix Popover for upload options menu
5. **State Reset**: Photo selection resets when switching between sign-up/login modes

