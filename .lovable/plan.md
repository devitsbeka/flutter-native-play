

# Fix Leaderboard Visibility & Unify Desktop/Tablet Layout

## Issues to Fix

1. **Text/Arrow Visibility**: White text and arrows are blending with the light background - need dark/contrasting colors
2. **Desktop Layout**: Change to match tablet behavior - show single "ნახე რეიტინგი" button that opens relevant league list in modal
3. **Button Positioning**: Ensure the button is at the bottom with proper spacing from trophies

---

## Implementation Plan

### 1. Fix League Navigation Visibility (Both Tablet & Desktop)

**Current**: White text/arrows on light lavender background = hard to read
**Solution**: Use dark text colors with proper contrast

```text
Changes to league navigation header:
- Text: Change from text-white to text-foreground (dark)
- Arrows: Change from text-white to text-foreground
- Arrow buttons: Use bg-foreground/10 instead of bg-white/20
- Drop shadows: Add text-shadow for extra contrast
```

### 2. Unify Desktop Layout with Tablet

**Current Desktop**: Shows 3 leaderboard cards side-by-side with all players visible
**New Desktop**: Same as tablet - league nav at top + "ნახე რეიტინგი" button at bottom that opens modal

```text
Desktop layout change:
- Remove the 3-column grid of leaderboard cards
- Show league navigation at top (like tablet)
- Add large centered "ნახე რეიტინგი" button at bottom
- Clicking button opens Dialog with league list (just like tablet)
```

### 3. Button Positioning

**Current**: Button is positioned with pb-32
**Improvement**: Use absolute positioning at bottom with safe distance from trophies

```text
Button container:
- Position absolute at bottom
- Add proper bottom spacing (e.g., bottom-24 to bottom-32)
- Center horizontally
- Ensure it doesn't overlap trophy images
```

---

## File Changes

### src/pages/Leaderboards.tsx

#### DesktopLeaderboards Component (~lines 382-477)

Replace the 3-column grid layout with tablet-style layout:

```tsx
function DesktopLeaderboards({ userTier, region }: { userTier: number; region?: string }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [activeTier, setActiveTier] = useState(2);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { leaderboard, isLoading, userEntry, previousRank } = useLeagueLeaderboard(activeTier, region);
  
  // ... tier navigation handlers (unchanged)
  
  return (
    <LeaderboardHeroBackground>
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* League Navigation - with DARK text for visibility */}
        <div className="mx-6 mt-4 flex justify-center">
          <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-3 px-5 border border-white/40 shadow-lg">
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-full bg-foreground/10 hover:bg-foreground/20">
                <ChevronLeft className="w-5 h-5 text-foreground" /> {/* Dark arrows */}
              </button>
              
              <div className="flex items-center gap-2.5">
                <img src={TROPHY_IMAGES[activeTier]} className="w-7 h-7" />
                <span className="text-foreground font-bold text-lg"> {/* Dark text */}
                  {LEAGUE_NAMES[activeTier]}
                </span>
              </div>
              
              <button className="...">
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* View Rating button at bottom */}
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2">
          <button onClick={() => setIsModalOpen(true)} className="...">
            ნახე რეიტინგი
          </button>
        </div>
      </div>
      
      {/* Modal with leaderboard list (same as tablet) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        {/* ... same modal content as tablet */}
      </Dialog>
    </LeaderboardHeroBackground>
  );
}
```

#### TabletLeaderboards Component (~lines 481-638)

Update colors for visibility:

```tsx
// Arrow buttons - use dark foreground
<button className="p-2 rounded-full bg-foreground/10 hover:bg-foreground/20 transition-all">
  <ChevronLeft className="w-5 h-5 text-foreground" />
</button>

// Title text - use dark foreground
<h2 className="text-xl text-foreground font-bold">
  {LEAGUE_NAMES[currentTier]?.toUpperCase()}
</h2>

// Container - use higher opacity white bg
<div className="bg-white/50 backdrop-blur-xl rounded-2xl p-3 border border-white/40">
```

---

## Visual Summary

```text
Before Desktop:
+------------------------------------------+
| [bg with trophies]                       |
|  < 🏆 ᲝᲥᲠᲝᲡ ᲚᲘᲒᲐ > (white, hard to see)  |
|                                          |
| [Silver Card] [Gold Card] [Bronze Card]  |  <- Remove these
+------------------------------------------+

After Desktop (matches tablet):
+------------------------------------------+
|  [bg-white/50 blur container]            |
|  < 🏆 ᲝᲥᲠᲝᲡ ᲚᲘᲒᲐ > (dark text, visible!) |
|                                          |
|    [background with all trophies]        |
|                                          |
|    [ ნახე რეიტინგი ]  <- bottom button   |
+------------------------------------------+
```

---

## Technical Details

### Color Changes for Visibility

| Element | Before | After |
|---------|--------|-------|
| League title | `text-white` | `text-foreground` |
| Arrow icons | `text-white` | `text-foreground` |
| Arrow button bg | `bg-white/20` | `bg-foreground/10` |
| Container bg | `bg-white/30` | `bg-white/50` |
| "Your league" text | `text-white/80` | `text-primary` |

### Button Positioning

- Use `absolute bottom-28 left-1/2 -translate-x-1/2` to ensure button stays at bottom
- Add `z-20` to ensure it's above the background
- Keep safe distance from bottom nav (pb-24 or bottom-28)

