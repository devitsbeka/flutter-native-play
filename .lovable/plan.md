

## Make Sign-Up Username-Only (Remove Email Requirement)

### Problem
The sign-up form currently requires users to enter an email address, but the app uses a **username-only architecture** where pseudo-emails (`username@mytrivia.local`) are generated internally. The sign-in form already accepts username or email, but sign-up still demands a real email.

### Changes

**File: `src/pages/Auth.tsx`**

1. **Remove the email field during sign-up**: The email input should only appear for sign-in. During sign-up, the user only enters username + password.

2. **Update the sign-up validation schema**: Replace the `email` field requirement with a `nickname` (username) validation:
   - Username: 2-20 characters, required
   - Password: min 6 characters

3. **Switch sign-up to use `signUpWithUsername(nickname, password)`** instead of `signUp(email, password, nickname)`. This generates the pseudo-email internally.

4. **Update the sign-in field**: For sign-in mode, change the label and icon to use a `User` icon instead of `Mail`, since users primarily sign in with their username. Keep the field accepting both username and email.

5. **Update the form layout**: During sign-up, only show:
   - Username field (existing nickname field)
   - Password field
   
   During sign-in, show:
   - Username / Email field (existing, already works)
   - Password field

### Technical Details

- **Validation**: The `signUpSchema` changes from requiring `z.string().email()` for `email` to just `z.string().min(2).max(20)` for `nickname`.
- **API call**: Line 107 changes from `signUp(email, password, nickname)` to `signUpWithUsername(nickname, password)`.
- **Tracking**: Update analytics tracking from `'email'` to `'username'` for sign-up events.
- **Referral flow**: Referral processing after sign-up remains unchanged (it uses `data.user.id`).
- The `email` state variable is still used for the sign-in field (where it can be username or email).

