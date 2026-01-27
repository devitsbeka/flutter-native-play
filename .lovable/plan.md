
# Fix TV Results Screen - Georgian Translation & Background

## Issues Found

1. **English text (line 200-202)**: The text "Host can start a new round from their phone" is hardcoded in English
2. **White bottom space**: The component uses `h-screen` with `-mt-10` negative margin, which creates visual issues. The container doesn't fully extend to fill the viewport height

---

## Changes

### 1. Translate English Text to Georgian (TVResultsScreen.tsx)

**Line 200-202 - Change from:**
```tsx
<p className="text-purple-300 text-sm">
  Host can start a new round from their phone
</p>
```

**To:**
```tsx
<p className="text-purple-300 text-sm">
  მასპინძელს შეუძლია ახალი რაუნდის დაწყება ტელეფონიდან
</p>
```

---

### 2. Fix Background Coverage (TVResultsScreen.tsx)

**Line 67 - Current container:**
```tsx
<div className="h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 overflow-hidden relative flex flex-col -mt-10">
```

**Updated container - use `min-h-screen` and remove negative margin:**
```tsx
<div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 overflow-hidden relative flex flex-col">
```

The `-mt-10` was causing the component to shift up, leaving a gap at the bottom. Using `min-h-screen` without the negative margin ensures the purple gradient background fills the entire viewport.

Additionally, adjust the header margin to compensate:

**Line 99 - Change header class from:**
```tsx
className="text-center mb-6 flex-shrink-0 mt-10"
```

**To (remove mt-10 since we removed the negative margin above):**
```tsx
className="text-center mb-6 flex-shrink-0"
```

---

## File Changes Summary

| File | Line | Change |
|------|------|--------|
| `src/components/tv/TVResultsScreen.tsx` | 67 | Remove `-mt-10`, change `h-screen` to `min-h-screen` |
| `src/components/tv/TVResultsScreen.tsx` | 99 | Remove `mt-10` from header |
| `src/components/tv/TVResultsScreen.tsx` | 201 | Translate to Georgian |

---

## Result

After these changes:
- The hint text will display in Georgian: "მასპინძელს შეუძლია ახალი რაუნდის დაწყება ტელეფონიდან"
- The purple gradient background will fill the entire TV screen with no white gaps at the bottom
