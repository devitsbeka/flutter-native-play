
# Plan: Unify Avatar Creation to Use the Polished AvatarModal

## Problem

When users need to create an avatar (during signup or when they're missing an avatar), they see the old `AvatarCreationFlow` modal which has:
- No close/exit button
- Text touching edges
- Different design from the polished "შენი ავატარი" screen
- Inconsistent experience

## Solution

Replace the `AvatarCreationFlow` usage with the global `AvatarModal` system for all avatar creation scenarios.

---

## Technical Changes

### File 1: `src/contexts/OnboardingContext.tsx`

Remove the avatar-related steps from OnboardingStep type since we'll use the global AvatarModal instead:

**Lines 4-14** - Remove avatar steps from OnboardingStep type:
```tsx
export type OnboardingStep = 
  | "idle"
  | "welcome"
  | "username"
  | "password"
  | "creating"
  | "complete";
```

**Lines 27-30** - Remove avatar-related state from context type:
```tsx
// Remove these:
// uploadedImage: string | null;
// setUploadedImage: (image: string | null) => void;
// generatedAvatar: string | null;
// setGeneratedAvatar: (avatar: string | null) => void;
```

**Line 34** - Update `skipToAvatarCreation` to open the global AvatarModal instead of setting step:
- This function will be replaced with a trigger for the global avatar modal

---

### File 2: `src/pages/Index.tsx`

**Lines 222-224** - Update `handlePlay` to use global AvatarModal:

When user tries to play but has no avatar, open the AvatarModal instead of calling `skipToAvatarCreation()`:
```tsx
} else if (!profile?.avatar_url) {
  // Logged in but no avatar - open avatar modal
  openAvatarModal();
}
```

**Line 328** - Remove `<AvatarCreationFlow />` component since it's no longer used

---

### File 3: `src/components/onboarding/SignupOnboardingModal.tsx`

**Line 211** - After account creation, instead of going to `avatar-upload` step, complete the signup and let the user open the avatar modal:

```tsx
// After successful signup
setStep("complete");
// Optionally auto-open the avatar modal
openAvatarModal();
```

This component will need to import and use `useAvatarModal` hook.

---

### File 4: `src/contexts/AvatarModalContext.tsx`

No changes needed - this already provides the global modal.

---

### File 5: Delete `src/components/onboarding/AvatarCreationFlow.tsx`

This component will no longer be needed since all avatar creation flows through `AvatarModal`.

---

## Summary of Changes

| Action | File |
|--------|------|
| Modify | `src/contexts/OnboardingContext.tsx` - Remove avatar steps |
| Modify | `src/pages/Index.tsx` - Use openAvatarModal() instead of skipToAvatarCreation() |
| Modify | `src/components/onboarding/SignupOnboardingModal.tsx` - Complete signup, then open AvatarModal |
| Delete | `src/components/onboarding/AvatarCreationFlow.tsx` |

---

## User Experience After Changes

1. **New user signup** → Account created → "შენი ავატარი" modal opens (with close button, proper spacing)
2. **User tries to play without avatar** → "შენი ავატარი" modal opens
3. **User clicks their avatar anywhere** → "შენი ავატარი" modal opens (already works)
4. **All scenarios** → Same polished experience with selfie/upload working perfectly
