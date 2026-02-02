
# Plan: Show Logo Above Profile on Non-Game Pages

## Current Behavior

| Page | Current Logo Position |
|------|----------------------|
| Index (Home) | Header bar (centered between menu and bell icon) |
| TeamV2 (Online Game) | Header bar (left side) |
| TV Pages | Top left corner overlay |

## Desired Behavior

| Page | Desired Logo Position |
|------|----------------------|
| Index (Home) | **Above profile avatar** (in main content) |
| Other pages | **Above profile/content** where applicable |
| TeamV2 (Online Game) | Keep in header (above players list) ✓ |

---

## Technical Changes

### File 1: `src/pages/Index.tsx`

**1. Remove logo from header (line 433-440):**
```typescript
// Before:
{/* Center: Logo */}
<div className="flex-1 flex justify-center md:justify-start">
  <MyTriviaLiveLogo responsive className="md:hidden" />
  {/* Spotlight Search Bar - Hidden on mobile */}
  <div className="hidden md:flex flex-1">
    <SpotlightSearch />
  </div>
</div>

// After:
{/* Center: Spotlight only */}
<div className="flex-1 flex justify-center md:justify-start">
  {/* Spotlight Search Bar - Hidden on mobile */}
  <div className="hidden md:flex flex-1">
    <SpotlightSearch />
  </div>
</div>
```

**2. Add logo above profile for logged-in users (mobile) - around line 878:**
```typescript
{/* Mobile only: LOGGED IN USERS */}
{user && <motion.div 
  className="md:hidden flex flex-col items-center w-full max-w-[360px] px-4"
  ...
>
  {/* NEW: Logo above avatar */}
  <motion.div
    initial={{ y: -10, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.15, type: "spring" }}
    className="mb-4"
  >
    <MyTriviaLiveLogo responsive />
  </motion.div>

  {/* Existing avatar section */}
  <div className="relative">
    ...
  </div>
</motion.div>}
```

**3. Add logo above profile for md-xl breakpoints (around line 566):**
```typescript
{/* md to xl layout: Avatar centered */}
{user && <div className="hidden md:flex xl:hidden items-start justify-center w-full px-4 pt-[73px]">
  <motion.div className="flex flex-col items-center" ...>
    {/* NEW: Logo above avatar */}
    <div className="mb-6">
      <MyTriviaLiveLogo responsive />
    </div>
    
    {/* Existing avatar section */}
    <div className="relative">
      ...
    </div>
  </motion.div>
</div>}
```

**4. Add logo above profile for xl+ breakpoint (around line 785):**
```typescript
{/* xl+ layout: Avatar centered */}
{user && <motion.div className="hidden xl:flex flex-col items-center w-full px-4" ...>
  {/* NEW: Logo above avatar */}
  <div className="mb-6">
    <MyTriviaLiveLogo responsive />
  </div>
  
  {/* Existing avatar section */}
  <div className="relative">
    ...
  </div>
</motion.div>}
```

---

## Visual Layout

**Before (Index/Home mobile):**
```
┌──────────────────────────┐
│ ☰     MyTrivia LIVE   🔔 │  ← Logo in header
├──────────────────────────┤
│                          │
│    🎁   🔮   📦   ⚡     │
│         (avatar)         │
│       TriviaMaste        │
│       💰 1.4M  💎 170    │
│                          │
│      [ ითამაშე ]          │
└──────────────────────────┘
```

**After (Index/Home mobile):**
```
┌──────────────────────────┐
│ ☰                     🔔 │  ← Header without logo
├──────────────────────────┤
│                          │
│     MyTrivia LIVE        │  ← Logo above profile
│    🎁   🔮   📦   ⚡     │
│         (avatar)         │
│       TriviaMaste        │
│       💰 1.4M  💎 170    │
│                          │
│      [ ითამაშე ]          │
└──────────────────────────┘
```

**TeamV2 (Online Game) - Unchanged:**
```
┌──────────────────────────┐
│ MyTrivia LIVE    📷  🔔  │  ← Logo stays in header
├──────────────────────────┤
│ [ოთახები] [ექსპლორე] ... │
│                          │
│ Players list...          │
└──────────────────────────┘
```

---

## Summary

| File | Changes |
|------|---------|
| `Index.tsx` | Remove logo from header, add above profile in 3 viewport sections (mobile, md-xl, xl+) |

The TeamV2 (online game page) keeps the logo in its header position as currently implemented - no changes needed there.
