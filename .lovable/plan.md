
# Unified Guest Welcome Screen with Video Avatar + Sign In

## Overview
Redesign the guest first screen on the home page to combine:
1. **New animated video avatar** playing in the circle placeholder (replacing current static guest avatar)
2. **Inline sign-in form** with username + password fields
3. **Social login options** (Google + Apple) 
4. **Responsive layout** that works from small mobile to large desktop without cropping or edge touching

This creates a single, engaging welcome experience that reduces friction by allowing sign-in directly on the home screen.

---

## Visual Layout

```text
+----------------------------------+
|        გამარჯობა! (Hi!)          |
|  შექმენი შენი პროფილი...         |
|                                  |
|      ╭─────────────────╮         |
|      │   [VIDEO AVA]   │  ← New animated video
|      │  (looping MP4)  │
|      ╰─────────────────╯         |
|                                  |
|  ┌────────────────────────────┐  |
|  │ 🙍 სახელი (Username)       │  |
|  └────────────────────────────┘  |
|  ┌────────────────────────────┐  |
|  │ 🔒 პაროლი (Password)       │  |
|  └────────────────────────────┘  |
|                                  |
|  ┌────────────────────────────┐  |
|  │   ✨ შექმენი ანგარიში      │  ← Primary CTA
|  └────────────────────────────┘  |
|                                  |
|  ────────── ან ──────────        |
|                                  |
|  [G] გააგრძელე Google-ით        |
|  [] გააგრძელე Apple-ით          |
|                                  |
|  ─────────────────────────────   |
|  ან ითამაშე როგორც სტუმარმა     |
|        ↓ (arrow to play)         |
+----------------------------------+
```

---

## Technical Implementation

### 1. Copy New Video Asset to Project

Copy the uploaded video to `src/assets/`:
```
user-uploads://social_u2355245691_...mp4 → src/assets/guest-welcome-avatar.mp4
```

### 2. Create New Component: `GuestWelcomePanel.tsx`

A new component that consolidates all guest welcome UI:

**Location:** `src/components/home/GuestWelcomePanel.tsx`

**Features:**
- Animated video avatar (looping) with the same circular frame styling as `AvatarCircle`
- Username + Password input fields (styled like the signup modal)
- "Create Account" primary button
- Google and Apple OAuth buttons (matching Auth.tsx styling)
- "Or play as guest" text with arrow pointing to play button
- Full viewport responsiveness with safe padding

**Props:**
```tsx
interface GuestWelcomePanelProps {
  onCreateAccount: (username: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
  isLoading: boolean;
}
```

### 3. Modify `Index.tsx` - Guest Layout

Replace the current guest UI sections (mobile, tablet, desktop) with the new `GuestWelcomePanel` component.

**Key changes:**
- Import new `guest-welcome-avatar.mp4` 
- Import `GuestWelcomePanel` component
- Add sign-up handlers that integrate with `signUpWithUsername` from `useAuth`
- Handle OAuth flows with `signInWithGoogle` and `signInWithApple`
- Pass loading state for button disabled states

**Layout adjustments by breakpoint:**
- **Mobile (< md)**: Smaller avatar (180px), compact spacing, stacked layout
- **Tablet (md-xl)**: Medium avatar (220px), comfortable spacing
- **Desktop (xl+)**: Larger avatar (260px), generous spacing

### 4. Video Avatar Component Logic

The video component will:
- Auto-play on load (muted, looping)
- Have the same circular frame styling as existing `AvatarCircle`
- Use ping-pong playback for smooth looping (similar to `AnimatedAvatar`)
- Be sized responsively based on viewport

```tsx
// Video avatar sizing by breakpoint
const avatarSizes = {
  mobile: 180,   // < 640px
  tablet: 220,   // 640px - 1024px  
  desktop: 260,  // > 1024px
};
```

### 5. Responsive Container

The panel uses a flexible container that:
- Has `max-w-sm` (24rem / 384px) for form elements
- Uses `px-4` minimum padding on mobile
- Uses `px-6` on larger screens
- Accounts for safe-area-inset on mobile
- Centers content vertically with `flex-1` and `justify-center`
- Never allows content to touch edges

```tsx
<div className="flex flex-col items-center w-full max-w-sm mx-auto px-4 sm:px-6 py-6 safe-area-inset">
  {/* Content never touches edges */}
</div>
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/home/GuestWelcomePanel.tsx` | New unified guest welcome component with video avatar + auth forms |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Replace guest UI sections with GuestWelcomePanel, add auth handlers |
| (Copy) `guest-welcome-avatar.mp4` | Copy uploaded video to `src/assets/` |

---

## Viewport Safety Guarantees

The layout ensures no content is cropped or touches edges:

1. **Container constraints**: `max-w-sm` (384px) prevents horizontal overflow
2. **Horizontal padding**: `px-4` (16px) minimum on all sides
3. **Vertical padding**: `py-6` (24px) minimum top/bottom
4. **Safe area**: `safe-area-inset-bottom` for iOS home indicator
5. **Scroll safety**: `overflow-y-auto` if content exceeds viewport
6. **Centered layout**: `items-center justify-center` for all breakpoints

---

## Form Validation

Using same validation as `SignupOnboardingModal`:

```tsx
// Username: 3+ chars, alphanumeric + Georgian + underscore
const validateUsername = (value: string): string | undefined => {
  if (!value.trim()) return "სახელი საჭიროა";
  if (value.length < 3) return "მინ. 3 სიმბოლო";
  if (!/^[a-zA-Z0-9_\u10A0-\u10FF]+$/.test(value)) {
    return "მხოლოდ ასოები, ციფრები და _";
  }
  return undefined;
};

// Password: 6+ chars
const validatePassword = (value: string): string | undefined => {
  if (!value) return "პაროლი საჭიროა";
  if (value.length < 6) return "მინ. 6 სიმბოლო";
  return undefined;
};
```

---

## UI Component Styling

### Input Fields
Match existing chunky input style from `SignupOnboardingModal`:
```tsx
className="w-full px-5 py-4 rounded-2xl bg-background border-4 border-border 
           focus:border-primary outline-none text-lg font-medium text-center"
style={{ boxShadow: "0 4px 0 hsl(var(--border))" }}
```

### Primary Button
Use existing `ChunkyButton` component:
```tsx
<ChunkyButton variant="primary" size="lg" className="w-full">
  <Sparkles className="w-5 h-5" />
  შექმენი ანგარიში
</ChunkyButton>
```

### OAuth Buttons
Match Auth.tsx styling - white background, gray border, brand icons:
```tsx
className="w-full h-14 rounded-2xl bg-white border border-gray-200 shadow-sm 
           flex items-center justify-center gap-3 text-gray-700 font-medium"
```

---

## Animation Details

### Video Avatar
- Plays automatically on component mount
- Loops continuously (muted)
- Has subtle floating animation like existing avatars:
  ```tsx
  animate={{ y: [0, -8, 0] }}
  transition={{ duration: 4, repeat: Infinity }}
  ```

### Form Entry
- Staggered fade-in animation for form elements:
  ```tsx
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2 + index * 0.1 }}
  ```

---

## Error Handling

- Inline error messages below inputs (same as current modals)
- Toast notifications for API errors
- Loading state disables all buttons during submission
- OAuth errors show toast with localized messages
