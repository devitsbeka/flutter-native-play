
# Plan: Fix Admin Pages Accessibility

## Problem

Admin pages return 404 because of this condition in `App.tsx`:

```typescript
const INCLUDE_ADMIN = import.meta.env.VITE_INCLUDE_ADMIN === 'true';
```

Since `VITE_INCLUDE_ADMIN` is not set in the development/preview environment, it defaults to `undefined`, making `INCLUDE_ADMIN = false`, which causes all admin routes to be `null`.

---

## Solution

Change the logic to **include admin by default** and only **exclude when explicitly set to 'false'**. This matches the intended behavior:
- Development/Preview: Admin accessible
- Production (main app): Explicitly exclude admin via build flag
- Admin-only project: Include admin

---

## Technical Changes

### File: `src/App.tsx`

**Line 22** - Change from opt-in to opt-out:

```typescript
// Before (admin excluded unless explicitly enabled):
const INCLUDE_ADMIN = import.meta.env.VITE_INCLUDE_ADMIN === 'true';

// After (admin included unless explicitly disabled):
const INCLUDE_ADMIN = import.meta.env.VITE_INCLUDE_ADMIN !== 'false';
```

---

## Logic Comparison

| Environment Variable | Before (opt-in) | After (opt-out) |
|---------------------|-----------------|-----------------|
| Not set / undefined | `false` (404) | `true` (works) |
| `'true'` | `true` (works) | `true` (works) |
| `'false'` | `false` (excluded) | `false` (excluded) |

---

## Impact

- **Preview/Development**: Admin routes will work immediately without needing to set any environment variable
- **Production builds**: Can explicitly set `VITE_INCLUDE_ADMIN=false` to exclude admin code from the bundle
- **Admin project**: Works as before (can optionally set `VITE_INCLUDE_ADMIN=true` for clarity)

This is a single-line change that restores admin accessibility while preserving the ability to exclude it from production builds.
