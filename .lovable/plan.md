
# Fix: QR Code Guest Join White Screen - Route Order Bug

## Problem Identified

When guests scan the QR code to join a TV game, they see a white screen and cannot join. The root cause is a **React Router route ordering bug** in `src/App.tsx`.

### The Bug

```javascript
// Current route order (BROKEN):
<Route path="/join" element={<TVJoin />} />
<Route path="/join/:code" element={<TVJoin />} />
<Route path="/join/session/:sessionId" element={<TVJoin />} />
```

When a guest visits `/join/session/5d4c72e8-...`:
1. `/join/:code` matches FIRST with `code = "session"` (literal string)
2. `/join/session/:sessionId` is NEVER reached

**Result:**
- `urlSessionId` = `undefined` (never set)
- `urlCode` = `"session"` (literal string, not UUID)
- `initialCode` = `"session"`
- `joinSession("session")` fails (no session with code "session")
- White screen or stuck on code entry

---

## The Fix

Reorder routes so the MORE SPECIFIC route comes FIRST:

```javascript
// Fixed route order:
<Route path="/join" element={<TVJoin />} />
<Route path="/join/session/:sessionId" element={<TVJoin />} />  // MOVED UP
<Route path="/join/:code" element={<TVJoin />} />
```

Now when visiting `/join/session/5d4c72e8-...`:
1. `/join` doesn't match
2. `/join/session/:sessionId` matches correctly with `sessionId = "5d4c72e8-..."`
3. Guest joins successfully!

---

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Reorder routes: move `/join/session/:sessionId` before `/join/:code` |

---

## Technical Details

### Route Matching in React Router

React Router v6 evaluates routes in order and uses the FIRST match. When two routes could match the same URL pattern, the more specific one must come first.

**Pattern matching:**
- `/join/:code` - Matches `/join/` followed by ANY segment (including "session")
- `/join/session/:sessionId` - Matches only `/join/session/` followed by a segment

Since "session" is a valid value for `:code`, the first route consumes the URL before the second route is checked.

### Why This Causes White Screen

1. `TVJoin` receives `urlCode = "session"` instead of `urlSessionId = UUID`
2. `ControllerCodeEntry` calls `joinSession("session")`
3. Supabase query finds no session with `tv_pairing_code = "SESSION"` or `id = "session"`
4. `joinSession` returns `false`
5. `setError('თამაში ვერ მოიძებნა...')` is called
6. If error display has issues OR user sees error and page doesn't recover, they see white screen

---

## Implementation

Change line order in `src/App.tsx` from:

```javascript
<Route path="/join" element={<TVJoin />} />
<Route path="/join/:code" element={<TVJoin />} />
<Route path="/join/session/:sessionId" element={<TVJoin />} />
```

To:

```javascript
<Route path="/join" element={<TVJoin />} />
<Route path="/join/session/:sessionId" element={<TVJoin />} />
<Route path="/join/:code" element={<TVJoin />} />
```

---

## Expected Outcome

After this fix:
1. Guest scans QR code → navigates to `/join/session/UUID`
2. Route `/join/session/:sessionId` matches correctly
3. `urlSessionId` = UUID (correct!)
4. `initialCode` = UUID
5. `ControllerCodeEntry` shows `GuestJoinModal`
6. Guest enters name → `joinSession(UUID, nickname)` succeeds
7. Guest joins game successfully

---

## Why This is Correct

- **Specificity Rule**: More specific routes should be defined before generic catch-all routes
- **No Breaking Changes**: The `/join/:code` route still works for 4-digit codes
- **Backwards Compatible**: All existing URL patterns continue to work

This is a one-line route reordering fix that solves the entire guest QR join flow.
