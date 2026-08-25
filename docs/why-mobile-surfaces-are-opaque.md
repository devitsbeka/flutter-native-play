# Why mobile surfaces are opaque

Why these surfaces are opaque on a phone and glass on a desktop.

`backdrop-filter` is cheap in a desktop browser and expensive in WKWebView —
and on a large surface inside a scrolling container it is worse than
expensive: it asks the compositor to re-sample everything behind it on every
frame, and when it cannot keep up it does not slow down. It hands back stale
or empty tiles. That is what "the whole page is glitching" looks like from
the outside: a card row that paints half of itself, artwork that never
appears, a screenful of blank under content that is really there.

Discover stacked two of them — the sheet, and the tab strip sticky inside it
— over a sticky full-height image. The Shop's header is a third.

The rule is a width, not a platform. iOS Safari runs the same engine as the
app, so a Capacitor check would have fixed the app and left mobile web
exactly as broken. Below md the surfaces are opaque, in a colour close
enough that the design reads the same; md and up keeps the glass, where it
works and costs nothing.

Nothing is lost by it: what sits behind these surfaces is either artwork
nobody is meant to read through or the page's own flat background.

This file is the note, not the mechanism — the classes live at the call
sites, as `bg-… md:bg-…/… md:backdrop-blur-…`, so there is no runtime
branch to get wrong.
