

## Fix Category Selection Loop / Stuck State on VS Screen

### Problem
The VS Screen has a race condition: the category slot animation requires categories to be loaded from the database, but the animation stage timer doesn't wait for them. If categories load slowly (bad connection), the screen gets stuck on "finding-category" forever with no feedback to the user.

### Root Cause (VSScreen.tsx)
1. Stage transitions are timer-based: `opponent-found` -> 500ms -> `finding-category`
2. The category animation effect (line 168) has a guard: `if (stage !== "finding-category" || categoryPool.length === 0) return;`
3. If categories haven't loaded yet, `categoryPool` is empty, and the animation never starts
4. There is no re-trigger when categories finally load -- the effect only re-runs when `stage` or `categoryPool` changes, but `stage` is already "finding-category" and won't change again
5. No timeout or error state exists to rescue the user

### Solution

**File: `src/components/game/VSScreen.tsx`**

1. **Fix the race condition**: When the category animation effect runs and `categoryPool` is empty, don't just return -- the effect already depends on `categoryPool` in its dependency array, so when categories load and populate `categoryPool`, the effect SHOULD re-trigger. But the issue is `categoryPool` is set in a separate effect that only runs once (`categoryPool.length === 0` guard). We need to ensure the pool gets populated even if categories load after the stage is set.

   - Change the category pool initialization effect to not guard on `categoryPool.length === 0` when stage is "finding-category" (so it retries when categories arrive)
   - Or better: make the "finding-category" stage wait until categoryPool is ready before starting the slot animation

2. **Add a timeout**: If category selection doesn't complete within 10 seconds, show a connection error mini-modal with a retry button.

3. **Add a connection error mini-modal**: A small overlay on the VS screen that says the connection is bad and offers "Try Again" button.

### Changes

| File | Change |
|------|--------|
| `src/components/game/VSScreen.tsx` | Fix race condition in category pool init + animation; add 10s timeout with error state; add connection error mini-modal |

### Technical Details

**Fix 1 - Race condition (categoryPool init)**
```text
Current:
  useEffect: if categories.length > 0 && categoryPool.length === 0 -> set pool
  Problem: runs once, if categories arrive late, pool is set but animation already gave up

Fix: The animation effect depends on [stage, categoryPool] so it WILL re-run when categoryPool changes.
The actual bug is that categoryPool init has the guard "categoryPool.length === 0" which prevents
re-init on refresh. But the REAL issue is simpler: when handleRefresh resets categoryPool via
setCategoryPool([...]) on line 251-254, BUT also calls startMatchmaking() which unmounts the component.
The component remounts fresh with categoryPool=[] and categories might not have loaded yet in the
new mount's useCategories hook.

Solution: Remove the categoryPool.length === 0 guard from the init effect and instead use a ref
to track if pool was set for current stage cycle. Also, don't transition to "finding-category"
until categoryPool is ready.
```

**Fix 2 - Timeout**
```text
Add a useEffect that starts a 10-second timer when stage is "finding-category".
If stage doesn't progress to "category-found" within 10s, set an error state.
```

**Fix 3 - Error mini-modal**
```text
Small centered overlay with:
- Icon: WifiOff or similar
- Text: "კავშირი შეფერხებულია" (Connection interrupted)  
- Button: "თავიდან ცდა" (Try again) -> calls handleRefresh
- Button: "უკან" (Back) -> navigates home
```

