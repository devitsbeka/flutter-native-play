import { useLanguage } from "@/contexts/LanguageContext";
import iconGoogle from "@/assets/figma-landing/icon-google.svg";

// Figma 612:1981 — the chunky white Google sign-in button from the desktop
// logged-out landing: soft gradient fill, 3D drop shadow, inset highlight
// and a white icon coin. Position/size it via className (needs a width).
const CHUNKY_SHADOW = "0px 3.72px 0px 0px #d8d0e8, 0px 5.58px 14.881px 0px rgba(0,0,0,0.1)";
const CHUNKY_GRADIENT = "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(254,254,254,0.5))";

interface GoogleSignInButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function GoogleSignInButton({ onClick, disabled, className }: GoogleSignInButtonProps) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative h-[54.466px] rounded-[18.498px] border-[1.542px] border-solid border-[#e8e0f5] bg-transparent disabled:opacity-50 ${className || ""}`}
      style={{ boxShadow: CHUNKY_SHADOW }}
    >
      <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[inherit]" style={{ background: CHUNKY_GRADIENT }} />
      <div className="absolute left-[13.36px] top-[10.28px] size-[30.83px] rounded-full bg-white border-[1.028px] border-solid border-[#d8d0e8]" />
      <img src={iconGoogle} alt="" className="absolute left-[19.53px] top-[16.44px] size-[18.498px]" />
      <p className="absolute left-[54.47px] top-[16.44px] font-['Nunito'] font-bold text-[12.332px] leading-[18.498px] tracking-[-0.1644px] text-[#402666] whitespace-nowrap">
        {t("extra.landingGoogleSignIn")}
      </p>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.86px_0px_0px_white]" />
    </button>
  );
}
