

# Show Login View for Returning Users

## Problem
The GuestWelcomePanel always starts in **signup mode** with 3 fields (username, email equivalent, password). When a returning user visits, they should see:
- "მობრძანდი!" (Welcome back!) title
- Only **2 fields**: Email + Password (no username)
- "შესვლა" button
- Option to switch to signup if they don't have an account

---

## Solution

### 1. Detect Returning Users
Store the user's email in localStorage after successful login or signup. When the component loads, check if this email exists to determine if the user is returning.

### 2. Hide Username Field in Sign-In Mode
The username field should only show when `isSignUp` is true. In sign-in mode, users enter their email/username and password only.

### 3. Default to Sign-In for Returning Users
If localStorage has a stored email from a previous session, initialize `isSignUp` as `false` (sign-in mode).

---

## Technical Changes

### File: `src/components/home/GuestWelcomePanel.tsx`

| Change | Description |
|--------|-------------|
| Check localStorage on mount | Look for `lastLoginEmail` to detect returning users |
| Initialize `isSignUp` based on returning status | `false` if returning, `true` otherwise |
| Conditionally render username field | Only show when `isSignUp === true` |
| Update placeholder text | In sign-in mode, show "ელფოსტა ან სახელი" (email or username) |

**Key code changes:**

```tsx
// Detect returning user on mount
const [isSignUp, setIsSignUp] = useState(() => {
  const lastEmail = localStorage.getItem('lastLoginEmail');
  return !lastEmail; // If no saved email, show signup; otherwise show login
});

// In the form, conditionally render username field:
{isSignUp && (
  <div className="relative">
    {/* Username input - only for signup */}
  </div>
)}

// Update the input placeholder for sign-in mode:
placeholder={isSignUp ? "სახელი" : "ელფოსტა ან სახელი"}
```

### Storage Logic
- After successful login/signup in the parent component, store the email:
  ```tsx
  localStorage.setItem('lastLoginEmail', email);
  ```
- This happens in the auth handlers, not in GuestWelcomePanel itself

---

## UI Changes

**Signup Mode (new users):**
```text
╭────────────────────────╮
│     გამარჯობა!         │
│  შექმენი შენი პროფილი   │
│      [Avatar 📷]       │
│  ┌──────────────────┐  │
│  │ 👤 სახელი        │  │  ← Username (signup only)
│  └──────────────────┘  │
│  ┌──────────────────┐  │
│  │ 🔒 პაროლი        │  │
│  └──────────────────┘  │
│  [ შექმენი ანგარიში ]  │
╰────────────────────────╯
```

**Sign-in Mode (returning users):**
```text
╭────────────────────────╮
│     მობრძანდი!         │
│  შედი შენს ანგარიშზე   │
│      [Avatar 📷]       │
│  ┌──────────────────┐  │
│  │ 👤 ელფოსტა       │  │  ← Email/username only
│  └──────────────────┘  │
│  ┌──────────────────┐  │
│  │ 🔒 პაროლი        │  │
│  └──────────────────┘  │
│  [      შესვლა      ]  │
╰────────────────────────╯
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/home/GuestWelcomePanel.tsx` | Detect returning users, conditionally show username field, default to login for returning users |

