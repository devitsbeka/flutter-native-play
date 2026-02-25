

## Fix: Prevent Invite Friends Modal from flashing for PRO users

### Problem
The "Invite Friends" modal briefly appears (glitches) for PRO users because there's a timing gap between when `vipLoading` transitions from `true` to `false` and when `isVip` is confirmed `true`. During this gap, the modal can mount and render for a frame before being dismissed.

### Solution
Two targeted fixes in `src/components/home/InviteFriendsModal.tsx`:

1. **`useInviteModalVisibility` hook**: Before showing the modal, also check the localStorage VIP cache. If the cache says the user is PRO, skip showing the modal entirely -- don't even wait for the async fetch. This prevents the flash because the cached value is available synchronously on first render.

2. **`InviteFriendsModal` component**: Add a brief render delay (e.g., 150ms after `open` becomes true) before actually mounting the dialog content. This gives VIP status time to resolve from the fast DB fetch, so PRO users never see even a single frame of the modal.

### Files to modify
- `src/components/home/InviteFriendsModal.tsx`

### Technical details

**Hook fix (primary)**:
```typescript
// In useInviteModalVisibility, add cached VIP check
useEffect(() => {
  if (!user || vipLoading || isVip) return;
  // Also check localStorage cache synchronously
  try {
    if (localStorage.getItem("cached_vip_status") === "true") return;
  } catch {}
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
  } catch {}
  setVisible(true);
}, [user, isVip, vipLoading]);
```

**Component render guard (secondary safety net)**:
```typescript
// Add a small mount delay to prevent single-frame flash
const [ready, setReady] = useState(false);
useEffect(() => {
  if (open) {
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }
  setReady(false);
}, [open]);

if (!open || !ready || (isVip && !vipLoading)) return null;
```

This dual approach ensures PRO users never see the modal -- not even for a single frame.

