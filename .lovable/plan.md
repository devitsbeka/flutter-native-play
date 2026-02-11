

## Fix: Admin Buttons Not Working (Z-Index Stacking Issue)

### Root Cause

The `PlayerProfileModal` renders at `z-[100]`. The modals it opens are stuck behind it:

| Component | Current z-index | Result |
|-----------|----------------|--------|
| PlayerProfileModal | z-[100] | Visible |
| CreateQuizModal root | z-50 | Hidden behind profile modal |
| AdminProfileEditor DialogContent | z-[250] | Content is high, but Dialog overlay is default |

The `CreateQuizModal` at `z-50` is completely covered by the profile modal at `z-[100]`, so clicking "ტრივია" opens the modal but you can't see or interact with it.

The `AdminProfileEditor` uses Radix Dialog -- the `DialogContent` has `z-[250]` but the Dialog's portal overlay renders at default z-index, so it may also be partially blocked.

### Fix

#### 1. `src/components/social/CreateQuizModal.tsx` (line 1031)

Increase the root container z-index from `z-50` to `z-[200]` so it renders above the profile modal:

```
Before: className="fixed inset-0 z-50 flex flex-col"
After:  className="fixed inset-0 z-[200] flex flex-col"
```

Also update the inner header (line 1035) from `z-50` to `z-[201]` and the footer (line 875) from `z-50` to `z-[201]`.

#### 2. `src/components/profile/AdminProfileEditor.tsx` (line 64)

The Dialog itself needs a container class or a portal-level z-index. Wrap the Dialog or add a style to ensure the portal renders above z-[100]. The `DialogContent` already has `z-[250]`, but the overlay also needs it.

### Files Changed
| File | Change |
|------|--------|
| `src/components/social/CreateQuizModal.tsx` | Raise root, header, and footer z-indexes above z-[100] |
| `src/components/profile/AdminProfileEditor.tsx` | Ensure Dialog overlay also renders above profile modal |

