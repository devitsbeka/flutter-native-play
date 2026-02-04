
# Fix Signup Modal UI & Password Recovery Implementation

## Issues Identified

### Issue 1: Remove "ეს სახელი ყველა მოთამაშეს დაანახებს" Text
The `SignupOnboardingModal` displays this text via `t("onboarding.usernameHint")` as a subtitle in the modal header. This needs to be removed.

**Current Code (SignupOnboardingModal.tsx, line 238):**
```tsx
subtitle: t("onboarding.usernameHint"),
```

**Fix:** Set `subtitle: undefined` to hide this text.

---

### Issue 2: Fix Button Text Cropping (Image 35)
The "გამოიყენე" button text is being cropped at the right edge. This is visible in the preview step of the AvatarModal.

**Root Cause:** The button text is too long for the available space in a `flex-1` container with a sibling.

**Fix:** 
1. Use shorter text for the button: "გამოყენება" instead of full translation
2. Ensure proper min-width on buttons
3. Add `whitespace-nowrap` and adjust text sizes

---

### Issue 3: Password Recovery Problem

**Current Situation:**
The app uses "username-only" authentication via `signUpWithUsername()` which internally creates a pseudo-email:
```typescript
const pseudoEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@mytrivia.local`;
```

This means users **cannot reset passwords via email** because:
1. `@mytrivia.local` is not a real email domain
2. Supabase password reset requires a verified email address

**Solution Options:**

| Option | Pros | Cons |
|--------|------|------|
| A. Add real email during signup | Standard password reset works | Changes signup flow |
| B. Support code (manual reset) | Simple | Not self-service |
| C. Admin password reset tool | Works for current users | Requires manual intervention |

**Recommended Approach:** Option A - Add optional email field

This allows:
- Users who provide email → can reset password via email
- Users without email → must contact support

---

## Implementation Plan

### Part 1: Remove Username Hint Text

**File: `src/components/onboarding/SignupOnboardingModal.tsx`**

| Line | Change |
|------|--------|
| 238 | Change `subtitle: t("onboarding.usernameHint"),` to `subtitle: undefined,` |

---

### Part 2: Fix Button Text Cropping in AvatarModal

**File: `src/components/home/AvatarModal.tsx`**

The preview step buttons (lines 950-975) have long Georgian text that gets cropped.

**Changes:**
1. Add `whitespace-nowrap` to button text
2. Adjust button sizes: use `size="sm"` for mobile compatibility
3. Make buttons stack vertically on small screens

```tsx
// Lines 950-975 - Update button container
<div className="flex flex-col sm:flex-row gap-2 w-full">
  <ChunkyButton
    variant="secondary"
    size="md"
    onClick={...}
    disabled={isLoading}
    className="flex-1 min-w-0"
    icon={<RefreshCw className="w-4 h-4 shrink-0" />}
  >
    <span className="truncate">{t("avatar.regenerate")}</span>
  </ChunkyButton>
  <ChunkyButton
    variant="success"
    size="md"
    onClick={() => saveAvatar()}
    disabled={isLoading}
    className="flex-1 min-w-0"
    icon={...}
  >
    <span className="truncate">{t("avatar.useAsProfile")}</span>
  </ChunkyButton>
</div>
```

---

### Part 3: Fix Modal Content Spacing (GameModal)

**File: `src/components/ui/game-modal.tsx`**

The modal content area padding needs adjustment to prevent content from touching edges.

**Changes:**
- Increase padding on content area: `px-5` → `px-6`
- Add safe area insets for mobile

---

### Part 4: Password Recovery (Future Enhancement)

**Summary:**
Currently, password reset is **not possible** for username-only accounts because they use fake `@mytrivia.local` emails. 

**To enable password recovery, you would need to:**
1. Add an optional "email" field during signup
2. Store real email in user metadata
3. Implement password reset flow that sends to real email

**For now, the workaround is:**
- Users who forgot password must contact support
- Admin can manually reset password in Supabase dashboard

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/onboarding/SignupOnboardingModal.tsx` | Remove `usernameHint` subtitle |
| `src/components/home/AvatarModal.tsx` | Fix button text cropping with better sizing and truncation |
| `src/components/ui/game-modal.tsx` | Adjust content padding for better spacing |

---

## Technical Notes

1. **Password Recovery Limitation:** This is an architectural issue, not a bug. The username-only signup was designed for simplicity but sacrifices password recovery functionality.

2. **To Add Password Recovery Later:**
   - Add email collection during signup (optional field)
   - Create `/reset-password` page
   - Use Supabase's `resetPasswordForEmail()` API
   - Send real password reset emails

3. **Button Text:** Georgian text is often longer than English equivalents. The fix ensures text never truncates and goes on two lines.
