

# Plan: Improve Sign-in / Sign-up Screen Layouts

## Summary

This plan addresses spacing, sizing, and greeting issues on the login ("შესვლა") and signup ("შექმენი") screens in the `GuestWelcomePanel` component.

---

## Problems Identified

| Issue | Screen | Description |
|-------|--------|-------------|
| Missing greeting | შესვლა (Login) | "გამარჯობა" should appear on login screen |
| Remove mascot | შესვლა (Login) | Don't show avatar/mascot on login, only on signup |
| Elements too cramped | Both screens | Insufficient spacing between header, form inputs, and buttons |
| CTA button height | Both screens | Submit button is shorter than input fields |
| Button text size | შექმენი (Signup) | "შექმენი ანგარიში" text should be 10% larger |
| OAuth icons too small | Both screens | Google and Apple icons should be 20% larger |
| Signup layout | შექმენი | Move mascot and text higher with proper gaps |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/home/GuestWelcomePanel.tsx` | All UI adjustments |

---

## Implementation Details

### 1. Add "გამარჯობა" Greeting on Login Screen

```tsx
{/* Title - show greeting only on login mode */}
{!isSignUp && (
  <motion.div className="flex flex-col items-center mb-4">
    <h2 className="text-2xl font-bold text-foreground">გამარჯობა!</h2>
  </motion.div>
)}
```

### 2. Increase Spacing Between Elements

Current container: `space-y-2` → Change to `space-y-3`

Also adjust:
- Remove negative margin-top on container (`marginTop: "-70px"` → `marginTop: "-50px"` for signup, `marginTop: "-20px"` for login)
- Add `mt-4` below mascot on signup
- Add `my-3` on the dividers

### 3. Make CTA Button Height Match Input Fields

Current input padding: `py-[15px]`  
Current ChunkyButton `md` size: `py-3` (12px)

Fix: Apply custom class to match input height:
```tsx
<ChunkyButton 
  className="w-full min-h-[54px]"  // Match input height
  ...
/>
```

### 4. Increase "შექმენი ანგარიში" Button Text by 10%

Add a custom text size class for signup button:
```tsx
{isSignUp ? (
  <span className="text-[1.1rem]">შექმენი ანგარიში</span>
) : (
  <>შესვლა</>
)}
```

### 5. Increase Google/Apple Icons by 20%

Current icon size: `w-5 h-5` (20px)  
New size: `w-6 h-6` (24px = 20% larger)

Current button size: `w-11 h-11` → `w-14 h-14` to accommodate larger icons

### 6. Adjust Signup Layout - Move Content Up

For signup mode:
- Reduce top spacing
- Adjust mascot container margin
- Proper visual hierarchy with consistent gaps

---

## Visual Summary

**Login Screen (შესვლა):**
```text
┌─────────────────────┐
│                     │
│   გამარჯობა! ←NEW   │
│                     │
│ ┌─────────────────┐ │
│ │ ელფოსტა ან...   │ │ ← Input (54px height)
│ └─────────────────┘ │
│                     │ ← 12px gap
│ ┌─────────────────┐ │
│ │ პაროლი          │ │ ← Input (54px height)
│ └─────────────────┘ │
│                     │ ← 12px gap
│ ┌─────────────────┐ │
│ │    შესვლა       │ │ ← Button (54px height)
│ └─────────────────┘ │
│                     │
│ არ გაქვს ანგარიში? │
│        ან           │
│    [G]    [⌘]       │ ← Larger icons (24px)
│                     │
└─────────────────────┘
```

**Signup Screen (შექმენი):**
```text
┌─────────────────────┐
│ შექმენი შენი...     │
│                     │
│      [Mascot]       │ ← Moved up
│                     │
│ ┌─────────────────┐ │
│ │ სახელი          │ │
│ └─────────────────┘ │
│                     │ ← 12px gap
│ ┌─────────────────┐ │
│ │ პაროლი          │ │
│ └─────────────────┘ │
│                     │ ← 12px gap
│ ┌───────────────────┐│
│ │ შექმენი ანგარიში  ││ ← Larger text (110%)
│ └───────────────────┘│
│                     │
└─────────────────────┘
```

---

## All Changes Summary

| Element | Before | After |
|---------|--------|-------|
| Login greeting | None | "გამარჯობა!" |
| Form spacing | `space-y-2` | `space-y-3` |
| CTA button height | `py-3` (~48px) | `min-h-[54px]` |
| Signup button text | `text-base` | `text-[1.1rem]` |
| OAuth button size | `w-11 h-11` | `w-14 h-14` |
| OAuth icon size | `w-5 h-5` | `w-6 h-6` |
| Container margin-top | `-70px` | Dynamic based on mode |
| Divider spacing | `my-2` | `my-3` |

