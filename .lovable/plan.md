

# Add Login Option to Guest Welcome Panel

## Overview
Add the ability for existing users to log in from the home screen's guest panel, not just create a new account.

---

## Current Problem
- The GuestWelcomePanel only shows "შექმენი ანგარიში" (Create Account)
- Existing users cannot enter their email/password to log in
- Only registration flow is available

---

## Solution
Add a toggle between **Sign Up** and **Sign In** modes, similar to the existing Auth.tsx page.

---

## Technical Changes

### File: `src/components/home/GuestWelcomePanel.tsx`

#### 1. Add `onSignIn` prop to interface

```tsx
interface GuestWelcomePanelProps {
  onCreateAccount: (username: string, password: string) => Promise<void>;
  onSignIn: (email: string, password: string) => Promise<void>;  // NEW
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
  onPlayAsGuest: () => void;
  isLoading: boolean;
}
```

#### 2. Add state for mode toggle

```tsx
const [isSignUp, setIsSignUp] = useState(true); // true = Create Account, false = Login
```

#### 3. Update the input field

When in **Sign In mode**, show email field instead of username:

```tsx
<input
  type={isSignUp ? "text" : "email"}
  placeholder={isSignUp ? "სახელი" : "ელ. ფოსტა"}
  ...
/>
```

#### 4. Update the submit button

```tsx
<ChunkyButton type="submit" ...>
  {isSignUp ? (
    <>
      <Sparkles className="w-4 h-4" />
      შექმენი ანგარიში
    </>
  ) : (
    <>
      <Lock className="w-4 h-4" />
      შესვლა
    </>
  )}
</ChunkyButton>
```

#### 5. Update form submit handler

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // ...validation...
  
  if (isSignUp) {
    await onCreateAccount(username, password);
  } else {
    await onSignIn(username, password); // username holds email in login mode
  }
};
```

#### 6. Add toggle link below the button

```tsx
{/* Toggle between Sign Up and Sign In */}
<motion.p className="text-sm text-muted-foreground text-center mt-2">
  {isSignUp ? (
    <>
      უკვე გაქვს ანგარიში?{" "}
      <button 
        type="button" 
        onClick={() => setIsSignUp(false)}
        className="text-primary font-semibold hover:underline"
      >
        შედი
      </button>
    </>
  ) : (
    <>
      არ გაქვს ანგარიში?{" "}
      <button 
        type="button" 
        onClick={() => setIsSignUp(true)}
        className="text-primary font-semibold hover:underline"
      >
        შექმენი
      </button>
    </>
  )}
</motion.p>
```

#### 7. Update title dynamically

```tsx
<span className="font-slackey text-foreground font-black text-2xl">
  {isSignUp ? "გამარჯობა!" : "კეთილი იყოს შენი მობრუნება!"}
</span>
<p className="text-sm text-muted-foreground">
  {isSignUp 
    ? "შექმენი შენი პროფილი და ითამაშე უფასოდ!" 
    : "შედი შენს ანგარიშზე"}
</p>
```

---

### File: `src/pages/Index.tsx` (or parent component)

Pass the new `onSignIn` handler to GuestWelcomePanel:

```tsx
<GuestWelcomePanel
  onCreateAccount={handleCreateAccount}
  onSignIn={handleSignIn}  // NEW - calls signIn from useAuth
  onGoogleSignIn={handleGoogleSignIn}
  onAppleSignIn={handleAppleSignIn}
  onPlayAsGuest={handlePlayAsGuest}
  isLoading={loading}
/>
```

---

## Updated UI Flow

```text
+----------------------------------+
|      გამარჯობა!                  |  ← Changes to "კეთილი იყოს..." in login mode
|  შექმენი შენი პროფილი...         |
|                                  |
|      ╭───────────╮              |
|      │  [FACE]   │              |
|      ╰───────────╯              |
|                                  |
|  ┌──────────────────────────┐   |
|  │ 🙍 სახელი / ელ. ფოსტა     │   |  ← Placeholder changes based on mode
|  └──────────────────────────┘   |
|  ┌──────────────────────────┐   |
|  │ 🔒 პაროლი                 │   |
|  └──────────────────────────┘   |
|                                  |
|  ┌──────────────────────────┐   |
|  │   ✨ შექმენი / შესვლა    │   |  ← Button text changes
|  └──────────────────────────┘   |
|                                  |
|  უკვე გაქვს ანგარიში? შედი       |  ← Toggle link
|                                  |
|  ────────── ან ──────────       |
|       [G]    []               |
|                                  |
|  ან ითამაშე როგორც სტუმარმა    |
+----------------------------------+
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/home/GuestWelcomePanel.tsx` | Add `isSignUp` state, dynamic title/button/placeholder, toggle link, call appropriate handler |
| `src/pages/Index.tsx` (or parent) | Pass `onSignIn` prop that calls `signIn` from auth context |

