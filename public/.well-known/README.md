# Universal Links

`apple-app-site-association` is what lets iOS open `https://mytrivia.io/...`
links inside the app instead of Safari. Without it, a challenge invite tapped
in Messages opens the website — on a phone that has the app installed.

## Before this works

The `appID` carries the real Team ID (`T38XQSM4L3`). iOS silently ignores a
file whose appID doesn't match the installed app, so if this is ever edited,
a wrong value fails the same way a missing file does — no error, links just
keep opening in Safari.

In Xcode, add the Associated Domains capability to the App target with:

```
applinks:mytrivia.io
applinks:www.mytrivia.io
```

## Serving requirements

Apple's CDN fetches this file, and it is strict:

- Served over HTTPS from `https://mytrivia.io/.well-known/apple-app-site-association`
- `Content-Type: application/json` — the file deliberately has no `.json`
  extension, so the header is set explicitly in `public/_headers`
- No redirects. Not even http→https, and not a trailing-slash redirect
- Unsigned JSON. The signed `.pkcs7` form is long obsolete

## Paths

The list mirrors the routes in `src/App.tsx` that make sense to open in the
app: invites, rooms, TV sessions, quizzes and profiles.

The `NOT` entries matter as much as the inclusions. Legal pages, support and
account deletion stay in the browser because that is where a reviewer, or
someone who has just deleted the app, expects them — routing
`/privacy-policy` into an app the reader may not have installed makes the
policy unreachable. `/admin` and `/docs` are not part of the shipped app at
all.

Order is significant: iOS takes the first matching entry, so the `NOT` rules
must stay below the patterns they carve out of.

## Checking it

After deploying, and after any change:

```
curl -sI https://mytrivia.io/.well-known/apple-app-site-association
```

Expect `200`, `content-type: application/json`, and no `location` header.
