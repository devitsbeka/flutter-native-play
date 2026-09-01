/**
 * The palette and type of the V3 home design, measured off the reference
 * screens (iPhone 3x captures, so every figure here is CSS px = pt).
 *
 * Nothing in here comes from the app's Tailwind tokens on purpose: this
 * design is a warm-paper page with navy ink, and it has to read exactly like
 * the reference rather than like the lavender wash the rest of the app sits
 * on. See docs/HOME_V3_DESIGN.md for where each number was taken from.
 */
export const V3 = {
  /** The page wash. Also the tab bar and the status-bar strip. */
  bg: "#f6eddf",
  /** Titles, names, active tab. */
  ink: "#21324c",
  /** Subtitles, counters, benefit blurbs. */
  muted: "#585f68",
  /** Inactive tab icon and label. */
  tabInactive: "#a7adb4",
  /** The "Categories to start with" band. */
  band: "#00060f",
  /** The offer banner above the tab bar, and its button's text. */
  sale: "#d05034",
  saleText: "#d46148",
  /** The PRO hero and benefit tiles. */
  blue: "#2a88bd",
  blueTileTop: "#7cc2e4",
  blueTileBottom: "#237cae",
  /** The closing "view all" band and its secondary text. */
  footerBand: "#e9e1d3",
  footerMuted: "#717882",
  footerLink: "#f3a155",
  /** The detail page: white paper, near-black ink, grey chips. */
  detailBg: "#ffffff",
  detailInk: "#1f1f1f",
  detailPill: "#838383",
  detailYears: "#464646",
  detailCard: "#f5f5f5",
  detailRing: "#dbdbdb",
  /** Rubik, the one face every screen of the reference is set in. */
  font: "'Rubik', 'Nunito', 'Inter', -apple-system, sans-serif",
  /** The offer strip stacked over the tab bar (see TabBar.tsx for the bar's own sizes). */
  saleBannerHeight: 45,
  /** Gap between the strip, the capsule, and the content above them. */
  chromeGap: 8,
  /** Phones are the design; wider screens get the same column, centred. */
  maxWidth: 480,
} as const;
