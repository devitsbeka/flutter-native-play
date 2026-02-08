

## Fix: Logout Button Not Clickable + Registration Link Opens Wrong Screen

### Issue 1: "გამოსვლა" (Logout) button not clickable

**Root Cause:** The `SideMenuDrawer` uses `z-50` for its fixed overlay, which is the same z-index as the `UniversalBottomNav` and other fixed elements. While the bottom nav is hidden when the menu is open (`showBottomNav={!isSideMenuOpen}`), the menu's own z-index may conflict with other `z-50` overlays on the page. Additionally, the logout button sits at the very bottom of the scrollable area with only `pb-6` padding and `pb-[env(safe-area-inset-bottom)]` on the scroll container. On devices where the safe area inset is 0 (like desktop browsers), the button can end up right at the edge, making it hard to tap.

**Fix:**
- **File: `src/components/home/SideMenuDrawer.tsx`**
  - Increase the menu's z-index from `z-50` to `z-[60]` so it definitively sits above all other fixed elements
  - Add more generous bottom padding to the logout section so the button is never too close to the screen edge (change from `pb-6` to `pb-10` plus keep the safe-area padding)

### Issue 2: "რეგისტრაცია" navigates to login instead of registration

**Root Cause:** The `Index.tsx` page correctly navigates to `/auth?mode=signup`, but the `Auth.tsx` page never reads the `mode` query parameter. The `isSignUp` state is always initialized as `false`:

```
const [isSignUp, setIsSignUp] = useState(false);
```

The `searchParams` are used to read `ref` and `returnTo`, but `mode` is completely ignored.

**Fix:**
- **File: `src/pages/Auth.tsx`**
  - Initialize `isSignUp` based on the `mode` query parameter:
    ```
    const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
    ```

### Summary of Changes

| File | Change |
|------|--------|
| `src/components/home/SideMenuDrawer.tsx` | Increase z-index to `z-[60]`; add more bottom padding to logout section |
| `src/pages/Auth.tsx` | Read `mode=signup` from URL query params to initialize signup mode |

