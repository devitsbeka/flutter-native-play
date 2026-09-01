import { V3 } from "../theme";

export type V3Tab = "home" | "explore" | "battle" | "profile";

interface TabBarProps {
  active: V3Tab;
  labels: Record<V3Tab, string>;
  onSelect: (tab: V3Tab) => void;
}

/**
 * Four labelled tabs on the paper: 20px line icons, 13px labels, the active
 * one filled in ink and the rest in grey. The tabs spread across a 392px
 * band so their centres land 98px apart like the reference's.
 */
export function TabBar({ active, labels, onSelect }: TabBarProps) {
  const tabs: Array<{ id: V3Tab; icon: (active: boolean) => JSX.Element }> = [
    { id: "home", icon: (a) => <HomeGlyph active={a} /> },
    { id: "explore", icon: (a) => <PlayGlyph active={a} /> },
    { id: "battle", icon: (a) => <GlobeGlyph active={a} /> },
    { id: "profile", icon: (a) => <UserGlyph active={a} /> },
  ];
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ background: V3.bg, paddingBottom: V3.tabBarInset, fontFamily: V3.font }}
    >
      <div className="mx-auto flex" style={{ height: V3.tabBarHeight, maxWidth: 392, paddingTop: 15 }}>
        {tabs.map((t) => {
          const isActive = t.id === active;
          const color = isActive ? V3.ink : V3.tabInactive;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className="flex-1 flex flex-col items-center"
              style={{ color, WebkitTapHighlightColor: "transparent" }}
            >
              <div style={{ height: 20 }}>{t.icon(isActive)}</div>
              <span style={{ marginTop: 2, fontSize: 13, fontWeight: 500, lineHeight: "16px" }}>{labels[t.id]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const line = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function HomeGlyph({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" {...(active ? { fill: "currentColor", stroke: "currentColor", strokeWidth: 2, strokeLinejoin: "round" } : line)} />
    </svg>
  );
}

function PlayGlyph({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="4" {...line} />
      <path d="m10 8.5 5 3.5-5 3.5z" {...(active ? { fill: "currentColor" } : line)} />
    </svg>
  );
}

function GlobeGlyph({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" {...line} {...(active ? { fill: "currentColor", fillOpacity: 0.12 } : {})} />
      <path d="M7.5 4.2c1.2 1.6.8 3.2-.6 4.2S5 10.8 6.3 12c1.2 1 3 .6 3.6 2.2.5 1.4-.4 2.6.3 4M14.5 3.6c-1 1.6.2 2.6 1.7 3s2.6 1.6 1.8 3-2.6.9-3.4 2.4c-.6 1.2.5 2.2 1.8 2.6s2.8.2 3.7-.8" {...line} />
    </svg>
  );
}

function UserGlyph({ active }: { active: boolean }) {
  return (
    <svg width="17" height="21" viewBox="0 0 20 24" aria-hidden>
      <circle cx="10" cy="7" r="5" {...line} {...(active ? { fill: "currentColor" } : {})} />
      <path d="M2 22.5a8 8 0 0 1 16 0" {...line} {...(active ? { fill: "currentColor" } : {})} />
    </svg>
  );
}
