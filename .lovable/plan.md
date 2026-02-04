
# Complete Avatar Upload & AI Generation Flow for All User Types

## Overview

This plan creates a comprehensive, differentiated experience for avatar handling across three user types: **Guests**, **Signed-in (non-PRO)**, and **PRO users**. The flow guides users naturally toward PRO upgrade while delivering real value.

---

## User Flow Diagrams

### Guest Flow (Not Signed In)

```text
┌─────────────────────────────────────────────────────────────┐
│  Guest clicks avatar circle on signup modal                │
│                    ↓                                        │
│  Photo picker opens (Camera / Gallery)                      │
│                    ↓                                        │
│  Photo selected → shown in avatar preview                   │
│                    ↓                                        │
│  User completes signup form → Creates account               │
│                    ↓                                        │
│  Photo uploaded to storage → Profile saved with avatar      │
│                    ↓                                        │
│  Modal closes → User redirected to app                      │
│                                                             │
│  (No AI generation - just photo upload)                     │
└─────────────────────────────────────────────────────────────┘
```

### Signed-in Non-PRO Flow (Profile Page)

```text
┌─────────────────────────────────────────────────────────────┐
│  User clicks ENTIRE avatar circle on Profile page           │
│                    ↓                                        │
│  AvatarModal opens → Step: "Gallery"                        │
│    - Shows current avatar                                   │
│    - Shows "Create New" options (Camera/Upload)             │
│    - Shows previous generations                             │
│                    ↓                                        │
│  User selects photo                                         │
│                    ↓                                        │
│  Step: "Upload Preview" shows:                              │
│    ┌─────────────────────────────────────────┐              │
│    │    [Photo Preview]                      │              │
│    │                                         │              │
│    │  [Save as Avatar]  ← Just saves photo   │              │
│    │                                         │              │
│    │  ────────── OR ──────────               │              │
│    │                                         │              │
│    │  ┌─────────────────────────────────┐    │              │
│    │  │ ✨ AI Avatar Generation         │    │              │
│    │  │                                 │    │              │
│    │  │ Transform your photo into       │    │              │
│    │  │ a stunning 3D avatar!          │    │              │
│    │  │                                 │    │              │
│    │  │ [👑 Upgrade to PRO]             │ ← PRO upsell     │
│    │  │       ₾9.99/თვე                 │    │              │
│    │  └─────────────────────────────────┘    │              │
│    └─────────────────────────────────────────┘              │
│                                                             │
│  User can save photo as-is or tap Upgrade                   │
└─────────────────────────────────────────────────────────────┘
```

### PRO User Flow (Profile Page)

```text
┌─────────────────────────────────────────────────────────────┐
│  PRO user clicks ENTIRE avatar circle on Profile page       │
│                    ↓                                        │
│  AvatarModal opens → Step: "Gallery"                        │
│    - Shows current avatar (with animation indicator if any) │
│    - Shows "Create New" options (Camera/Upload)             │
│    - Shows previous generations                             │
│                    ↓                                        │
│  User selects photo                                         │
│                    ↓                                        │
│  Step: "Upload Preview" shows:                              │
│    ┌─────────────────────────────────────────┐              │
│    │    [Photo Preview]                      │              │
│    │                                         │              │
│    │  [Use Original]  [✨ Generate AI]       │ ← Both options│
│    └─────────────────────────────────────────┘              │
│                    ↓                                        │
│  If "Generate AI" clicked:                                  │
│                    ↓                                        │
│  Step: "Generating" (spinner, loading messages)             │
│                    ↓                                        │
│  Step: "Preview" shows AI-generated avatar                  │
│    ┌─────────────────────────────────────────┐              │
│    │    [🎉 AI Generated Avatar]             │              │
│    │                                         │              │
│    │    [Regenerate]  [✓ Use This]           │              │
│    │                                         │              │
│    │    ─────────────────────────            │              │
│    │                                         │              │
│    │    ✨ You can animate this avatar!      │ ← Animation hint│
│    │    [🎬 Animate (PRO Feature)]           │              │
│    └─────────────────────────────────────────┘              │
│                                                             │
│  User saves → Avatar applied to profile                     │
│                    ↓                                        │
│  Modal shows animation option (or auto-triggers)            │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Make Entire Avatar Circle Clickable on Profile Page

**File: `src/pages/Profile.tsx`**

**Current Code (lines 89-129):**
The avatar is a div with hover effects, but only the small Sparkles button is clickable.

**Change:**
Make the entire avatar area clickable to open the AvatarModal:

```tsx
{/* Avatar Card - ENTIRE area clickable */}
<motion.button
  onClick={() => setShowAvatarGenerator(true)}
  className="relative cursor-pointer group"
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  onMouseEnter={() => {
    if (profile.animated_avatar_url && videoRef.current) {
      setShowVideo(true);
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
    }
  }}
  onMouseLeave={() => setShowVideo(false)}
>
  {/* Static Avatar */}
  <div className="relative w-36 h-36 rounded-full ring-4 ring-primary overflow-hidden transition-all group-hover:ring-primary/80">
    <img 
      src={profile.avatar_url || "/placeholder.svg"}
      alt="Avatar"
      className="w-full h-full object-cover"
      style={{ opacity: showVideo && profile.animated_avatar_url ? 0 : 1, transition: "opacity 0.3s" }}
    />
    {/* Animated video overlay */}
    {profile.animated_avatar_url && (
      <video ... />
    )}
    
    {/* Hover overlay with edit hint */}
    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
      <Sparkles className="w-8 h-8 text-white" />
    </div>
  </div>
  
  {/* Edit badge - always visible */}
  <div className="absolute -bottom-1 -right-1 p-2 bg-primary rounded-full shadow-lg">
    <Sparkles className="w-4 h-4 text-primary-foreground" />
  </div>
</motion.button>
```

---

### 2. Update AvatarModal with PRO-Gated AI Generation

**File: `src/components/home/AvatarModal.tsx`**

Add VIP status check and modify the upload preview step:

**New imports:**
```tsx
import { useVipStatus } from "@/hooks/useVipStatus";
import { Crown, Lock } from "lucide-react";
```

**Add hook in component:**
```tsx
const { isVip } = useVipStatus();
```

**Modify Upload Preview Step (lines ~713-748):**

For non-PRO users, show upsell instead of Generate button:

```tsx
if (step === "upload" && uploadedImage) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/30">
        <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
      </div>
      
      {isVip ? (
        // PRO USER: Show both options
        <>
          <p className="text-sm text-muted-foreground text-center">
            {t("avatar.description")}
          </p>
          <div className="flex gap-2 w-full">
            <ChunkyButton
              variant="secondary"
              size="md"
              onClick={saveOriginalPhoto}
              className="flex-1"
            >
              {t("avatar.useOriginal")}
            </ChunkyButton>
            <ChunkyButton
              variant="primary"
              size="md"
              onClick={generateAvatar}
              className="flex-1"
              icon={<Wand2 className="w-4 h-4" />}
            >
              {t("avatar.generate")}
            </ChunkyButton>
          </div>
        </>
      ) : (
        // NON-PRO USER: Show save option + PRO upsell
        <>
          <ChunkyButton
            variant="secondary"
            size="md"
            onClick={saveOriginalPhoto}
            className="w-full"
          >
            შენახვა ფოტოდ
          </ChunkyButton>
          
          <div className="w-full h-px bg-border my-2" />
          
          {/* PRO Upsell Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full p-4 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm">AI ავატარის გენერაცია</p>
                <p className="text-xs text-muted-foreground">PRO ფუნქცია</p>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mb-3">
              გადააქციე ფოტო ულამაზეს 3D ავატარად! 
              ანიმაციის საშუალებაც გექნება ✨
            </p>
            
            <ChunkyButton
              variant="primary"
              size="sm"
              onClick={() => navigate("/profile?tab=PRO")}
              className="w-full"
              icon={<Crown className="w-4 h-4" />}
            >
              გახდი PRO - ₾9.99/თვე
            </ChunkyButton>
          </motion.div>
        </>
      )}
    </div>
  );
}
```

**Add new function to save original photo:**
```tsx
const saveOriginalPhoto = async () => {
  if (!uploadedImage || !user) return;

  setIsLoading(true);

  try {
    const response = await fetch(uploadedImage);
    const blob = await response.blob();
    
    const fileName = `${user.id}/avatar_${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, blob, { 
        upsert: true,
        contentType: 'image/png'
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    await updateProfile({ avatar_url: urlData.publicUrl });

    toast.success(t("avatar.avatarSaved"));
    onClose();

  } catch (error) {
    console.error("Error saving photo:", error);
    toast.error(t("errors.generic"));
  } finally {
    setIsLoading(false);
  }
};
```

---

### 3. Add Animation Indicator & Prompt After AI Generation

**In the Preview step (lines ~827-867), add animation prompt for PRO users:**

```tsx
if (step === "preview" && generatedAvatar) {
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div 
        className="w-36 h-36 rounded-full overflow-hidden border-4 border-primary shadow-lg"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <img src={generatedAvatar} alt="Generated Avatar" className="w-full h-full object-cover" />
      </motion.div>
      
      <p className="text-sm text-muted-foreground text-center">{t("avatar.avatarReady")}</p>
      
      <div className="flex gap-2 w-full">
        <ChunkyButton variant="secondary" size="md" onClick={() => { setStep("gallery"); setGeneratedAvatar(null); setUploadedImage(null); }} disabled={isLoading} className="flex-1" icon={<RefreshCw className="w-4 h-4" />}>
          {t("avatar.regenerate")}
        </ChunkyButton>
        <ChunkyButton variant="success" size="md" onClick={() => saveAvatar()} disabled={isLoading} className="flex-1" icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}>
          {t("avatar.useAsProfile")}
        </ChunkyButton>
      </div>
      
      {/* Animation Hint for PRO users */}
      {isVip && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full p-3 rounded-xl bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/30"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <Play className="w-4 h-4 text-accent" fill="currentColor" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium">შეგიძლია გააცოცხლო!</p>
              <p className="text-xs text-muted-foreground">შენახვის შემდეგ ანიმაცია ხელმისაწვდომია</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
```

---

### 4. Lock Animation Feature for Non-PRO

**In the Gallery step (lines ~533-554), modify the Animate button:**

```tsx
{/* Animate Avatar Button */}
{profile?.avatar_url && (
  isVip ? (
    <motion.button
      onClick={animateAvatar}
      disabled={isAnimating}
      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 text-xs font-medium text-primary hover:from-primary/30 hover:to-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isAnimating ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{t("avatar.animating")}</span>
        </>
      ) : (
        <>
          <Sparkles className="w-3 h-3" />
          <span>{profile?.animated_avatar_url ? t("avatar.reAnimate") : t("avatar.animateAvatar")}</span>
        </>
      )}
    </motion.button>
  ) : (
    // Non-PRO: Show locked animation button
    <motion.button
      onClick={() => navigate("/profile?tab=PRO")}
      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-xs font-medium text-muted-foreground"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Lock className="w-3 h-3" />
      <span>ანიმაცია (PRO)</span>
      <Crown className="w-3 h-3 text-amber-500" />
    </motion.button>
  )
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Profile.tsx` | Make entire avatar circle clickable, remove separate sparkles button |
| `src/components/home/AvatarModal.tsx` | Add VIP status check, add `saveOriginalPhoto` function, gate AI generation behind PRO, add animation hints for PRO, lock animation for non-PRO |

---

## Summary of User Experience

| User Type | Avatar Upload | AI Generation | Animation |
|-----------|---------------|---------------|-----------|
| **Guest** | ✅ Photo only (during signup) | ❌ Not available | ❌ Not available |
| **Signed-in (non-PRO)** | ✅ Save original photo | ❌ Shows PRO upsell | ❌ Locked (PRO badge) |
| **PRO User** | ✅ Save original OR generate | ✅ Full AI generation | ✅ Available after save |

---

## Technical Notes

- Uses existing `useVipStatus()` hook to check PRO status
- AI generation uses existing `generate-avatar` edge function
- Animation uses existing `animate-avatar` edge function
- All flows preserve existing functionality while adding gating
- Upsell naturally flows to `/profile?tab=PRO` for upgrade
