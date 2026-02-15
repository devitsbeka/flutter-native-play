
## Fix "გააცოცხლე ავატარი" Button: Centering, Padding, and Color

### File: `src/components/home/AvatarCircle.tsx` (lines 401-417)

### Changes

1. **Blue/Pink gradient** (instead of purple):
   - From: `linear-gradient(135deg, #E879F9 0%, #A855F7 50%, #7C3AED 100%)`
   - To: `linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #3B82F6 100%)` (pink -> violet -> blue)

2. **Shadow to match** new colors:
   - From: `0 4px 14px rgba(168, 85, 247, 0.45), 0 2px 6px rgba(232, 121, 249, 0.3)`
   - To: `0 4px 14px rgba(59, 130, 246, 0.4), 0 2px 6px rgba(236, 72, 153, 0.3)`

3. **Proper centering** -- add `justify-center` and increase right padding:
   - From: `px-5 py-2`
   - To: `px-6 py-2`

4. **Ensure true centering** -- the button already has `left-1/2 -translate-x-1/2` which should center it. The visual offset in the screenshot may be caused by the content not being centered inside. Adding `justify-center` to the flex container will fix this.

### Technical Summary
One file, lines 401-417. Four inline style/class tweaks.
