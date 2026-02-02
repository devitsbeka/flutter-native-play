
# Fix Login to Support Both Email and Username

## Problem Identified

When clicking "შესვლა" (Sign in) with email `marianakapanadze92@gmail.com`, the login fails with "Invalid login credentials".

**Root Cause:** The `handleGuestSignIn` function in `Index.tsx` always uses `signInWithUsername()` which converts the input to a pseudo-email:

```text
Input: marianakapanadze92@gmail.com
Converted to: marianakapanadze92gmailcom@mytrivia.local  ← WRONG!
```

The user registered with their **real email** (via Google OAuth), so the pseudo-email doesn't exist.

---

## Solution

Update `handleGuestSignIn` in `Index.tsx` to detect if the input is an email or username, then use the appropriate authentication method:

- **If input contains `@`** → Use `signIn()` (real email auth)
- **If input is plain username** → Use `signInWithUsername()` (pseudo-email auth)

---

## Technical Changes

### File: `src/pages/Index.tsx`

**Current code (lines 270-278):**
```tsx
const handleGuestSignIn = useCallback(async (username: string, password: string) => {
  setIsAuthLoading(true);
  try {
    const { error } = await signInWithUsername(username, password);
    if (error) throw error;
  } finally {
    setIsAuthLoading(false);
  }
}, [signInWithUsername]);
```

**Updated code:**
```tsx
const handleGuestSignIn = useCallback(async (usernameOrEmail: string, password: string) => {
  setIsAuthLoading(true);
  try {
    // Detect if input is an email (contains @) or username
    const isEmail = usernameOrEmail.includes('@');
    
    let error;
    if (isEmail) {
      // Real email - use standard signIn
      const result = await signIn(usernameOrEmail, password);
      error = result.error;
      if (!error) {
        // Store email for "returning user" detection
        localStorage.setItem('lastLoginEmail', usernameOrEmail);
      }
    } else {
      // Username - use pseudo-email signIn
      const result = await signInWithUsername(usernameOrEmail, password);
      error = result.error;
    }
    
    if (error) throw error;
  } finally {
    setIsAuthLoading(false);
  }
}, [signIn, signInWithUsername]);
```

### Changes Required:
1. Add `signIn` to the destructured auth methods from `useAuth()`
2. Check if input contains `@` to determine auth method
3. Store email in localStorage on successful email login

---

## Flow After Fix

```text
User enters: marianakapanadze92@gmail.com

↓ contains '@'? YES

→ Use signIn("marianakapanadze92@gmail.com", password)
→ Authenticates with real email ✓
→ Store in localStorage for "returning user" feature ✓
```

```text
User enters: player123

↓ contains '@'? NO

→ Use signInWithUsername("player123", password)  
→ Converts to player123@mytrivia.local internally
→ Authenticates with pseudo-email ✓
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Update `handleGuestSignIn` to detect email vs username and use appropriate auth method |
