

# Fix Guest Welcome Panel Layout Issues

## Overview
Address multiple UI issues on the guest welcome screen to ensure the mascot face is visible, content fits without cropping, and OAuth buttons are icon-only.

---

## Issues Identified

| Issue | Current State | Fix |
|-------|---------------|-----|
| 1. "გამარჯობა!" cropped | Title at top gets clipped | Add `pt-safe` top padding and ensure container doesn't overflow |
| 2. Mascot face not centered | Video uses `object-cover` but mascot face is lower in frame | Add `object-position: center 35%` to pull the face up to center |
| 3. Google/Apple buttons have text | Full text: "გააგრძელე Google-ით" | Show only logo icons, make buttons smaller circles side-by-side |
| 4. Button too large | `size="lg"` takes too much vertical space | Change to `size="md"` and reduce padding |
| 5. Content doesn't fit | Bottom elements cut off on small viewports | Reduce spacing, smaller avatar, condensed layout |

---

## Technical Changes

### File: `src/components/home/GuestWelcomePanel.tsx`

#### 1. Fix Video Centering - Show Mascot Face

The video's mascot character has its face lower in the frame. Use `object-position` to adjust:

```tsx
// Line 124-127 - Update PingPongVideo with style prop OR
// Wrap with a div that adjusts positioning

// Option: Add a wrapper with transform/positioning
<div 
  className="relative rounded-full overflow-hidden"
  style={{
    width: "clamp(120px, 32vw, 180px)", // Smaller avatar
    height: "clamp(120px, 32vw, 180px)",
    ...
  }}
>
  {/* Video with adjusted position to center face */}
  <div className="absolute inset-0 scale-[1.3]" style={{ top: '-15%' }}>
    <PingPongVideo 
      src={guestWelcomeVideo}
      className="rounded-full"
    />
  </div>
</div>
```

Or modify PingPongVideo to accept `objectPosition` prop.

#### 2. Reduce Avatar Size

Change from:
```tsx
width: "clamp(150px, 40vw, 220px)",
height: "clamp(150px, 40vw, 220px)",
```

To:
```tsx
width: "clamp(100px, 28vw, 150px)",
height: "clamp(100px, 28vw, 150px)",
```

#### 3. Change Button Size

```tsx
// Line 191-206 - Change from size="lg" to size="md"
<ChunkyButton 
  type="submit" 
  variant="primary" 
  size="md"  // Was "lg"
  className="w-full" 
  disabled={loading}
>
```

#### 4. OAuth Buttons - Icons Only, Side by Side

Replace the full-width text buttons with compact icon-only buttons in a row:

```tsx
{/* OAuth Buttons - Icon Only Side by Side */}
<motion.div
  initial={{ y: 20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ delay: 0.5, type: "spring" }}
  className="flex items-center justify-center gap-3"
>
  {/* Google Button - Icon Only */}
  <button
    type="button"
    onClick={handleGoogleSignIn}
    disabled={loading}
    className="w-12 h-12 rounded-full bg-card border border-border shadow-sm 
               flex items-center justify-center
               hover:bg-muted/50 transition-colors disabled:opacity-50"
  >
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      {/* Google logo paths */}
    </svg>
  </button>

  {/* Apple Button - Icon Only */}
  <button
    type="button"
    onClick={handleAppleSignIn}
    disabled={loading}
    className="w-12 h-12 rounded-full bg-card border border-border shadow-sm 
               flex items-center justify-center
               hover:bg-muted/50 transition-colors disabled:opacity-50"
  >
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      {/* Apple logo path */}
    </svg>
  </button>
</motion.div>
```

#### 5. Reduce Spacing Throughout

```tsx
// Container - reduce padding
<div className="flex flex-col items-center w-full max-w-sm mx-auto px-4 py-2 overflow-y-auto">

// Title section - reduce margin
className="flex flex-col items-center mb-2 sm:mb-4"

// Avatar section - reduce margin  
className="relative mb-3 sm:mb-4"

// Form spacing - reduce
className="w-full space-y-2"

// Input padding - reduce
className="w-full pl-11 pr-3 py-2.5 rounded-xl ..."

// Divider margin - reduce
className="flex items-center gap-3 w-full my-2"

// Guest option margin - reduce
className="flex flex-col items-center mt-3"
```

---

## Updated Layout Flow

```text
+----------------------------------+
|        გამარჯობა!               |  ← Full visible
|  შექმენი შენი პროფილი...        |
|                                  |
|      ╭───────────╮              |  ← Smaller avatar
|      │  [FACE]   │              |  ← Face centered
|      ╰───────────╯              |
|                                  |
|  ┌──────────────────────────┐   |
|  │ 🙍 სახელი                 │   |  ← Compact inputs
|  └──────────────────────────┘   |
|  ┌──────────────────────────┐   |
|  │ 🔒 პაროლი                 │   |
|  └──────────────────────────┘   |
|                                  |
|  ┌──────────────────────────┐   |
|  │   ✨ შექმენი ანგარიში    │   |  ← Medium size button
|  └──────────────────────────┘   |
|                                  |
|  ────────── ან ──────────       |
|                                  |
|       [G]    []               |  ← Icon-only buttons side by side
|                                  |
|  ან ითამაშე როგორც სტუმარმა    |
|        ↓                         |
+----------------------------------+
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/home/GuestWelcomePanel.tsx` | 1. Reduce avatar size<br>2. Center mascot face with scale/position transform<br>3. Change button to `size="md"`<br>4. OAuth buttons icon-only in flex row<br>5. Reduce all vertical spacing |

