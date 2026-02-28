

## Update Invite Card Layout and Visibility on Profile Page

### Goal
Restructure the invite card to show icon on the left with text, badge, and share button stacked on the right (matching the reference screenshot). Only show the card for non-PRO users.

### Changes

#### 1. Update `InviteCard` in `src/components/profile/ProPlansSection.tsx`

**Layout change** (currently vertical, change to horizontal with stacked right side):
```text
[Icon]  Title text (მოიწვიე მეგობრები და გახდით PRO მომხმარებლები)
        [🎁 10 დღიანი PRO საჩუქრად] badge
        [გაზიარება] button
```

- Left: Users icon in a rounded square with pink-to-purple gradient (matching reference)
- Right: Title text, then reward badge below, then share button below

**Visibility change**: Only render `<InviteCard>` when `isNotPro` is true. Currently it renders unconditionally for all users including PRO users.

#### 2. Files to modify

| File | Change |
|------|--------|
| `src/components/profile/ProPlansSection.tsx` | Wrap `<InviteCard>` in `{isNotPro && ...}` condition; restructure InviteCard layout to horizontal with icon-left / content-right |

### Technical Details

- Move the `<InviteCard>` render (lines 148-164) inside the `{isNotPro && ...}` block, before the tier cards
- Update `InviteCard` component (lines 541-614): change from current vertical layout to a flex-row with icon on left (~48px) and flex-col content on right (title, badge, button)
- Use `Users` icon instead of `Share2` for the left icon to match the reference image's people icon
