

# Plan: Fix Georgian Flag Emoji Not Showing

## Root Cause

The `getCountryFlag` function in `src/data/opponents.ts` looks up country codes in the `countries` array to find the corresponding flag emoji. However, **Georgia (country code: "GE")** is not in this list.

When the user's profile has `country_code: "GE"`, the function can't find it and returns the fallback white flag emoji `🏳️` instead of the Georgian flag `🇬🇪`.

---

## Technical Changes

### File: `src/data/opponents.ts`

**Add Georgia to the countries array** (after line 85, before line 86):

```typescript
// Add Georgia to the countries list
{ code: "GE", name: "Georgia", flag: "🇬🇪" },
```

The updated countries array section will look like:

```typescript
export const countries = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  // ... other countries ...
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "GE", name: "Georgia", flag: "🇬🇪" },  // ← Add this
];
```

---

## Summary

| Issue | Solution |
|-------|----------|
| Georgia (GE) missing from countries list | Add `{ code: "GE", name: "Georgia", flag: "🇬🇪" }` |
| Fallback `🏳️` shown | Will now correctly show `🇬🇪` |

---

## Result

**Before:**
```text
🏳️ მაკო   ← White flag (country not found)
```

**After:**
```text
🇬🇪 მაკო   ← Georgian flag emoji
```

