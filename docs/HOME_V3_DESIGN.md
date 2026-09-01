# The V3 home design

`src/features/home-v3` is a replica of a reference design (five iPhone
captures of a history-stories app) with MyTrivia's content in it. It is
reachable at **`mytrivia.io/newui`** (and `mytrivia://newui` on device), as a preview
beside the current home — the same arrangement `/dev/v2` had. Nothing on the
existing routes changes.

Two screens:

| Route                | Reference screen                          | File                          |
| -------------------- | ----------------------------------------- | ----------------------------- |
| `/newui`             | "Stories" home (captures 1–4)             | `pages/HomeV3.tsx`            |
| `/newui/path/:pathId` | Path detail ("The Hundred Years' War")    | `pages/PathDetailV3.tsx`      |

## Where every value comes from

Nothing on either screen is typed in. Every noun of the reference maps to
a MyTrivia thing, and every number and state is read from the system:

| On screen                          | Source                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------- |
| Category names, order, count       | `useCategories` — translated per language, language-specific ones filtered |
| Path counters (N categories, M levels) | `paths.ts` cuts that list by `type`; levels are the sum of `total_levels` |
| "Level 1 – N" on a path            | the largest `total_levels` in the path                                     |
| Streak flame + count               | `useMissionStreak`; the flame opens the missions sheet                      |
| Heart + count                      | `useFavorites`; the heart opens Discover on its Favourites tab (`?tab=favorites`) |
| Search                             | the app's spotlight search                                                  |
| PRO badges on cards                | `category.tier === "premium"` and no subscription; the tap opens the paywall |
| PRO hero, benefits, offer strip    | hidden for subscribers (`useVipStatus`)                                     |
| The six benefits                   | the paywall's own strings; the friends line is read off the plan the store offers on this platform, exactly as the paywall reads it |
| Offer strip label and end          | `public.promotions` — one live row, label in every language (`usePromotion`) |
| Offer strip clock                  | counts to the end of the local day, or to the offer's end on its last day  |
| Progress under each category       | `useCategoryProgress` ("Level 3 of 20")                                     |
| Portraits on the closing band      | the first three categories in the list that have a still                    |
| Categories to Start With           | the six picture-guess categories, in the database's order                   |
| Tapping a category                 | `/category/:id` — the real level grid, and play                             |

The four paths are the reference's paths: **classic**, **fun** (minus the
picture and party categories), **educational**, **pictures**. A category is
on exactly one path and the party category on none; `__tests__/homeV3.test.ts`
pins that. Their titles, tags and descriptions are UI copy under `homeV3` in
all seven locales, the way every other screen's copy is; descriptions carry
`**bold**` markers that `RichText` renders.

## The offer strip and its table

`supabase/migrations/20260924120000_promotions.sql` creates
`public.promotions`: a label per language, `starts_at`, `ends_at`, `active`.
Anyone can read a row while it is live (the policy hides scheduled and
expired rows), only admins can write. The strip shows the soonest-ending
live row and nothing when there is none, so an offer can be started, changed
or ended from the database with no deploy — and an old build can never show
a stale one.

Until the migration is applied through Lovable the query fails and the strip
simply stays off; nothing else on the page depends on it. The generated
types carry the table by hand (see the test in `__tests__/homeV3.test.ts`):
apply the migration before regenerating them, per CLAUDE.md rule 1.

## Measurements

The captures are 1320 × 2868 (iPhone, 3×), so **1 pt = 1 CSS px** and every
figure below was read off them with a pixel script rather than estimated. The
type is Rubik throughout (loaded in `index.css`).

Colours (`theme.ts`): page `#f6eddf`, ink `#21324c`, muted `#585f68`, tab
grey `#a7adb4`, band `#00060f`, offer strip `#d05034` / text `#d46148`, PRO
blue `#2a88bd`, closing band `#e9e1d3` with `#717882` and orange `#f3a155`.
Detail page: white, `#1f1f1f`, chip `#838383`, cards `#f5f5f5`, ring `#dbdbdb`.

Home, top to bottom (x, y from the screen's top-left, under the status bar):

- The MyTrivia logo (38px tall) where the reference has its title, x 28. Marks on the right
  end at x 410: flame 18 × 24, heart 24 × 20, magnifier 21, counters 16 medium.
- "Paths" 21 bold at x 25, "NEW" 12 bold superscript; subtitle 14/16 semibold.
- Path card 324 × 486, radius 20, gap 32, 24 in from the left. Hero icon in a
  191 × 141 box 30 down; white chip 24 tall at (24, 194) with 13 bold
  uppercase text in the card's dark hue; title 26/30 extra-bold white at 230;
  counters 20 bold at 316 (number white, unit in the card's light hue);
  "View →" 21 medium 18 from the foot; the tower trail 134 × 152 in the corner.
- Band 24 below the cards: title 21 bold white 32 down, tiles 18 under it,
  the band ending on the tiles' bottom edge; names on the paper beneath.
- PRO hero 439 tall, full bleed: 28/30 bold, 20/24 semibold `#d7dbe0`,
  "→ View PRO offers" 17 bold at 389.
- "All PRO Benefits" 22 bold, 32 under the hero; cards 300 wide with a 26
  gap, 22 in: 72 tile in a 3 white frame (radius 18/21), 16 bold title, 14/18
  blurb.
- Rows 70 apart: heading 21 bold at x 28.7, subtitle 14/17 semibold; tiles
  145 × 218 radius 20, gap 16, 18 under the subtitle; names 17/23 bold, 12
  under the tile and 12 in from its edge, two lines reserved; "→ View
  collection" 16 medium, arrow 22, 10 gap, 14 under the names.
- Closing band 150 tall, 50 under the last row: 20 bold, 15/20, orange
  16 bold link; three 64 portraits with a 3 border fanned 24 apart, 36
  from the right.
- Offer strip 45 tall: mark at 12, label 15, clock 15 tabular, white 75 × 24
  button (radius 6, 15 bold) 16 from the right.
- Tab bar: not the reference's. It is drawn the way iOS 26 draws its own —
  a 62px Liquid Glass capsule floating 6px above the home-indicator inset,
  16px in from the sides, SF Symbols-style glyphs (house, safari, globe,
  person, outline and .fill), 10pt system-font labels, system blue for the
  selected tab on its own glass highlight. The offer strip stacks 8px above
  it with the same inset and a 16px radius.

Detail page: back chevron at (31, 15); hero 211 tall centred; title 25 bold;
grey chip 32 tall radius 10, 15 bold uppercase; range line 18 bold
`#464646`; description card 32 in, 24 padding, 16/24 text folded at ~4.6
lines with a fade and "MORE" 12 bold on the fifth baseline; two 67-tall stat
tiles at the edges with a 48 ring, 14 label, 24 bold number; then one row per
category, icon on a 96-wide plinth centred on the screen, 17/24 bold name
from x 299.

## Verifying it

Render at 440 × 956, 3× — Chromium via Playwright, `deviceScaleFactor: 3` —
and compare element boxes against the captures; that is how the numbers
above were checked (they agree to within 2 px). On iOS the safe-area insets
do the rest: the status-bar strip is painted in the page colour through a
portal (see `PageHeader` for why), and both pages own their scrolling
(CLAUDE.md 4b).

## Promoting it

To make it the home: point the `/` route at `HomeV3` in `App.tsx` and make
the tab bar's Home tab treat `/` as home. The rest of the app is untouched
by it, so nothing else needs to move.
