

## Update Invite Friends Modal: Icon, Text Size, Remove Link Box

### Changes (single file: `src/components/home/InviteFriendsModal.tsx`)

**1. Copy the uploaded icon into the project**
- Copy `user-uploads://group-of-people.png` to `src/assets/icons/group-of-people.png`
- Import it in the component

**2. Replace the icon section (lines 109-123)**
- Remove the circular container (`div` with gradient background and box-shadow)
- Replace with a plain `<img>` tag using the new `group-of-people.png` icon
- Size it at `w-20 h-20` (larger, no background circle)
- Keep the floating animation on the wrapper

**3. Increase text sizes by ~10% (lines 125-143)**
- Title: `text-lg` (18px) -> `text-xl` (20px)
- Description: `text-sm` (14px) -> `text-[15px]`

**4. Remove the referral link box (lines 163-186)**
- Delete the entire `motion.div` block that shows the generating state and the referral URL
- The link is still generated in the background for Copy/Share buttons to use -- just not displayed visually

**5. Clean up imports**
- Remove `Users` from lucide-react imports (no longer used)
- Remove `confettiGunIcon` import (unused)
- Add import for the new group-of-people icon
