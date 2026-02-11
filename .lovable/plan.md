
## Open Up Guest Experience + Netflix-Style Returning User Screen

This is a 3-part feature that removes friction from the guest-to-user funnel and adds a polished returning user experience.

---

### Part 1: Open Guest Experience (Play 3 Games Freely)

Currently, guests land on the home screen and see a login-first layout with a small "play as guest" prompt at the bottom. Instead, we'll flip this -- guests land directly into the full app experience (avatar, play button, everything) and can play up to 3 games. After 3 games, we show the registration modal.

**Changes:**
- **`src/pages/Index.tsx`**: Remove the guest auth wall. Guests see the same home screen as logged-in users (with the mascot avatar, play button visible and prominent). The "Sign In" and "Registration" buttons move to a subtle top-right corner or side menu instead of being the centerpiece.
- **`src/hooks/useGuestPlays.ts`**: Already supports 3 guest plays -- no changes needed.
- **`src/pages/Game.tsx`**: Already checks guest play limits and shows `GuestMaxPlaysModal` -- no changes needed.
- **`src/components/home/GuestMaxPlaysModal.tsx`**: After 3 plays, this modal already appears asking to register. We'll make the registration flow inside it even simpler (see Part 2).

### Part 2: Dead-Simple Registration From the Modal

When guests hit 3 plays and see the "register to continue" modal, registration should be as frictionless as possible.

**Changes:**
- **`src/components/home/GuestMaxPlaysModal.tsx`**: Add an inline registration form directly inside the modal -- just username + password + "Create Account" button, plus Google/Apple OAuth buttons. No need to navigate to `/auth` page at all.
- The form calls `signUpWithUsername()` directly, so users type a name, a password, tap one button, and they're in.
- Social login buttons (Google/Apple) are shown prominently as the fastest path.
- After successful registration, the modal closes and the user can keep playing immediately.

### Part 3: Netflix-Style Returning User Screen

When a previously logged-in user returns and their session has expired, instead of showing a blank login form, we show a Netflix-style account picker with their saved avatar and name.

**Changes:**
- **New file: `src/components/auth/ReturningUserPicker.tsx`**: A full-screen component showing:
  - The user's avatar (circular, large) with their nickname below it
  - Tapping the avatar shows a password input field to sign back in
  - A dotted-circle with a "+" icon next to it labeled "Add User" that navigates to the standard `/auth?mode=signup` page
  - Dark/gradient background for the Netflix feel
  
- **`src/pages/Auth.tsx`**: Before showing the login form, check localStorage for saved user data (`lastLoggedInUser`). If found and no active session, show the `ReturningUserPicker` instead of the default form.

- **`src/contexts/AuthContext.tsx`**: On successful login, save `{ nickname, avatar_url, email_or_username }` to localStorage under `lastLoggedInUser`. On sign-out, do NOT clear this data (so it persists for the Netflix screen).

---

### Technical Details

**localStorage keys used:**
- `mytrivia_guest_plays` (existing) -- tracks guest game count
- `mytrivia_last_user` (new) -- stores `{ nickname, avatar_url, identifier }` for the returning user screen
- `lastLoginEmail` (existing) -- already used for returning user detection

**Files to create:**
| File | Purpose |
|------|---------|
| `src/components/auth/ReturningUserPicker.tsx` | Netflix-style account picker with avatar, name, password input, and "+ Add User" |

**Files to modify:**
| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Remove guest auth wall -- guests see the full home screen with play button |
| `src/components/home/GuestMaxPlaysModal.tsx` | Add inline username+password signup form + social login buttons directly in the modal |
| `src/pages/Auth.tsx` | Check for saved user data and show `ReturningUserPicker` when session is expired |
| `src/contexts/AuthContext.tsx` | Save user profile data to localStorage on login for the returning user screen |

**No database changes required** -- everything uses existing auth methods and localStorage.
