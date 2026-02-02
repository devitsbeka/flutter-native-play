

# Plan: Fix Logo Size on Mobile (Team Page)

## Issue Found

The responsive logo changes were only applied to `Index.tsx` but the user is viewing the **Team page** (`TeamV2.tsx`) which still uses a fixed `size="md"`:

```typescript
// Line 513 in TeamV2.tsx - Currently hardcoded
<MyTriviaLiveLogo size="md" />
```

This means on mobile the logo shows at 28px (medium) when it should show at 20px (small).

---

## Technical Fix

### File: `src/pages/TeamV2.tsx`

**Change line 513:**

```typescript
// Before:
<MyTriviaLiveLogo size="md" />

// After:
<MyTriviaLiveLogo responsive />
```

---

## Result

With `responsive` prop:
- **Mobile** (< 768px): 20px font size (small)
- **Tablet** (768px - 1024px): 28px font size (medium)  
- **Desktop** (> 1024px): 40px font size (large)

This matches the behavior already implemented on the Index page.

---

## Summary

| File | Line | Change |
|------|------|--------|
| `TeamV2.tsx` | 513 | Replace `size="md"` with `responsive` |

