import SpotlightSearch from "@/components/search/SpotlightSearch";
import { V3 } from "../theme";
import { FlameIcon, HeartIcon, SearchIcon } from "./Icons";

interface V3HeaderProps {
  title: string;
  /** Mission streak — the flame's counter. */
  streak: number;
  /** Favourite categories — the heart's counter. */
  favorites: number;
}

/**
 * Title on the left, the three marks on the right: flame with streak, heart
 * with favourites, search. The title's cap-top sits 23px under the safe area
 * and the marks are centred on it.
 */
export function V3Header({ title, streak, favorites }: V3HeaderProps) {
  return (
    <header
      className="flex items-center justify-between"
      style={{ paddingLeft: 28, paddingRight: 30, paddingTop: 9, height: 66 }}
    >
      <h1
        style={{
          fontFamily: V3.font,
          fontWeight: 700,
          fontSize: 34,
          lineHeight: "40px",
          letterSpacing: "-0.01em",
          color: V3.ink,
          margin: 0,
        }}
      >
        {title}
      </h1>

      <div className="flex items-center" style={{ gap: 18, paddingTop: 1 }}>
        <Counter value={streak}>
          <FlameIcon lit={streak > 0} />
        </Counter>
        <Counter value={favorites}>
          <HeartIcon />
        </Counter>
        {/* The app's spotlight search, wearing the reference's magnifier:
            its own button is laid over the icon, transparent, so the tap
            target and the panel it opens are the ones every other screen
            already uses. */}
        <div className="relative flex items-center justify-center" style={{ width: 24, height: 24 }}>
          <SearchIcon />
          <SpotlightSearch variant="button" className="!absolute inset-0 !p-0 opacity-0" />
        </div>
      </div>
    </header>
  );
}

function Counter({ value, children }: { value: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center" style={{ gap: 7 }}>
      {children}
      <span
        style={{
          fontFamily: V3.font,
          fontWeight: 500,
          fontSize: 16,
          lineHeight: "20px",
          color: V3.muted,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
