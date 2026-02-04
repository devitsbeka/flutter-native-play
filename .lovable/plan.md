
# Replace Avatar Modal Icons with 3D Images

## Overview

Replace the Lucide icons in the AvatarModal with the 3D images you provided for a more visually appealing experience:

| Icon | 3D Image | Usage |
|------|----------|-------|
| Scissors | `tailors-scissors.png` | Crop/edit photo functionality |
| Sparkle | `ai-sparkle.png` | AI generation button, PRO upsell card |
| Photo upload | `photo-technology-editing-technology-app.png` | Upload photo button |
| Hourglass | `hourglass-timer.png` | Generating step (loading animation) |

---

## Implementation Steps

### Step 1: Copy Images to Assets

Copy the uploaded icons to `src/assets/icons/`:

```
src/assets/icons/
├── icon-scissors.png
├── icon-ai-sparkle.png
├── icon-photo-upload.png
└── icon-hourglass.png
```

---

### Step 2: Import Icons in AvatarModal

**File: `src/components/home/AvatarModal.tsx`**

Add imports at the top of the file:

```tsx
// Import 3D icons for avatar flow
import iconScissors from '@/assets/icons/icon-scissors.png';
import iconAiSparkle from '@/assets/icons/icon-ai-sparkle.png';
import iconPhotoUpload from '@/assets/icons/icon-photo-upload.png';
import iconHourglass from '@/assets/icons/icon-hourglass.png';
```

---

### Step 3: Replace Icons in Gallery Step

**Upload Photo Button (lines 632-642):**
```tsx
<motion.button
  onClick={() => fileInputRef.current?.click()}
  className="flex-1 aspect-square max-w-[100px] rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all"
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  <img 
    src={iconPhotoUpload} 
    alt="Upload" 
    className="w-10 h-10 object-contain"
  />
  <span className="text-xs text-muted-foreground">{t("avatar.uploadPhoto")}</span>
</motion.button>
```

---

### Step 4: Replace AI Generate Button Icon

**In Upload Preview step (lines 795-804):**
```tsx
<ChunkyButton
  variant="primary"
  size="md"
  onClick={generateAvatar}
  disabled={isLoading}
  className="flex-1"
  icon={<img src={iconAiSparkle} alt="" className="w-5 h-5 object-contain" />}
>
  {t("avatar.generate")}
</ChunkyButton>
```

**In PRO Upsell Card (lines 828-831):**
```tsx
<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
  <img src={iconAiSparkle} alt="" className="w-6 h-6 object-contain" />
</div>
```

---

### Step 5: Replace Generating Step Animation

**In Generating step (lines 907-934):**

Replace the spinner animation with the hourglass icon:

```tsx
if (step === "generating") {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="relative">
        {/* Background circle with uploaded image */}
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 opacity-50">
          <img src={uploadedImage || ""} alt="Uploading" className="w-full h-full object-cover" />
        </div>
        
        {/* Spinning border */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Hourglass icon in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
            <motion.img 
              src={iconHourglass} 
              alt="Loading" 
              className="w-8 h-8 object-contain"
              animate={{ rotate: [0, 180, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <p className="font-semibold text-foreground">{t("avatar.generating")}</p>
        <p className="text-sm text-muted-foreground">{t("avatar.generatingTime")}</p>
      </div>
    </div>
  );
}
```

---

### Step 6: Replace Regenerate Button Icon (Optional)

In the Preview step, replace the `RefreshCw` icon with scissors for "regenerate":

```tsx
<ChunkyButton
  variant="secondary"
  size="md"
  onClick={...}
  disabled={isLoading}
  className="flex-1 min-w-0"
  icon={<img src={iconScissors} alt="" className="w-5 h-5 object-contain shrink-0" />}
>
  <span className="truncate">{t("avatar.regenerate")}</span>
</ChunkyButton>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/assets/icons/` | Add 4 new icon images |
| `src/components/home/AvatarModal.tsx` | Import icons, replace Lucide icons with 3D images |

---

## Visual Result

After these changes:
- **Gallery step**: Photo upload button shows 3D photo icon
- **Upload preview**: AI generate button shows sparkle icon
- **Generating step**: Animated hourglass icon in center of loading circle
- **Preview step**: Regenerate button shows scissors icon
- **PRO upsell card**: Sparkle icon instead of Lucide Sparkles
