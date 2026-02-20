

## Fix: Registered Users Showing as Guests in PostHog

### Root Causes

1. **`posthog.register()` does NOT set person properties** -- it only attaches super properties to future events. The PostHog persons list shows person properties, so guests (and even registered users on the persons page) don't display `user_type`. We need `posthog.setPersonProperties()` for this.

2. **Initialization timing issue** -- `initPostHog()` runs inside a `useEffect`, but `useIdentifyUser` also runs its own `useEffect` in the same render cycle. If `identify` or `register` fires before `init` completes, those calls are silently dropped.

### Changes

**File: `src/providers/PostHogProvider.tsx`**

1. Move `initPostHog()` call to run **synchronously at module level** (outside of `useEffect`) so PostHog is guaranteed to be ready before any hooks fire.

2. In the registered-user branch (line 44-57):
   - Keep the existing `posthog.identify()` call (this sets person properties correctly)
   - Keep `posthog.register({ user_type: "registered" })` for super properties on events

3. In the guest branches (lines 58-64):
   - Add `posthog.setPersonProperties({ user_type: "guest" })` so the persons list in PostHog shows `user_type`
   - Keep `posthog.register({ user_type: "guest" })` for super properties on events

4. In the logout/reset branch (line 58-61):
   - After `posthog.reset()`, call both `posthog.register()` and `posthog.setPersonProperties()` with `user_type: "guest"`

### Technical Detail

- `posthog.register()` = super properties attached to every future event (event-level)
- `posthog.setPersonProperties()` = updates the person record in PostHog (person-level, visible in persons list)
- `posthog.identify(id, props)` = sets person properties for identified users (already correct for registered)

