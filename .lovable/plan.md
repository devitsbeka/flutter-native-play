
## Integrate PostHog Analytics

### What This Does
Adds PostHog product analytics to the app, giving you automatic pageview tracking, session recording capabilities, user identification, and custom event capture -- all without extra configuration.

### Changes

#### 1. Install PostHog package
Add `posthog-js` as a dependency (the official PostHog JavaScript SDK).

#### 2. Create PostHog provider (`src/providers/PostHogProvider.tsx`)
A new provider component that:
- Initializes PostHog with your API key (`phc_mJKmSyJCq92bAxkvo7NZmdP7UZP79zqmJ7AX9E5vFYA`)
- Sets `api_host` to `https://us.i.posthog.com` (PostHog Cloud US)
- Enables automatic pageview capture (works with React Router)
- Disables capturing before user consent if needed (can be toggled later)
- Wraps the app with PostHog's React context so you can use `usePostHog()` hook anywhere

#### 3. Add user identification (`src/providers/PostHogProvider.tsx`)
Inside the provider, listens for auth state changes:
- When a user logs in: calls `posthog.identify(userId)` with their profile properties (nickname, country, VIP status, coins)
- When a user logs out: calls `posthog.reset()` to clear the identified user
- This links anonymous pre-login events to the authenticated user automatically

#### 4. Add route change tracking (`src/providers/PostHogProvider.tsx`)
Listens to React Router's `useLocation` to fire `posthog.capture('$pageview')` on every route change, so you get full navigation paths in PostHog.

#### 5. Wire into the app (`src/main.tsx`)
Wrap the app with the PostHog provider at the root level (outside of `BrowserRouter` so it initializes first).

### What You Get Out of the Box
- **Pageviews**: every route change automatically tracked
- **User paths**: see how users navigate through your app
- **Session recordings**: watch real user sessions (enable in PostHog dashboard)
- **User identification**: link events to specific users with their profile data
- **Retention analysis**: see how often users return
- **Funnel analysis**: track conversion through game flows

### Technical Details

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Install | Add `posthog-js` dependency |
| `src/providers/PostHogProvider.tsx` | Create | PostHog init, user identification, pageview tracking |
| `src/main.tsx` | Edit | Wrap app with PostHogProvider |

**PostHog Configuration:**
- API Key: `phc_mJKmSyJCq92bAxkvo7NZmdP7UZP79zqmJ7AX9E5vFYA` (publishable, safe in client code)
- API Host: `https://us.i.posthog.com`
- Auto capture: enabled (clicks, inputs, form submissions)
- Pageview capture: manual via React Router (to capture SPA navigation correctly)
- Session recording: enabled (can be toggled in PostHog dashboard)
