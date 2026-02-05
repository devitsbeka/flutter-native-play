
# Plan: Fix Mobile Photo Upload in Avatar Modal

## Problem Analysis

Photo upload doesn't work on actual mobile devices (published URL). The current implementation has several critical issues:

| Issue | Description | Impact |
|-------|-------------|--------|
| **No FileReader error handler** | If reading the file fails, nothing happens silently | User clicks upload, file picker opens, file selected, but nothing happens |
| **HEIC format not handled** | iPhone photos in HEIC format have empty `file.type` on some browsers | Type check fails: `!file.type.startsWith("image/")` rejects HEIC |
| **No loading state during read** | User has no feedback while large file is being processed | Appears frozen/broken |
| **Large mobile images** | 12MP+ phone cameras create huge files that can crash FileReader | Memory issues, slow processing |
| **No compression** | Raw camera photos are 3-8MB, causing slow uploads | Upload timeouts, poor UX |

---

## Solution

Completely rewrite the file selection handler with proper mobile support:

### 1. Accept HEIC Format + Better MIME Handling
```tsx
// Before
accept="image/*"
if (!file.type.startsWith("image/")) { ... }

// After
accept="image/*,.heic,.heif"
// Allow empty type for HEIC, check extension as fallback
const isImageByExtension = /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);
if (!file.type.startsWith("image/") && !isImageByExtension) { ... }
```

### 2. Add Loading State During File Read
```tsx
const [isProcessingFile, setIsProcessingFile] = useState(false);

const handleFileSelect = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  setIsProcessingFile(true);  // Show loading on button
  
  try {
    // ... process file
  } finally {
    setIsProcessingFile(false);
  }
};
```

### 3. Add Error Handler to FileReader
```tsx
const reader = new FileReader();

reader.onerror = () => {
  console.error("FileReader error:", reader.error);
  toast.error(t("errors.failedToReadImage"));
  setIsProcessingFile(false);
};

reader.onload = (event) => { ... };
reader.readAsDataURL(file);
```

### 4. Compress Large Images Using Canvas
Before reading as data URL, resize images that are too large:

```tsx
const compressImage = (file: File, maxWidth = 1024, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      // Draw to canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    
    img.src = url;
  });
};
```

### 5. Increase File Size Limit
Mobile photos are often larger than 5MB, especially from modern phones:

```tsx
// Before: 5MB limit
if (file.size > 5 * 1024 * 1024) { ... }

// After: 15MB limit (compression will reduce for upload)
if (file.size > 15 * 1024 * 1024) { ... }
```

### 6. Reset File Input After Use
Fix for iOS Safari where same file can't be selected twice:

```tsx
reader.onload = (event) => {
  setUploadedImage(event.target?.result as string);
  setStep("upload");
  // Reset input for iOS Safari
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
};
```

---

## File Changes

### File: `src/components/home/AvatarModal.tsx`

**Lines 82-84** - Add new state:
```tsx
const [isProcessingFile, setIsProcessingFile] = useState(false);
```

**Lines 184-204** - Complete rewrite of handleFileSelect:
```tsx
// Add compressImage helper function above handleFileSelect

const compressImage = useCallback((file: File, maxWidth = 1024, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxWidth) {
        width = (width * maxWidth) / height;
        height = maxWidth;
      }
      
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    
    img.src = url;
  });
}, []);

const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Allow empty type for HEIC, check extension as fallback
  const isImageByExtension = /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp)$/i.test(file.name);
  if (!file.type.startsWith("image/") && !isImageByExtension) {
    toast.error(t("errors.selectImageFile"));
    return;
  }

  // Increased limit for mobile (compression will reduce)
  if (file.size > 15 * 1024 * 1024) {
    toast.error(t("errors.imageTooLarge"));
    return;
  }

  setIsProcessingFile(true);

  try {
    // Use compression via canvas (handles HEIC, resizes, and converts to JPEG)
    const dataUrl = await compressImage(file, 1024, 0.85);
    setUploadedImage(dataUrl);
    setStep("upload");
    
    // Reset input for iOS Safari
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  } catch (error) {
    console.error("Error processing image:", error);
    toast.error(t("errors.failedToReadImage") || "Failed to process image");
  } finally {
    setIsProcessingFile(false);
  }
};
```

**Line 656-662** - Update file input:
```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/*,.heic,.heif"
  capture="environment"
  onChange={handleFileSelect}
  className="hidden"
/>
```

**Line 640-652** - Add loading state to upload button:
```tsx
<motion.button
  onClick={() => fileInputRef.current?.click()}
  disabled={isProcessingFile}
  className={`flex-1 aspect-square max-w-[100px] rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all ${isProcessingFile ? 'opacity-50' : ''}`}
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  {isProcessingFile ? (
    <>
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <span className="text-xs text-muted-foreground">მუშავდება...</span>
    </>
  ) : (
    <>
      <img 
        src={iconPhotoUpload} 
        alt="Upload" 
        className="w-10 h-10 object-contain"
      />
      <span className="text-xs text-muted-foreground">{t("avatar.uploadPhoto")}</span>
    </>
  )}
</motion.button>
```

---

## Summary of Changes

| Change | Benefit |
|--------|---------|
| HEIC support via extension check | iPhone photos work |
| Canvas-based compression | Handles all formats, reduces file size, standardizes to JPEG |
| Loading state during processing | User sees feedback |
| Error handling | User gets error message instead of silent failure |
| Input reset | iOS Safari can select same file again |
| Increased size limit to 15MB | Modern phone cameras accepted |
| `capture="environment"` attribute | Better mobile camera integration |

---

## Technical Details

The canvas-based compression approach:
1. Creates an object URL from the file (works with HEIC)
2. Loads it into an Image element (browser handles decoding)
3. Draws to canvas at reduced size
4. Exports as JPEG data URL

This bypasses FileReader's potential issues with large files and automatically converts HEIC to JPEG.
