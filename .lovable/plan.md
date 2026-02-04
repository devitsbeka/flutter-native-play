

# Plan: Centered Single-Column Layout with Play Button

## Current State

The desktop guest view shows a **split layout** with:
- **Left side**: Auth form (mascot + login/signup)
- **Right side**: "სტუმრის რეჟიმი" guest mode card with limitations and "ითამაშე როგორც სტუმარი" button

## Requested Changes

1. Remove the right-side guest mode panel completely
2. Add "ითამაშე" button with 5/5 badge below the auth form
3. Center all elements in a single column

## Visual Comparison

**Current Layout:**
```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│    [გამარჯობა!]              [სტუმრის რეჟიმი]          │
│    [  Mascot  ]              ┌──────────────────┐       │
│                              │ • 3 თამაში დღეში │       │
│    [სახელი input]            │ • პროგრესი...    │       │
│    [პაროლი input]            │ • შეზღუდული...   │       │
│    [შექმენი ანგარიში]        │                  │       │
│                              │ [ითამაშე სტუმარი]│       │
│    ან                        └──────────────────┘       │
│    [G] [🍎]                                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**New Layout:**
```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                     [გამარჯობა!]                        │
│                     [  Mascot  ]                        │
│                                                         │
│                   [სახელი input]                        │
│                   [პაროლი input]                        │
│                   [შექმენი ანგარიში]                    │
│                                                         │
│                          ან                             │
│                       [G] [🍎]                          │
│                                                         │
│                       ─────────                         │
│                                                         │
│                      ┌─ 5/5 ─┐                          │
│                   ▶  ითამაშე   ← Green chunky button    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Implementation Details

**File: `src/components/home/DesktopGuestSplitLayout.tsx`**

### Key Changes

1. **Remove 2-column grid**: Change from `grid grid-cols-2` to single-column `flex flex-col items-center`

2. **Remove entire right side panel**: Delete the second `<motion.div>` containing "სტუმრის რეჟიმი"

3. **Add Play Button section**: After the OAuth buttons, add a divider and the `DesktopPlayButtonLarge` component

4. **Pass required props**: The component already receives `onPlayAsGuest`, but needs to accept plays data for the badge

### Props Changes

Add new props to `DesktopGuestSplitLayoutProps`:
```typescript
interface DesktopGuestSplitLayoutProps {
  // ... existing props
  guestPlaysRemaining?: number;
  maxGuestPlays?: number;
}
```

### Component Structure

```tsx
export function DesktopGuestSplitLayout({
  // ... existing props
  guestPlaysRemaining = 3,
  maxGuestPlays = 3,
}: DesktopGuestSplitLayoutProps) {
  return (
    <div className="w-full max-w-md mx-auto px-6 py-8">
      <div className="flex flex-col items-center">
        
        {/* Title: გამარჯობა! */}
        {/* Avatar with mascot */}
        {/* Auth form (inputs + submit) */}
        {/* Toggle sign-up/sign-in */}
        {/* Divider */}
        {/* OAuth buttons */}
        
        {/* NEW: Divider before play button */}
        <div className="w-full max-w-xs my-6 border-t border-border/50" />
        
        {/* NEW: Play button with badge */}
        <DesktopPlayButtonLarge
          onClick={onPlayAsGuest}
          playsRemaining={guestPlaysRemaining}
          maxPlays={maxGuestPlays}
          canPlay={guestPlaysRemaining > 0}
          isVip={false}
          isGuest={true}
        />
        
      </div>
    </div>
  );
}
```

### Index.tsx Update

Pass guest plays data to the component:

```tsx
<DesktopGuestSplitLayout
  onCreateAccount={handleGuestCreateAccount}
  onSignIn={handleGuestSignIn}
  onGoogleSignIn={handleGuestGoogleSignIn}
  onAppleSignIn={handleGuestAppleSignIn}
  onPlayAsGuest={handlePlayClick}
  isLoading={isAuthLoading}
  guestPlaysRemaining={guestPlaysRemaining}
  maxGuestPlays={MAX_GUEST_PLAYS_COUNT}
/>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/home/DesktopGuestSplitLayout.tsx` | Remove 2-column grid, delete right panel, add centered play button with badge |
| `src/pages/Index.tsx` | Pass guest plays data to DesktopGuestSplitLayout |

---

## Technical Notes

- Reuses existing `DesktopPlayButtonLarge` component which already has the 5/5 badge styling
- The badge will show `3/3` for guest users (based on `MAX_GUEST_PLAYS_COUNT`)
- Maintains all existing auth functionality (form validation, OAuth, mode toggle)
- Simpler, cleaner layout focused on conversion

