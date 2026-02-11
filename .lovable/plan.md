

## Show Round Icon on Profile Instead of Joystick

### Problem
When a round/trivia has an `icon_slug` set (via the editor's icon picker), the profile still shows a generic joystick (Gamepad2) icon for every trivia item.

### Changes

#### 1. Fetch `icon_slug` in the hook (`src/hooks/usePlayerProfile.ts`)

Add `icon_slug` to the `select` query for trivias and update the `PlayerProfileData` interface to include the field.

- Line 107: Change select from `"id, title, description, cover_image, plays_count, likes_count, created_at"` to also include `icon_slug`
- Lines 36-44: Add `icon_slug: string | null` to the trivias type

#### 2. Render 3D icon on profile (`src/components/profile/PlayerProfileModal.tsx`)

Replace the `Gamepad2` fallback icon in the trivia list with a `DynamicIcon` component that uses the trivia's `icon_slug`:

- If `trivia.icon_slug` is set: render `DynamicIcon` with that slug (shows the 3D icon from the library)
- If no icon_slug and no cover_image: fall back to the current `Gamepad2` icon

This is a minimal 2-file change that connects the existing icon_slug data to the profile display.

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/usePlayerProfile.ts` | Add `icon_slug` to interface + select query |
| `src/components/profile/PlayerProfileModal.tsx` | Import `DynamicIcon`, use it when `icon_slug` is available |
