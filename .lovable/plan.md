

## Fix Auth Page: Remove Dark Flash and Reduce Password Placeholder Opacity

### Changes

**File: `src/pages/Auth.tsx`**

1. **Password placeholder opacity (line 356-363)**: Add a custom class to the password input to reduce placeholder opacity to 20%. Change the Input className from `"pl-10"` to `"pl-10 placeholder:opacity-20"` so the dots appear much lighter and don't look like an entered password.

2. **Background flash fix (line 259)**: The outer div currently uses `bg-gradient-to-b from-background via-background to-primary/10`. To prevent any dark flash during initial render, add an explicit `bg-background` as a base fallback before the gradient kicks in. This ensures the page always starts with the light background color.

### Technical Details

- Line 259: Change the container className to include a solid background fallback
- Line 362: Add `placeholder:opacity-20` to the password Input's className

### Files to Edit
- `src/pages/Auth.tsx` — 2 small className changes

