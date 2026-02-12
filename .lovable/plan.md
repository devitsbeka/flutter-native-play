

# Fix ProGiftBanner Position and Text

## Changes

### File: `src/pages/Index.tsx`

**Logged-in mobile banner (line 976)**
- Add negative top margin (`-mt-8`) to move the banner up, away from the power-up buttons
- Change `mb-2` to `mb-4` for more spacing below

**Guest mobile banner (line 591)**
- Same upward shift with `-mt-4` and `mb-4`

### File: `src/components/home/ProGiftBanner.tsx`

**Text update (line 56-58)**
- Change text from: `გილოცავთ, PRO გაქვს 10 დღის განმავლობაში!`
- To: `გილოცავთ, თქვენ გაქვთ PRO 10 დღის განმავლობაში.`

**Font size increase (line 56)**
- Change `text-xs` to `text-sm` (20% larger, from 12px to 14px)

