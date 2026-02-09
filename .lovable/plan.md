

## Two Changes

### 1. Translate "Failed to lookup user" error

The raw English error from the authentication backend ("Failed to lookup user") is shown to users when they try to sign in with a non-existent account. This happens in multiple components that display `err?.message` directly.

**Fix**: Replace all raw error message displays with a Georgian translation. The error means the user doesn't exist, so the appropriate message is something like: "მომხმარებელი ვერ მოიძებნა" (User not found).

**Files to update:**
- `src/components/home/GuestWelcomePanel.tsx` (line 81)
- `src/components/home/DesktopGuestSplitLayout.tsx` (line 83)
- `src/components/shared/AuthRequiredModal.tsx` (lines 112, 141)

In each of these, instead of showing `err?.message` or `error.message`, we will check if the message contains "Failed to lookup user" or "Invalid login credentials" and show a translated Georgian message instead.

### 2. Move Registration link to be more prominent on Auth page

Currently the "არ გაქვს ანგარიში? რეგისტრაცია" toggle is at the very bottom of the Auth page (after Google and Apple buttons). Users who don't have accounts miss it and keep trying to sign in.

**Fix**: Move the sign-up/sign-in toggle to appear right after the main "შესვლა" button (before the social login divider), making it much more visible.

**File to update:**
- `src/pages/Auth.tsx` -- move the toggle block (lines 383-403) to right after the submit button (after line 332), and remove it from the bottom. Also make the registration link slightly larger/bolder so it stands out.

### Technical Details

A helper function will be added to translate common auth errors:

```typescript
const translateAuthError = (message: string): string => {
  if (message.includes("Failed to lookup user") || message.includes("Invalid login credentials")) {
    return "მომხმარებელი ვერ მოიძებნა. გაქვს ანგარიში?";
  }
  if (message.includes("already registered")) {
    return "ეს სახელი უკვე დაკავებულია";
  }
  return "შეცდომა, სცადე თავიდან";
};
```

This will be used in all 3 components instead of raw error messages.
