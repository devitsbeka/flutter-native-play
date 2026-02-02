

# Fix Mascot Avatar Display and Add Click-to-Upload

## Problems Identified

1. **Avatar shows feet instead of face**: The CSS transform `translateY(-15%)` is not correctly centering the mascot's face with the crown in the video. The video content structure means we need a different approach.

2. **No click interaction**: The avatar circle in the guest welcome panel doesn't respond to clicks - users can't tap it to upload/take a selfie for their avatar.

---

## Solution

### 1. Fix the Avatar Display

Instead of relying on video transforms (which haven't been working reliably), we'll use `object-position` CSS property on the video element itself to focus on the top portion where the face is located. This is more reliable for video content cropping.

Change from transform-based positioning to `object-position: center top` which will anchor the video to show the top portion (where the face and crown are).

### 2. Add Click-to-Upload Functionality

Make the avatar circle clickable and show a bottom sheet/modal with upload options:
- **Take Selfie** (camera) - for native platforms
- **Choose from Gallery** (upload)

This will use the existing `AvatarUploader` component which already has all the camera and gallery functionality implemented.

---

## Technical Changes

### File 1: `src/components/home/GuestWelcomePanel.tsx`

**Changes:**
1. Remove the wrapper div with transform - instead apply `object-position: center 20%` directly to the video container to crop from top
2. Add state for showing an upload options sheet
3. Make the avatar container clickable with proper cursor and onClick handler
4. Add a small camera icon overlay to hint it's tappable
5. Import and use a simple bottom sheet for upload options (Camera/Gallery)

```text
Before:
┌─────────────────────────┐
│  Non-clickable avatar   │
│  showing wrong portion  │
└─────────────────────────┘

After:
┌─────────────────────────┐
│  Clickable avatar       │  ← Tap to open options
│  showing face + crown   │
│  📷 (camera icon hint)  │
└─────────────────────────┘
         ↓ on click
┌─────────────────────────┐
│  📸 Take Selfie         │
│  🖼️ Choose Photo        │
└─────────────────────────┘
```

### Implementation Details

1. **Video positioning fix**:
   - Remove the transform wrapper div
   - Use `style={{ objectPosition: 'center 20%' }}` on PingPongVideo to show the top portion
   - Increase scale slightly if needed to fill the circle

2. **Click handler**:
   - Add `onClick` to the avatar container
   - Toggle a state `showUploadOptions` 
   - Show a simple sheet/popover with two buttons

3. **Upload options sheet**:
   - Use the existing `useCamera` hook for camera/gallery functionality
   - Show "Take Selfie" button (camera icon) - works on native
   - Show "Choose Photo" button (gallery/upload)
   - After photo selection, user can preview and potentially generate AI avatar later (after signup)

4. **Selected photo preview**:
   - If user selects a photo, show it instead of the mascot video
   - Store the photo URL in state to use after account creation

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/home/GuestWelcomePanel.tsx` | Fix video positioning with object-position, add click handler, add upload options sheet, add camera icon overlay |

---

## User Experience Flow

1. User sees mascot avatar with face and crown visible
2. Small camera badge hints it's tappable
3. User taps avatar → bottom sheet appears with options
4. User chooses "Take Selfie" or "Choose Photo"
5. Selected photo replaces mascot video in the avatar circle
6. Photo is stored temporarily until account creation
7. After signup, photo becomes their profile avatar

