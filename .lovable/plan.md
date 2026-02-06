

# Guest Welcome Flow Redesign

## Overview

Replace the current login/signup form for first-time guests on mobile with a 3-step experience:

1. **Guest Home Screen** -- Show the mascot avatar with "სტუმარი" (Guest) username, mimicking the logged-in user layout
2. **Benefits Modal** -- When any interactive element is tapped, show a beautiful card modal with account benefits and a "დავიწყოთ!" CTA
3. **Enhanced Signup Form** -- Redesigned with smaller fonts, User/Lock icons before fields, and a security question + answer section

## Changes Summary

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Replace mobile `GuestWelcomePanel` with mascot avatar + "სტუმარი" view; add state for `GuestSignupPromptModal`; wire avatar/button clicks to open it |
| `src/components/home/GuestSignupPromptModal.tsx` | **NEW** -- Card modal with game controller icon, benefits rows, and "დავიწყოთ!" button |
| `src/components/onboarding/SignupOnboardingModal.tsx` | Add User/Lock icons inside inputs, reduce font sizes, add security question select + answer field, save security data on signup |

## Technical Details

### 1. Index.tsx -- Guest Mobile View

**Current behavior (lines 546-562):** On mobile, guests see the full `GuestWelcomePanel` component with login/signup forms, OAuth buttons, and "play as guest" option.

**New behavior:** Replace with a view that mirrors the logged-in user layout:
- Show `AvatarCircle` with `defaultGuestAvatar` / `defaultGuestAvatarAnimated`, `hideStats={true}`
- Below avatar: "სტუმარი" as the username text (same styling as logged-in user nickname)
- Below name: Coins (0) and Gems (0) display using the same `CurrencyPill`-style layout
- Below that: "ან ითამაშე როგორც სტუმარმა" with `HandDrawnArrow` pointing down to play button
- When guest clicks on the avatar or on any locked feature (power-ups, etc.), open `GuestSignupPromptModal`
- Add `showGuestSignupPrompt` state variable
- The play button in the bottom nav still works for guest play (limited games)

### 2. GuestSignupPromptModal.tsx (New File)

A non-fullscreen card modal using the existing `GameModal` component with `fullScreen={false}`:
- **Icon:** Game controller emoji ("🎮") in a purple circle badge at the top
- **Title:** "შექმენი ანგარიში და გააგრძელე თამაში" (bold, centered)
- **Floating sparkle decorations** using `showStars={true}` and `showSparkles={true}`
- **Three benefit rows** with colored pill backgrounds and icons:
  - Purple row: Sparkles icon + "შექმენი ანიმირებული ავატარი"
  - Green row: Trophy icon + "შეინახე პროგრესი"
  - Blue row: Lock icon + "გახსენი ყველა ფუნქცია"
- **CTA button:** "დავიწყოთ!" with Sparkles icon (uses `ChunkyButton` variant="success")
- **Close button:** X in top-right corner (built into GameModal)
- On CTA click: close this modal and call `startOnboarding()` from `OnboardingContext` to launch `SignupOnboardingModal`

### 3. SignupOnboardingModal.tsx -- Enhanced Signup Form

**Input field changes:**
- Reduce font size from `text-lg` to `text-base` on both username and password inputs
- Add `User` icon (from lucide-react, already imported) on the left side of username input using `pl-12` padding and absolute positioning
- Add `Lock` icon (from lucide-react) on the left side of password input using `pl-12` padding and absolute positioning
- Change `text-center` alignment to `text-left` since icons are on the left

**Security question section (new, added below password):**
- A styled `<select>` dropdown for choosing a security question from the 5 predefined Georgian questions (imported from `ForgotPassword.tsx` via the exported `SECURITY_QUESTIONS`)
- A text input for the security answer, with a small shield/key icon on the left
- Both fields use the same rounded-2xl chunky visual style but slightly smaller (`py-3` instead of `py-4`)
- New state variables: `securityQuestionId` (number | null) and `securityAnswer` (string)
- Validation: both security question and answer are required (non-empty)

**Signup flow update:**
- After successful `signUpWithUsername()`, hash the security answer using the same SHA-256 approach used in `reset-password-with-security` edge function (Web Crypto API in browser)
- Update the user's profile with `security_question_id` and `security_answer_hash` using a direct Supabase update
- This happens before `completeOnboarding()` is called

### Flow Diagram

```text
Guest arrives at /
       |
       v
[Avatar + "სტუმარი" view]
  - Mascot avatar (same as logged-in layout)
  - Username: სტუმარი
  - Coins: 0, Gems: 0
  - "ან ითამაშე როგორც სტუმარმა" + arrow
       |
  (clicks avatar / locked feature)
       |
       v
[GuestSignupPromptModal]  (card modal)
  - Game controller icon
  - "შექმენი ანგარიში და გააგრძელე თამაში"
  - 3 benefit rows (purple/green/blue)
  - "დავიწყოთ!" button
       |
  (clicks "დავიწყოთ!")
       |
       v
[SignupOnboardingModal - enhanced]
  - User icon + Username input (smaller text)
  - Lock icon + Password input (smaller text)
  - Security question dropdown
  - Security answer input
  - "შექმენი ანგარიში" button
       |
  (creates account + saves security Q&A)
       |
       v
[Account created -> Avatar modal opens]
```

### Existing Login Access

Login for returning users remains accessible from:
- The `/auth` route directly
- The side menu (settings)
- A small "უკვე გაქვს ანგარიში? შესვლა" link at the bottom of the signup modal (already exists, navigates to `/auth`)

