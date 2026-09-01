import SpotlightSearch from "@/components/search/SpotlightSearch";
import logo from "@/assets/mytrivia-logo.svg";
import { V3 } from "../theme";
import { FlameIcon, HeartIcon, SearchIcon } from "./Icons";

interface V3HeaderProps {
  /** Mission streak — the flame's counter. */
  streak: number;
  /** Favourite categories — the heart's counter. */
  favorites: number;
  /** The flame opens the missions the streak is made of. */
  onStreak: () => void;
  /** The heart opens the favourites. */
  onFavorites: () => void;
}

/**
 * The MyTrivia logo on the left, where the reference has its title, and the
 * three marks on the right: flame with streak, heart with favourites,
 * search. The logo sits where the title's cap-top would (23px under the
 * safe area) and the marks are centred on it.
 */
export function V3Header({ streak, favorites, onStreak, onFavorites }: V3HeaderProps) {
  return (
    <header
      className="flex items-center justify-between"
      style={{ paddingLeft: 28, paddingRight: 30, paddingTop: 9, height: 66 }}
    >
      <img
        src={logo}
        alt="MyTrivia"
        draggable={false}
        className="select-none"
        style={{ height: 38, width: "auto", marginTop: 1 }}
      />

      <div className="flex items-center" style={{ gap: 18, paddingTop: 1 }}>
        <Counter value={streak} onClick={onStreak}>
          <FlameIcon lit={streak > 0} />
        </Counter>
        <Counter value={favorites} onClick={onFavorites}>
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

function Counter({ value, onClick, children }: { value: number; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center active:opacity-70"
      style={{ gap: 7, WebkitTapHighlightColor: "transparent" }}
    >
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
    </button>
  );
}
