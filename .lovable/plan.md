

# Plan: Replace Flag Image with Flag Emoji on Mobile Profile

## Problem

Currently on the mobile profile page (Index.tsx), the country flag is displayed as an image using the `FlagIcon` component which loads from `flagcdn.com`. The user wants to use a flag emoji instead, which is lighter and matches other places in the app.

## Current Behavior

```text
🇬🇪 (as image)  მაკო   ← FlagIcon loads external PNG
```

## Desired Behavior

```text
🇬🇪 (as emoji)  მაკო   ← Native emoji, no external image
```

---

## Technical Changes

### File: `src/pages/Index.tsx`

**Change 1**: Import the existing `getCountryFlag` helper function from `src/data/opponents.ts`

```typescript
// Add to existing imports (around line 1-60)
import { getCountryFlag } from "@/data/opponents";
```

**Change 2**: Remove the `FlagIcon` import (line 58) since it will no longer be used

**Change 3 (Lines 1103-1106)**: Replace `FlagIcon` component with emoji span

```typescript
// BEFORE:
<div className="flex items-center justify-center gap-2.5">
  {profile?.country_code && (
    <FlagIcon countryCode={profile.country_code} size="md" />
  )}
  <span className="font-slackey text-gray-800 capitalize font-black" style={{ fontSize: 32 }}>

// AFTER:
<div className="flex items-center justify-center gap-2.5">
  {profile?.country_code && (
    <span className="text-3xl">{getCountryFlag(profile.country_code)}</span>
  )}
  <span className="font-slackey text-gray-800 capitalize font-black" style={{ fontSize: 32 }}>
```

---

## Summary

| Change | Description |
|--------|-------------|
| Import `getCountryFlag` | Use existing emoji helper from opponents.ts |
| Remove `FlagIcon` import | No longer needed on this page |
| Replace component | Swap `<FlagIcon>` for `<span>` with emoji |
| Size | Use `text-3xl` (~30px) to match username text size |

---

## Benefits

- **Faster loading**: No external image request to flagcdn.com
- **Consistent**: Matches emoji flags used elsewhere in the app (team, social, modals)
- **Native look**: Emoji flags render with device's native style

