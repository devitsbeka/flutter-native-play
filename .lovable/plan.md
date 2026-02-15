

## Add "გააცოცხლე ავატარი" Button on Main Page

### What It Does
When a logged-in user has a photo-based avatar (face photo that went through AI generation) but does NOT yet have an animated video avatar, a small floating button appears just above the level badge at the bottom of the avatar circle. The button shows a sparkle icon + "გააცოცხლე ავატარი" text, and tapping it opens the avatar modal to trigger the animation flow.

### Conditions to Show
- User is logged in
- User has an `avatar_url` that contains `avatar_ai` (meaning it's a photo-based AI-generated avatar, not a mascot/bot icon)
- User does NOT have an `animated_avatar_url` (no animation generated yet)

### Changes

#### 1. `src/components/home/AvatarCircle.tsx`
- Add a new prop: `onAnimateClick?: () => void` -- callback when the animate button is tapped
- Add a new prop: `showAnimatePrompt?: boolean` -- controls visibility of the button
- Render a small pill-shaped button positioned just above the level badge (absolute positioning, z-30), containing the uploaded sparkle icon + "გააცოცხლე ავატარი" text
- The button has a purple gradient background, rounded-full, with a subtle pulse animation to draw attention
- Copy the uploaded sparkle image (`user-uploads://ai-sparkle-3.png`) to `src/assets/icons/ai-sparkle.png`

#### 2. `src/pages/Index.tsx`
- Compute `showAnimatePrompt` condition: `!!profile?.avatar_url && profile.avatar_url.includes('avatar_ai') && !profile?.animated_avatar_url`
- Pass `showAnimatePrompt` and `onAnimateClick={() => openAvatarModal()}` to all 3 AvatarCircle instances (mobile, tablet, desktop)

### Button Design
- Small pill: sparkle icon (16x16) + "გააცოცხლე ავატარი" text (xs, bold, white)
- Background: purple gradient (matching the app theme)
- Positioned horizontally centered, just above the level badge
- Gentle scale pulse animation to attract attention
- On tap: opens the avatar modal where the user can trigger animation generation

