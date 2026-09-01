export type V3Tab = "home" | "explore" | "battle" | "profile";

interface TabBarProps {
  active: V3Tab;
  labels: Record<V3Tab, string>;
  onSelect: (tab: V3Tab) => void;
}

/** The capsule's own height; the page reserves it plus its float and gap. */
export const IOS_TAB_BAR_HEIGHT = 62;
/** How far the capsule floats above the home-indicator inset. */
export const IOS_TAB_BAR_FLOAT = 6;
/** Side inset of the capsule and of anything stacked over it. */
export const IOS_TAB_BAR_INSET_X = 16;

/** Apple's system font, which on an iPhone is SF Pro. */
const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif';
const SYSTEM_BLUE = "#007aff";
const SYSTEM_GREY = "#6e6e73";

/**
 * A tab bar drawn the way iOS 26 draws its own: a floating Liquid Glass
 * capsule (translucent, blurred, hair-lined, softly shadowed), SF Symbols
 * glyphs in their outline and .fill variants, 10pt system-font labels, and
 * system blue for the selected tab on its own glass highlight.
 *
 * It is a rendering of UIKit's tab bar, not UIKit itself — a webview cannot
 * host native views without a plugin — but it uses the platform's font and
 * the platform's colours, so on an iPhone it reads as the system's.
 */
export function TabBar({ active, labels, onSelect }: TabBarProps) {
  const tabs: Array<{ id: V3Tab; icon: (active: boolean) => JSX.Element }> = [
    { id: "home", icon: (a) => <HouseSymbol filled={a} /> },
    { id: "explore", icon: (a) => <SafariSymbol filled={a} /> },
    { id: "battle", icon: (a) => <GlobeSymbol filled={a} /> },
    { id: "profile", icon: (a) => <PersonSymbol filled={a} /> },
  ];
  return (
    <nav
      className="fixed left-0 right-0 z-50 pointer-events-none"
      style={{ bottom: `calc(var(--safe-bottom) + ${IOS_TAB_BAR_FLOAT}px)`, paddingLeft: IOS_TAB_BAR_INSET_X, paddingRight: IOS_TAB_BAR_INSET_X, fontFamily: SYSTEM_FONT }}
      aria-label="Tab bar"
    >
      <div
        className="mx-auto flex items-stretch pointer-events-auto"
        style={{
          maxWidth: 448,
          height: IOS_TAB_BAR_HEIGHT,
          padding: 5,
          borderRadius: IOS_TAB_BAR_HEIGHT / 2,
          background: "rgba(255, 255, 255, 0.62)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow:
            "0 0 0 0.5px rgba(255,255,255,0.7) inset, 0 1px 0 rgba(255,255,255,0.8) inset, 0 0 0 0.5px rgba(0,0,0,0.06), 0 10px 30px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.06)",
        }}
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          const color = isActive ? SYSTEM_BLUE : SYSTEM_GREY;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(t.id)}
              className="flex-1 flex flex-col items-center justify-center active:opacity-70 transition-colors"
              style={{
                color,
                borderRadius: 26,
                background: isActive ? "rgba(0, 0, 0, 0.07)" : "transparent",
                boxShadow: isActive ? "0 0 0 0.5px rgba(255,255,255,0.6) inset, 0 1px 2px rgba(0,0,0,0.06)" : "none",
                WebkitTapHighlightColor: "transparent",
                gap: 2,
              }}
            >
              <div style={{ height: 26, display: "flex", alignItems: "center" }}>{t.icon(isActive)}</div>
              <span style={{ fontSize: 10, fontWeight: 500, lineHeight: "12px", letterSpacing: "0.01em" }}>{labels[t.id]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* SF Symbols, redrawn: house / house.fill, safari / safari.fill,
   globe, person / person.fill. 24pt boxes, 1.7pt strokes (regular weight). */

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function HouseSymbol({ filled }: { filled: boolean }) {
  return (
    <svg width="26" height="24" viewBox="0 0 26 24" aria-hidden>
      {filled ? (
        <path d="M12.3 2.4a1 1 0 0 1 1.4 0l9.6 8.9a1 1 0 0 1-.7 1.7h-1.9v7.5a1.6 1.6 0 0 1-1.6 1.6h-4.2v-6.3a1.2 1.2 0 0 0-1.2-1.2h-1.4a1.2 1.2 0 0 0-1.2 1.2v6.3H6.9a1.6 1.6 0 0 1-1.6-1.6V13H3.4a1 1 0 0 1-.7-1.7z" fill="currentColor" />
      ) : (
        <path d="M13 3 3.5 11.9h2.3v8.2c0 .6.5 1 1 1h4.6v-6.6c0-.5.4-.9.9-.9h1.4c.5 0 .9.4.9.9v6.6h4.6c.6 0 1-.4 1-1v-8.2h2.3z" {...stroke} />
      )}
    </svg>
  );
}

function SafariSymbol({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      {filled ? (
        <>
          <circle cx="12" cy="12" r="10" fill="currentColor" />
          <path d="m17.2 6.8-3.4 7.4-7 3 3.4-7.4z" fill="#ffffff" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9.2" {...stroke} />
          <path d="m16.6 7.4-2.9 6.3-6.3 2.9 2.9-6.3z" {...stroke} />
        </>
      )}
      <path d="M12 3.6v1.2M12 19.2v1.2M3.6 12h1.2M19.2 12h1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity={filled ? 0 : 0.7} />
    </svg>
  );
}

function GlobeSymbol({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9.2" {...stroke} fill={filled ? "currentColor" : "none"} />
      <g {...stroke} stroke={filled ? "#ffffff" : "currentColor"} strokeWidth={filled ? 1.3 : 1.5}>
        <path d="M3 12h18M12 2.8c2.6 2.6 3.9 5.7 3.9 9.2s-1.3 6.6-3.9 9.2c-2.6-2.6-3.9-5.7-3.9-9.2S9.4 5.4 12 2.8ZM4.6 7.6h14.8M4.6 16.4h14.8" />
      </g>
    </svg>
  );
}

function PersonSymbol({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      {filled ? (
        <>
          <circle cx="12" cy="7.6" r="4.6" fill="currentColor" />
          <path d="M3.4 20.2c.7-4 4.2-6.5 8.6-6.5s7.9 2.5 8.6 6.5c.1.7-.4 1.3-1.1 1.3H4.5c-.7 0-1.2-.6-1.1-1.3Z" fill="currentColor" />
        </>
      ) : (
        <>
          <circle cx="12" cy="7.6" r="4.1" {...stroke} />
          <path d="M4.2 20c.7-3.7 3.9-6 7.8-6s7.1 2.3 7.8 6c.1.6-.4 1-1 1H5.2c-.6 0-1.1-.4-1-1Z" {...stroke} />
        </>
      )}
    </svg>
  );
}
