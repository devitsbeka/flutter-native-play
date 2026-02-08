

## Match the Invite Friends "+" Button to the Category Section Style

### What Changes

**File: `src/components/team/RoomScoreboard.tsx`** (line 82)

Update the "+" button in the participants (მოთამაშეები) section header to use the exact same style as the "+" button in the category picker section:

- Change from `rounded-full` (circle) to `rounded-xl` (rounded square)
- Change from `w-9 h-9` to `w-10 h-10` (slightly larger, matching category button)
- Change from `border-2 border-dashed border-white/30` to `border border-dashed border-white/40` (thinner border, brighter)
- Remove the `bg-white/5 hover:bg-white/10` background so it matches the clean transparent look of the category button
- Update icon from `w-4 h-4 text-white/50` to `w-5 h-5 text-white/60` to match

### Technical Details

| Aspect | Current (Participants) | Target (Category style) |
|--------|----------------------|------------------------|
| Size | `w-9 h-9` | `w-10 h-10` |
| Shape | `rounded-full` | `rounded-xl` |
| Border | `border-2 border-dashed border-white/30` | `border border-dashed border-white/40` |
| Background | `bg-white/5 hover:bg-white/10` | none (transparent) |
| Icon | `w-4 h-4 text-white/50` | `w-5 h-5 text-white/60` |

This is a single-line style change in `RoomScoreboard.tsx` to make both buttons visually consistent.
