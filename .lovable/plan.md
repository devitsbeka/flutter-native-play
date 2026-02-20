

## Beautify Invite Friends Modal with Blue/Pink/Purple Gradient

### Changes (single file)

**File: `src/components/home/InviteFriendsModal.tsx`**

1. **Background gradient**: Replace the current warm white/lavender gradient with a vibrant blue-to-pink-to-purple gradient:
   - `linear-gradient(135deg, #667eea 0%, #a855f7 40%, #ec4899 100%)` on the main container
   - Outer glow shadow in purple tones
   - Border updated to semi-transparent white for glassmorphism

2. **Text colors**: Switch from dark gray to white text throughout:
   - Title: `text-white` (bold)
   - Description: `text-white/80`
   - "10 დღიანი PRO" highlight: bright yellow/gold (`text-yellow-300`)

3. **Icon circle**: Keep the purple gradient but brighten it to stand out against the new background, add a stronger glow

4. **PRO badge pill**: Change from lavender to a semi-transparent white glassmorphic style:
   - `background: rgba(255,255,255,0.15)`, `backdrop-filter: blur(10px)`
   - Text: `text-white`

5. **Referral link box**: Semi-transparent dark overlay for contrast:
   - `background: rgba(0,0,0,0.15)`, rounded, `text-white/70`

6. **Action buttons**: Use `ChunkyButton` with proper sizing:
   - Copy button: `variant="white"` or custom white style for visibility on gradient
   - Share button: `variant="outline"` with white border
   - Both keep `size="md"` to fit within the modal width
   - Ensure `flex-1` and no overflow

7. **"მოგვიანებით" dismiss link**: `text-white/50` with hover `text-white/80`

8. **Decorative glow**: Update the radial glow at the top from amber to a pink/white glow for cohesion

### Visual Result
A rich, vibrant gradient card with white text, glassmorphic elements, and properly sized buttons that fit cleanly within the modal bounds -- matching the blue/pink/purple aesthetic the user requested.
