

## Restyle "გააცოცხლე ავატარი" Button

### What changes
One file: `src/components/home/AvatarCircle.tsx`, lines 398-418.

### Current
- Purple gradient (`#A855F7` to `#7C3AED`), small padding (`px-3 py-1.5`), positioned off-center-ish

### New style
- **Pink/purple gradient** matching a warmer tone: `linear-gradient(135deg, #E879F9 0%, #A855F7 50%, #7C3AED 100%)` (pink-to-purple)
- **Centered**: already uses `left-1/2 -translate-x-1/2`, just need to confirm no offset
- **Better padding**: increase to `px-5 py-2` so text has proper breathing room
- **Text size**: bump from `text-xs` to `text-sm` for readability

### Exact changes in `src/components/home/AvatarCircle.tsx`

**Line 401** - Update className padding:
```
px-3 py-1.5  -->  px-5 py-2
```

**Line 404** - Update gradient:
```
"linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)"
-->
"linear-gradient(135deg, #E879F9 0%, #A855F7 50%, #7C3AED 100%)"
```

**Line 405** - Update shadow to include pink glow:
```
"0 4px 12px rgba(124, 58, 237, 0.4), 0 2px 4px rgba(0,0,0,0.1)"
-->
"0 4px 14px rgba(168, 85, 247, 0.45), 0 2px 6px rgba(232, 121, 249, 0.3)"
```

**Line 417** - Bump text size:
```
text-xs  -->  text-sm
```

One file, four small tweaks.
