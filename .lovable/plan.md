
# Translate All Hardcoded Strings in User-Facing Modals

## Summary
There are 12 modal/screen components with hardcoded Georgian (and some English) strings that bypass the `t()` translation system. This means they won't adapt when users switch languages.

## Scope of Changes

### Phase 1: Add Translation Keys to `src/locales/ka.ts`

Add new translation keys under appropriate sections for all discovered hardcoded strings (~100+ strings total). Key groups to add:

- `guestModal.*` - GuestMaxPlaysModal strings
- `authModal.*` - AuthRequiredModal strings (validation, labels, errors, toasts)
- `proModal.*` - ProRequiredModal strings
- `completedLevel.*` - CompletedLevelModal strings (currently in English!)
- `powerUpDetail.*` - PowerUpDetailModal button labels
- `guestJoin.*` - GuestJoinModal strings
- `controllerWaiting.*` - ControllerRoundIntroWaiting strings
- `gameInvite.*` - GameInviteModal strings
- `categoryWheel.*` - CategoryWheelModal strings
- `playLimit.*` - PlayLimitModal registered-user section
- `notifications.*` - NotificationsPanel strings
- Extend `spin.*` for LuckySpinModal's remaining hardcoded strings

### Phase 2: Update Each Modal Component

Replace every hardcoded string with `t("key")` calls. Each file needs:
1. Import `useLanguage` (if not already imported)
2. Call `const { t } = useLanguage()` in the component
3. Replace all string literals with `t()` calls

**Files to modify (12 total):**

| File | Hardcoded Count | Notes |
|---|---|---|
| `GuestMaxPlaysModal.tsx` | 5 strings | Title, benefits, button |
| `AuthRequiredModal.tsx` | ~20 strings | Validation, labels, toasts, placeholders |
| `ProRequiredModal.tsx` | ~10 strings | Feature messages, title, buttons |
| `CompletedLevelModal.tsx` | ~7 strings | All in English - needs Georgian too |
| `PowerUpDetailModal.tsx` | 2 strings | Button labels only |
| `GuestJoinModal.tsx` | ~14 strings | Validation, labels, benefits, buttons |
| `ControllerRoundIntroWaiting.tsx` | 3 strings | Status messages |
| `GameInviteModal.tsx` | ~7 strings | Title, labels, buttons |
| `CategoryWheelModal.tsx` | ~5 strings | Phase headers, status text |
| `PlayLimitModal.tsx` | ~10 strings | PRO upgrade section |
| `LuckySpinModal.tsx` | 2 strings | Header title, SPIN button |
| `NotificationsPanel.tsx` | ~8 strings | Header, tabs, empty states, toasts |

### Phase 3: Update `src/locales/en.ts` (and other locale files)

Add English translations for all new keys so other languages inherit proper defaults.

## Technical Details

- All new keys follow existing naming conventions in `ka.ts`
- Fallback pattern `t("key") || "hardcoded"` already used in some places (e.g., PlayLimitModal line 72) will be replaced with clean `t()` calls
- The `CompletedLevelModal` is especially important since it's entirely in English right now (e.g., "Best Score", "Play Again", "Close")
- Toast messages in `AuthRequiredModal` and `NotificationsPanel` also need translation keys
