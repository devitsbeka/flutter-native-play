

# Fix: Allow Username-Only Login on Auth Page

## Problem
The auth page (`/auth`) requires an email with '@' symbol, but the app is designed to support **username-only** login. When you enter "Mascot" as a username, the browser shows "Please include an '@' in the email address".

## Root Cause
1. The email input uses `type="email"` which triggers browser validation
2. Zod validation schema requires `z.string().email()` format
3. The page only uses `signIn()` instead of also supporting `signInWithUsername()`

## Solution
Update the Auth page to accept both username and email (like Index.tsx does):

---

## Technical Changes

### File: `src/pages/Auth.tsx`

#### 1. Change input type from `email` to `text`
```tsx
// Before (line 284)
type="email"

// After
type="text"
```

#### 2. Update Zod validation for sign-in
```tsx
// Before (lines 39-42)
const signInSchema = z.object({
  email: z.string().email(t("auth.invalidCredentials")),
  password: z.string().min(1, t("auth.passwordRequired")),
});

// After - allow username or email
const signInSchema = z.object({
  email: z.string().min(1, t("auth.invalidCredentials")),
  password: z.string().min(1, t("auth.passwordRequired")),
});
```

#### 3. Import `signInWithUsername` from useAuth
```tsx
// Before (line 28)
const { signIn, signUp, signInWithApple, signInWithGoogle, user } = useAuth();

// After
const { signIn, signInWithUsername, signUp, signInWithApple, signInWithGoogle, user } = useAuth();
```

#### 4. Handle both username and email in sign-in logic
```tsx
// Before (lines 141-148)
const { error } = await signIn(email, password);

// After - check if it's email or username
const isEmail = email.includes('@');
let result;
if (isEmail) {
  result = await signIn(email, password);
} else {
  result = await signInWithUsername(email, password);
}
const { error } = result;
```

#### 5. Update placeholder text
```tsx
// Before (line 285)
placeholder="you@example.com"

// After - indicate both options
placeholder="username or email"
```

#### 6. Update label (optional)
Change "ელფოსტა" (email) to something like "მომხმარებელი ან ელფოსტა" (username or email)

---

## Summary of Changes
| What | Change |
|------|--------|
| Input type | `email` -> `text` |
| Validation | Remove email format requirement for login |
| Auth method | Use `signInWithUsername()` for usernames without '@' |
| Placeholder | Update to show both options |

This mirrors the existing pattern in `Index.tsx` (lines 275-296) which already handles this correctly.

