
# Plan: Fix Logo Wrapping and Content Centering on Desktop

## Problems Identified

### 1. Logo Still Wrapping
The "MyTrivia" text and "LIVE" badge are appearing on separate lines despite previous fixes. 

**Root Cause**: The `MyTriviaLiveLogo` component is inside a flex container that can still allow shrinkage. The `minWidth: 'max-content'` style isn't being respected because the parent flex container uses `flex-1` which can override child width constraints in certain layouts.

### 2. Content Not Vertically Centered
Looking at the desktop screenshot, the avatar and elements below appear to float toward the top-center instead of being perfectly centered both horizontally and vertically.

**Root Cause**: The xl+ layout container (line 792) lacks vertical centering:
```typescript
className="hidden xl:flex flex-col items-center w-full px-4"
```
This only has `items-center` (horizontal) but no `justify-center` or `h-full` for vertical centering.

---

## Technical Changes

### File 1: `src/components/shared/MyTriviaLiveLogo.tsx`

**Change**: Force the container to never wrap by using `flex-nowrap` and ensuring inline-flex behavior with explicit width handling.

Lines 42-45: Update the container styling:

```typescript
// BEFORE:
<div 
  className={`inline-flex items-center gap-2 shrink-0 whitespace-nowrap ${className}`}
  style={{ minWidth: 'max-content' }}
>

// AFTER:
<div 
  className={`flex flex-row flex-nowrap items-center gap-2 shrink-0 ${className}`}
  style={{ 
    display: 'inline-flex',
    flexWrap: 'nowrap',
    width: 'fit-content',
    minWidth: 'fit-content',
    maxWidth: 'fit-content',
  }}
>
```

Key changes:
- Use `flex-row flex-nowrap` to explicitly prevent row wrapping
- Set `width`, `minWidth`, and `maxWidth` all to `fit-content` to lock the container size

---

### File 2: `src/pages/Index.tsx`

**Change 1 (Lines 434-441)**: Simplify the logo container to prevent flex compression:

```typescript
// BEFORE:
<div className="flex-1 flex justify-center md:justify-start items-center gap-4">
  {/* Logo - sm on mobile/tablet, md on desktop - single line always */}
  <div className="shrink-0" style={{ minWidth: 'max-content' }}>
    <MyTriviaLiveLogo size="sm" className="md:hidden" />
    <MyTriviaLiveLogo size="sm" className="hidden md:block lg:hidden" />
    <MyTriviaLiveLogo size="md" className="hidden lg:block" />
  </div>
</div>

// AFTER:
<div className="flex-1 flex justify-center md:justify-start items-center gap-4">
  {/* Logo - sm on mobile/tablet, md on desktop - single line always */}
  <MyTriviaLiveLogo size="sm" className="md:hidden" />
  <MyTriviaLiveLogo size="sm" className="hidden md:block lg:hidden" />
  <MyTriviaLiveLogo size="md" className="hidden lg:block" />
</div>
```

Remove the extra wrapper div - the logo component itself now handles all the shrink prevention.

**Change 2 (Line 792)**: Add vertical centering to the xl+ layout:

```typescript
// BEFORE:
{user && <motion.div 
  className="hidden xl:flex flex-col items-center w-full px-4"
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ duration: 0.5, type: "spring" }}
>

// AFTER:
{user && <motion.div 
  className="hidden xl:flex flex-col items-center justify-center w-full h-full px-4"
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ duration: 0.5, type: "spring" }}
>
```

Key additions:
- `h-full` - Makes the container fill the parent's height
- `justify-center` - Centers content vertically within the container

**Change 3 (Line 575)**: Add vertical centering to the md-xl layout as well:

```typescript
// BEFORE:
{user && <div className="hidden md:flex xl:hidden items-start justify-center w-full px-4 pt-[73px]">

// AFTER:
{user && <div className="hidden md:flex xl:hidden items-center justify-center w-full h-full px-4">
```

Key changes:
- `items-start` → `items-center` - Center content vertically
- `h-full` - Fill parent height
- Remove `pt-[73px]` - No longer needed with proper centering

---

## Summary

| File | Location | Change | Purpose |
|------|----------|--------|---------|
| MyTriviaLiveLogo.tsx | Lines 42-45 | Lock container size with fit-content | Prevent logo from ever wrapping |
| Index.tsx | Lines 434-441 | Remove wrapper div | Simplify structure, rely on component styling |
| Index.tsx | Line 792 | Add `h-full justify-center` | Vertically center xl+ layout |
| Index.tsx | Line 575 | Add `h-full`, change `items-start` to `items-center`, remove `pt-[73px]` | Vertically center md-xl layout |

---

## Expected Result

**Logo (all screen sizes):**
```text
MyTrivia ● LIVE   ← Always on one line, never wraps
```

**Desktop/Tablet Content:**
- Avatar and all elements below (name, coins, gems, play button) will be perfectly centered both horizontally and vertically in the viewport
- No more floating toward the top of the screen
