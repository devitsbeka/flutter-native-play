import type { ReactNode } from "react";

/**
 * The slanted blue header band the mode's feature screens share — the
 * level-complete card, the luck wheel, the scrapbook.
 */
export function BlueBanner({ children }: { children: ReactNode }) {
  return (
    <div className="relative shrink-0" style={{ paddingTop: "var(--safe-top)" }}>
      <div
        className="relative px-6 pb-7 pt-8 text-center text-white"
        style={{
          background: "linear-gradient(180deg,#2A5DB8 0%,#1E4A9E 100%)",
          clipPath: "polygon(0 0, 100% 6%, 100% 100%, 0 94%)",
          fontFamily: "var(--font-body)",
          textShadow: "0 3px 0 rgba(0,0,0,0.25)",
        }}
      >
        <div className="text-[42px] font-extrabold leading-[1.1]">{children}</div>
      </div>
    </div>
  );
}
