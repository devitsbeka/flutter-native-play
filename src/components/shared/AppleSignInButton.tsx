import { useLanguage } from "@/contexts/LanguageContext";

/**
 * The Apple sign-in button for the desktop landing card.
 *
 * Same geometry as GoogleSignInButton — 54.466px tall, the same corner radius
 * and the same 3D chunk — because they sit one above the other in the signup
 * card and any difference reads as a mistake. Black rather than white, which
 * is what Apple's HIG asks for and what the mobile guest hero already uses.
 *
 * It sits ABOVE Google wherever both appear. App Store guideline 4.8 wants
 * Sign in with Apple at least as prominent as any other third-party login,
 * and the sign-in modal already orders them that way.
 */
const CHUNKY_SHADOW = "0px 3.72px 0px 0px #1a1a1a, 0px 5.58px 14.881px 0px rgba(0,0,0,0.25)";
const CHUNKY_GRADIENT = "linear-gradient(to bottom, #3a3a3c, #000000)";

interface AppleSignInButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function AppleSignInButton({ onClick, disabled, className }: AppleSignInButtonProps) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative h-[54.466px] rounded-[18.498px] border-[1.542px] border-solid border-black bg-black disabled:opacity-50 ${className || ""}`}
      style={{ boxShadow: CHUNKY_SHADOW }}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{ background: CHUNKY_GRADIENT }}
      />
      {/* The icon coin, mirroring Google's — white glyph on black rather than
          a white disc, so the button stays a solid Apple-black block. */}
      <svg
        viewBox="0 0 17 21"
        className="absolute left-[19.53px] top-[16.44px] h-[21px] w-[17px] -mt-[1px]"
        fill="white"
        aria-hidden
      >
        <path d="M14.03 11.07c-.02-2.1 1.71-3.11 1.79-3.16-.98-1.43-2.5-1.62-3.04-1.64-1.29-.13-2.52.76-3.18.76-.65 0-1.67-.74-2.74-.72-1.41.02-2.71.82-3.44 2.08-1.46 2.54-.37 6.3 1.05 8.36.7 1.01 1.53 2.14 2.62 2.1 1.05-.04 1.45-.68 2.72-.68 1.27 0 1.63.68 2.74.66 1.13-.02 1.85-1.03 2.54-2.04.8-1.17 1.13-2.3 1.15-2.36-.03-.01-2.2-.85-2.21-3.36zM11.96 4.6c.58-.7.97-1.68.86-2.65-.83.03-1.84.55-2.44 1.25-.53.62-1 1.61-.88 2.56.93.07 1.88-.47 2.46-1.16z" />
      </svg>
      <p className="absolute left-[54.47px] top-[16.44px] font-['Nunito'] font-bold text-[12.332px] leading-[18.498px] tracking-[-0.1644px] text-white whitespace-nowrap">
        {t("extra.appleSignInBtn")}
      </p>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.86px_0px_0px_rgba(255,255,255,0.18)]" />
    </button>
  );
}
