/** The mode's coin: a gold disc with a W stamped on it. */
export function CoinIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-black text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.58,
        lineHeight: 1,
        background: "radial-gradient(circle at 35% 30%, #FFE680 0%, #F4C542 45%, #D99A1E 100%)",
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.55), 0 1px 2px rgba(0,0,0,0.35)",
        textShadow: "0 1px 1px rgba(0,0,0,0.3)",
        fontFamily: "var(--font-body)",
      }}
      aria-hidden
    >
      W
    </div>
  );
}
