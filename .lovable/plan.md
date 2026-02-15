

## Fix Avatar Preview and Add Animate Button

### Problem
When a user uploads a photo or takes a selfie and the AI generates an avatar, the preview step shows a broken/striped image instead of the generated avatar. Additionally, users who want to animate their avatar have to save first, go back to the gallery, and then find the animate button separately -- this breaks the flow.

### Changes

#### File: `src/components/home/AvatarModal.tsx` -- Preview Step (lines 1091-1151)

1. **Fix broken avatar display**: Add an `onError` handler on the preview image that retries loading or shows a fallback. Also add a loading state for the image to avoid showing the broken striped circle.

2. **Replace the passive animation hint with an actionable "Animate" button**: Instead of just telling users "you can animate after saving", add a real button that:
   - First saves the avatar (same as "გამოყენება")
   - Then immediately triggers `animateAvatar()` 
   - This gives users a seamless "save + animate" one-tap experience

3. **Update button layout**: The preview step will have three actions:
   - "თავიდან" (Retry) -- regenerate
   - "გამოყენება" (Use as profile) -- save only
   - "გააცოცხლე" (Animate) -- save and animate (PRO only, replaces the passive hint card)

### Technical Details

**Preview step image fix** -- add `onError` fallback and loading state:
```tsx
<img 
  src={generatedAvatar} 
  alt="Generated Avatar" 
  className="w-full h-full object-cover"
  onError={(e) => {
    // Fallback to uploaded image if generated URL fails
    if (uploadedImage) {
      e.currentTarget.src = uploadedImage;
    }
  }}
/>
```

**Replace hint card with animate button** -- for PRO users, show a real ChunkyButton that saves then animates:
```tsx
{isVip && (
  <ChunkyButton
    variant="primary"
    size="md"
    onClick={async () => {
      await saveAvatar();
      animateAvatar();
    }}
    disabled={isLoading || isAnimating}
    className="w-full"
    icon={<Sparkles className="w-4 h-4" />}
  >
    {isAnimating ? "ანიმაცია..." : "გააცოცხლე ✨"}
  </ChunkyButton>
)}
```

For non-PRO users, show a locked animate button that navigates to PRO page (same pattern as the gallery step).

