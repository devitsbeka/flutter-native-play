
# Plan: Add Purple Background to "Add Round" Modal

## Problem Analysis

The "რაუნდის დამატება" (Add Round) modal opens with a white background (`bg-background`), which is inconsistent with the purple-themed create trivia/collection screens shown in the reference images.

Looking at the current implementation in `AddRoundToCollectionModal.tsx`:
- **Line 486**: Main container uses `bg-background` (white/light)
- **Line 489**: Header uses `bg-background/95` (white/light)
- Text colors and UI elements are designed for light background

The suggestions already display as a **grid with a refresh button** (lines 273-318), not a carousel - so that part is already correctly implemented.

---

## Technical Changes

### File: `src/components/social/AddRoundToCollectionModal.tsx`

#### Change 1: Apply Purple Gradient Background to Main Container

**Location: Line 486**
```typescript
// BEFORE:
className="fixed inset-0 z-50 bg-background"

// AFTER:
className="fixed inset-0 z-50 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900"
```

#### Change 2: Update Header Background

**Location: Line 489**
```typescript
// BEFORE:
className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/30 safe-top"

// AFTER:
className="fixed top-0 left-0 right-0 z-50 bg-purple-900/90 backdrop-blur-md border-b border-white/10 safe-top"
```

#### Change 3: Update Back Button Styling

**Location: Lines 491-496**
```typescript
// BEFORE:
className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
<ChevronLeft className="w-5 h-5 text-foreground" />

// AFTER:
className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
<ChevronLeft className="w-5 h-5 text-white" />
```

#### Change 4: Update Progress Dots Colors

**Location: Lines 500-507**
```typescript
// BEFORE:
s === step ? "w-6 bg-primary" : s < step ? "w-2 bg-primary/50" : "w-2 bg-muted"

// AFTER:
s === step ? "w-6 bg-white" : s < step ? "w-2 bg-white/60" : "w-2 bg-white/30"
```

#### Change 5: Update AI Badge Styling

**Location: Lines 510-513**
```typescript
// BEFORE:
className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full"
<Sparkles className="w-4 h-4 text-primary" />
<span className="text-xs font-semibold text-primary">AI</span>

// AFTER:
className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-full"
<Sparkles className="w-4 h-4 text-white" />
<span className="text-xs font-semibold text-white">AI</span>
```

#### Change 6: Update Step Content Styling

**Location: Lines 265-271 (Step 1 header)**
```typescript
// BEFORE:
<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
  <Sparkles className="w-8 h-8 text-primary" />
</div>
<h3 className="text-xl font-bold text-foreground mb-1">რაუნდი {roundNumber} ✨</h3>
<p className="text-sm text-muted-foreground">რა თემაზე გსურს კითხვები?</p>

// AFTER:
<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-4">
  <Sparkles className="w-8 h-8 text-white" />
</div>
<h3 className="text-xl font-bold text-white mb-1">რაუნდი {roundNumber} ✨</h3>
<p className="text-sm text-purple-200">რა თემაზე გსურს კითხვები?</p>
```

#### Change 7: Update Topic Suggestions Header and Refresh Button

**Location: Lines 274-287**
```typescript
// BEFORE:
<span className="text-xs text-muted-foreground">💡 იდეები:</span>
<Button ... className="h-6 px-2 text-xs hover:bg-muted">

// AFTER:
<span className="text-xs text-purple-200">💡 იდეები:</span>
<Button ... className="h-6 px-2 text-xs text-purple-200 hover:text-white hover:bg-white/10">
```

#### Change 8: Update Topic Suggestion Cards

**Location: Lines 298-316**
```typescript
// BEFORE:
className={`p-3 rounded-xl border-2 transition-all text-center ${
  subject === topic.value
    ? "border-primary bg-primary/10 scale-105"
    : "border-border hover:border-primary/50 hover:bg-muted/50"
}`}
<span className="text-xs font-medium text-foreground">{topic.label}</span>

// AFTER:
className={`p-3 rounded-xl border-2 transition-all text-center ${
  subject === topic.value
    ? "border-white bg-white/20 scale-105"
    : "border-white/20 hover:border-white/50 hover:bg-white/10"
}`}
<span className="text-xs font-medium text-white">{topic.label}</span>
```

#### Change 9: Update Divider

**Location: Lines 320-327**
```typescript
// BEFORE:
<div className="w-full border-t border-border" />
<span className="bg-background px-3 text-xs text-muted-foreground">ან ჩაწერე</span>

// AFTER:
<div className="w-full border-t border-white/20" />
<span className="bg-transparent px-3 text-xs text-purple-200">ან ჩაწერე</span>
```

#### Change 10: Update Input Field

**Location: Lines 329-334**
```typescript
// BEFORE:
className="text-center text-lg h-14 rounded-xl"

// AFTER:
className="text-center text-lg h-14 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-purple-300"
```

#### Change 11: Update Step 2 & 3 Text Colors

**Location: Lines 356-358 (Step 2 header)**
```typescript
// BEFORE:
<h3 className="text-xl font-bold text-foreground mb-1">რამდენი კითხვა? 🤔</h3>
<p className="text-sm text-muted-foreground">აირჩიე რაოდენობა</p>

// AFTER:
<h3 className="text-xl font-bold text-white mb-1">რამდენი კითხვა? 🤔</h3>
<p className="text-sm text-purple-200">აირჩიე რაოდენობა</p>
```

#### Change 12: Update Question Count Buttons

**Location: Lines 361-376**
```typescript
// BEFORE:
questionCount === count
  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30"
  : "bg-muted text-muted-foreground hover:bg-muted/80"

// AFTER:
questionCount === count
  ? "bg-white text-purple-700 shadow-lg shadow-white/30"
  : "bg-white/20 text-white hover:bg-white/30"
```

#### Change 13: Update Back Button in Steps 2 & 3

**Location: Lines 379 & 451**
```typescript
// BEFORE:
<Button variant="outline" onClick={() => setStep(...)} className="flex-1 h-12 rounded-xl">

// AFTER:
<Button variant="outline" onClick={() => setStep(...)} className="flex-1 h-12 rounded-xl bg-white/10 border-white/30 text-white hover:bg-white/20">
```

#### Change 14: Update Step 3 Format Cards

**Location: Lines 405-448**
```typescript
// BEFORE:
answerFormat === "4_answers"
  ? "border-primary bg-primary/10"
  : "border-border hover:border-primary/50"
<div className="font-semibold text-foreground">4 ვარიანტი</div>
<div className="text-sm text-muted-foreground">კლასიკური Quiz ფორმატი</div>

// AFTER:
answerFormat === "4_answers"
  ? "border-white bg-white/20"
  : "border-white/20 hover:border-white/50"
<div className="font-semibold text-white">4 ვარიანტი</div>
<div className="text-sm text-purple-200">კლასიკური Quiz ფორმატი</div>
```

---

## Summary

| Element | Before | After |
|---------|--------|-------|
| Main background | `bg-background` (white) | `bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900` |
| Header | `bg-background/95` | `bg-purple-900/90` |
| Titles | `text-foreground` | `text-white` |
| Subtitles | `text-muted-foreground` | `text-purple-200` |
| Cards/buttons | Light borders | `border-white/20` with `text-white` |
| Selected state | `bg-primary/10` | `bg-white/20` or solid white |
| Input field | Default styling | `bg-white/10 border-white/20 text-white` |

---

## Expected Result

- The "Add Round" modal will have the same purple gradient background as the create trivia/collection screens
- All text and UI elements will be styled for visibility on dark purple background
- The topic suggestions with refresh button remain unchanged functionally (already correct)
- Consistent visual experience across all creation flows
