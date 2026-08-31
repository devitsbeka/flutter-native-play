# THE FOUR CROWNS — MyTrivia viral UGC campaign

**Platforms:** TikTok (primary) · Instagram Reels · Facebook Reels
**Cast:** 4 fictional creators, 4 separate accounts, all tagging **@mytrivia**
**Volume:** 12 videos per character (48 total), released over ~4 weeks

---

## The concept

Four strangers in four cities — LA, London, New York, Seoul — each independently
declare themselves **the King of MyTrivia**. Same blue-purple checkered sweater.
Same impossible yellow crown (each wears it differently: molded crown-hair, a
foam crown, flame spikes, star curls). None of them knows the others exist.

Then they find each other.

The campaign is a **slow-burn lore rivalry told across four accounts**:

1. **Phase 1 — Coronation (videos 1–3):** each character establishes their
   obsession solo. Standalone comedy. No mention of the others. The app
   appears naturally as *their* arena, never as an ad read.
2. **Phase 2 — Contact (videos 4–6):** they discover each other. Duets,
   stitches, screenshots, disbelief. "Who is this clown in London wearing MY
   sweater." Audiences cross-follow all four to keep up.
3. **Phase 3 — Cold War (videos 7–9):** receipts, challenges, recurring
   formats, fans forced to pick a side. @mytrivia official plays the confused
   referee in the comments.
4. **Phase 4 — The Crown Match (videos 10–12):** the showdown is teased,
   staged, and settled — inside the app's actual **MyTrivia King** mode
   ("Hard logic questions. One minute to think. First to 6 wins."). Payoff
   line of the whole campaign: **"There was never one king. There's a crown
   in the app, and anyone can take it."** Season 2 is built in.

## Why this goes viral (and not as an ad)

- **A uniform, not a logo.** The checkered sweater + yellow crown is a
  costume anyone can recreate. The fifth crown is the audience. Seed
  `#FourCrowns` / `#WhoIsTheKing` and reward imitators with duets from the
  characters.
- **Lore across accounts = follow-all-four behavior.** Each video works
  alone, but the beef only makes sense if you follow the whole square. This
  is the mechanic behind every successful character-lore account.
- **Beef is comment fuel.** Every video ends on an open wound ("he's still
  #2"), not a CTA. The algorithm feeds on the arguments.
- **Platform-native formats.** Duet bait, stitch bait, POV comedy, screen
  recordings with receipts — nothing that smells like a media buy.
- **The product IS the plot.** TV Party, Trivia Battle, the weekly
  leaderboard (2,000 coins + the gold Champion frame for #1), the King mode —
  every joke is a feature demo wearing a costume.

## The cast

| Character | City | Crown | Domain | File |
|---|---|---|---|---|
| **REMI** — King of the Living Room | Los Angeles | molded crown-hair | **TV Party** (one big screen, phones as controllers) | [remi-tv-party-king.md](remi-tv-party-king.md) |
| **IDRIS** — King of the Board | London | foam crown | **Weekly Regional & Global Leaderboards** | [idris-leaderboard-king.md](idris-leaderboard-king.md) |
| **VEGA** — Warlord of Trivia Battle | New York | yellow flame spikes | **Trivia Battle** (two teams, board of priced categories) | [vega-trivia-battle.md](vega-trivia-battle.md) |
| **JUNO** — The Oracle | Seoul | yellow star curls | **Guess the Logo / Celebrities / Guess the City** | [juno-the-oracle.md](juno-the-oracle.md) |

All four files open with a character bible (voice, look, camera grammar) so
every generated video stays consistent, then 12 scripts in campaign order.

## Posting mechanics

- **Cadence:** 3 videos/character/week, staggered so one Crown posts nearly
  every day. Phase transitions land on the same day across all four accounts
  (event energy).
- **Cross-account choreography:** beef happens in public — characters comment
  on each other's videos in persona within the first hour (early comments
  ride the video's initial push). Pin the spiciest reply.
- **@mytrivia official:** never explains. Comments like "we did not authorize
  four kings", reposts the best fan recreations, and drops exactly one video
  before the finale: the King mode tile with "settle it in here."
- **Duets:** every challenge video is framed center-right with dead space
  left — literally built to be dueted.
- **Platform cuts:** TikTok gets the raw 0.5×-selfie versions; IG Reels the
  same with cleaner captions; FB Reels the finale + best-of recuts (FB skews
  older — TV Party and family-night angles perform best there).
- **Localization:** scripts are written in English; the bits are visual and
  survive translation. For the Georgian audience, re-voice REMI's and JUNO's
  scripts first — TV Party and Guess-the-X are the most local-culture-proof.

## Timing note (from the codebase, not vibes)

`team_battle` and `king` are currently **dark-launched** (`coming_soon` /
`beta` in `src/game-types/registry.ts`). VEGA's Phase 1 and the entire Phase 4
finale depend on those modes being live. Either flip them live before week 3,
or use the gap: VEGA spends Phase 1 "training for a mode that doesn't exist
yet" (which is funnier anyway) and the finale becomes the modes' launch event.

## The one rule

No character ever says "download MyTrivia." They say "I'm #1 in it," "he
cheated in it," "my grandmother destroyed me in it." Want is generated by
status, not instruction. The only hard CTA in 48 videos is the finale's
"the crown's in the app" — and by then it's a plot resolution, not an ad.
