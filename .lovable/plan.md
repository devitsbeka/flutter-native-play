

## Auto-Generate AI Avatar on Admin Photo Upload

### What Changes

When an admin uploads a photo for a mascot/fake account via the "ავატარი" button in the profile modal, the system will automatically send that photo through the AI avatar generator (the existing `generate-avatar` backend function) to create a semi-realistic 3D rendered avatar with the lavender background -- instead of saving the raw photo.

### How It Works

```text
Admin uploads photo
       |
       v
Photo uploaded to storage (temporary)
       |
       v
Get public URL of uploaded photo
       |
       v
Call generate-avatar backend function with that URL
       |
       v
Receive AI-generated avatar (base64)
       |
       v
Upload AI result to storage (overwrite)
       |
       v
Update profile with final AI avatar URL
```

### Technical Details

**File: `src/components/profile/PlayerProfileModal.tsx`**

Modify the `handleAvatarUpload` function (lines 169-205):

1. After uploading the raw photo to storage and getting the public URL, call the `generate-avatar` edge function with that URL
2. Take the returned base64 AI-generated image, convert it to a blob
3. Upload the AI-generated image back to storage (overwriting the original)
4. Update the profile with the final URL
5. Show appropriate loading state ("Generating AI avatar..." instead of just uploading)
6. Handle errors gracefully -- if AI generation fails, fall back to the original photo with a warning toast

The flow reuses the existing `generate-avatar` backend function which already has the correct prompt and model configuration for the semi-realistic 3D style with lavender background.

**Loading UX**: The upload button will show a spinner with text indicating AI generation is in progress, since the AI step takes a few seconds longer than a simple upload.

### Files Changed

| File | Change |
|------|--------|
| `src/components/profile/PlayerProfileModal.tsx` | Add AI generation step after photo upload in `handleAvatarUpload` |

