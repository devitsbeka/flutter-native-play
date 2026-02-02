

# Plan: Remove Cover Image Validation Warning

## Problem

When a user uploads a cover image for their trivia quiz, the system validates the image and shows a warning message if the AI determines the image doesn't match the quiz topic. This warning box appears below the image preview with yellow styling.

The user wants to remove this validation warning feature entirely.

---

## Technical Changes

### File: `src/components/social/CoverImagePicker.tsx`

**1. Remove the `validationWarning` state** (line 52):
```typescript
// REMOVE:
const [validationWarning, setValidationWarning] = useState<string | null>(null);
```

**2. Remove the `isValidating` state** (line 50):
```typescript
// REMOVE:
const [isValidating, setIsValidating] = useState(false);
```

**3. Remove the `AlertTriangle` import** (line 2):
```typescript
// BEFORE:
import { Upload, Sparkles, Loader2, X, Check, AlertTriangle } from "lucide-react";

// AFTER:
import { Upload, Sparkles, Loader2, X, Check } from "lucide-react";
```

**4. Remove validation logic in `handleFileSelect`** (lines 125-145):
```typescript
// REMOVE this entire block:
// Validate the uploaded image
setIsValidating(true);
try {
  const { data: validationResult } = await supabase.functions.invoke("validate-cover-image", {
    body: {
      imageUrl: publicUrl,
      title: title || suggestPrompt || "Quiz",
      subject: suggestPrompt || title || "trivia"
    }
  });

  if (validationResult && !validationResult.isValid) {
    setValidationWarning(validationResult.reason || "...");
  } else if (validationResult?.relevanceScore < 30) {
    setValidationWarning("...");
  }
} catch (validationError) {
  console.log("Validation skipped:", validationError);
} finally {
  setIsValidating(false);
}
```

**5. Remove `setValidationWarning(null)` calls** (lines 109, 178, 219, 224):
- Remove from `handleFileSelect`
- Remove from `handleGenerateAI`
- Remove from `handleSelectGeneration`
- Remove from `handleRemoveImage`

**6. Remove the validation warning UI** (lines 269-275):
```typescript
// REMOVE entire block:
{validationWarning && (
  <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-500/10 px-3 py-2 rounded-lg">
    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
    <span>{validationWarning}</span>
  </div>
)}
```

**7. Remove the validating indicator** (lines 260-266):
```typescript
// REMOVE entire block:
{isValidating && (
  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
    <Loader2 className="w-3 h-3 animate-spin text-white" />
    <span className="text-xs text-white">მოწმდება...</span>
  </div>
)}
```

**8. Remove `isValidating` from button disabled state** (line 281):
```typescript
// BEFORE:
disabled={isUploading || isValidating}

// AFTER:
disabled={isUploading}
```

---

## Summary

| Location | Change |
|----------|--------|
| Line 2 | Remove `AlertTriangle` from import |
| Line 50 | Remove `isValidating` state |
| Line 52 | Remove `validationWarning` state |
| Lines 109, 178, 219, 224 | Remove `setValidationWarning(null)` calls |
| Lines 125-145 | Remove entire validation API call and logic |
| Lines 260-266 | Remove "მოწმდება..." indicator UI |
| Lines 269-275 | Remove validation warning UI |
| Line 281 | Remove `isValidating` from disabled check |

---

## Result

- No validation API call will be made when uploading images
- No warning messages will appear after upload
- Upload process will be faster (no waiting for AI validation)
- Users can use any image they want without seeing relevance warnings

