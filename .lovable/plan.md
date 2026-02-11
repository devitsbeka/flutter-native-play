

## Fix: Delete Button Hidden and Question Edits Not Applying

### Problem 1: Delete Button Hidden Behind Footer
The Embla carousel viewport sets `overflow: hidden` on its container, which means `overflow-y-auto` on individual `CarouselItem` elements has no effect -- content is simply clipped. The delete button at the bottom of each question card is cut off by the fixed save footer.

**Fix**: Increase the bottom margin on the card itself (`mb-4` to `mb-32`) so the delete button sits well above the footer area, and ensure the carousel content area scrolls properly by removing the ineffective `overflow-y-auto` and using `pt-4` with generous bottom padding.

### Problem 2: Question Edits Not Persisting
The `onSave` callback in `EditQuestionDialog` uses `editingQuestionIndex` captured in a closure. When React batches the state updates from `onSave` and `onOpenChange(false)` (which sets `editingQuestionIndex` to null), there's a risk of the updater function running with a stale or null index.

**Fix**: Capture `editingQuestionIndex` in a `useRef` so the `onSave` callback always reads the current value, regardless of React batching or closure timing.

### Changes (all in `src/components/social/EditQuizModal.tsx`)

1. **Add a ref to track editing index reliably**:
   - Create `const editingIndexRef = useRef<number | null>(null)`
   - Keep it in sync: whenever `editingQuestionIndex` changes, update the ref
   - In the `onSave` callback, read from `editingIndexRef.current` instead of the closure variable

2. **Fix delete button visibility**:
   - Change the card's bottom margin from `mb-4` to `mb-36` so the delete button clears the fixed footer
   - Remove `overflow-y-auto` from CarouselItem (it doesn't work with Embla's `overflow: hidden`)

3. **Keep `items-start`** from the previous fix so content aligns to the top of the viewport.
