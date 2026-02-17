
## Fix: Prevent Animating Raw Photos Directly

### Problem
When the user clicks the "გააცოცხლე ავატარი" (Animate Avatar) button on the home page, the code in `Index.tsx` sends `profile.avatar_url` directly to `animate-avatar` without checking whether it's a raw photo or an AI-generated avatar. This results in animating the unprocessed selfie instead of first generating a styled 3D avatar.

The `AvatarModal` already has the correct logic (lines 548-598): it checks `avatar_generations` for an existing AI avatar and generates one first if needed. But `handleAnimateFromHome` in `Index.tsx` skips this entirely.

### Solution
Update `handleAnimateFromHome` in `src/pages/Index.tsx` to mirror the same logic from `AvatarModal.animateAvatar()`:

1. Check `avatar_generations` for an existing AI-generated avatar marked as `is_current`
2. If none exists, call `generate-avatar` first to create the AI-styled version
3. Upload the result, update `avatar_generations` and `profile.avatar_url`
4. Only then pass the AI avatar URL to `animate-avatar`

### Technical Details

**File: `src/pages/Index.tsx`** (around lines 388-393)

Before the `animate-avatar` call, add the same avatar generation check:

```typescript
const handleAnimateFromHome = useCallback(async () => {
  // ... existing face check ...

  try {
    let imageUrl = profile.avatar_url;

    // Check if current avatar has an AI-generated version
    const { data: existingGen } = await supabase
      .from('avatar_generations')
      .select('id, avatar_url')
      .eq('user_id', user.id)
      .eq('is_current', true)
      .single();

    if (!existingGen) {
      // Generate AI avatar first
      toast({ title: "AI ავატარი გენერირდება..." });
      const { data: genData, error: genError } = await supabase.functions.invoke("generate-avatar", {
        body: { imageUrl: profile.avatar_url },
      });
      if (genError || !genData?.success) throw new Error(...);

      // Upload, save to avatar_generations, update profile
      // ... (same pattern as AvatarModal) ...
      imageUrl = aiAvatarUrl;
    } else {
      imageUrl = existingGen.avatar_url;
    }

    // Now animate the AI-generated avatar (not the raw photo)
    const { data, error } = await supabase.functions.invoke("animate-avatar", {
      body: { imageUrl, userId: user.id },
    });
    // ... rest of polling logic stays the same ...
  }
});
```

Only one file needs to change: `src/pages/Index.tsx`.
