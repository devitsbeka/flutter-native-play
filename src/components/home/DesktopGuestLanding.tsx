import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import heroScene from "@/assets/figma-landing/hero-scene.png";
import avatar1 from "@/assets/figma-landing/avatar-1.png";
import avatar2 from "@/assets/figma-landing/avatar-2.png";
import avatar3 from "@/assets/figma-landing/avatar-3.png";
import featureTrivia from "@/assets/figma-landing/feature-trivia.png";
import featureCategories from "@/assets/figma-landing/feature-categories.png";
import featureRanking from "@/assets/figma-landing/feature-ranking.png";
import featureFriends from "@/assets/figma-landing/feature-friends.png";
import iconGoogle from "@/assets/figma-landing/icon-google.svg";
import iconFacebook from "@/assets/figma-landing/icon-facebook.svg";
import iconSms from "@/assets/figma-landing/icon-sms.svg";
import iconMail from "@/assets/figma-landing/icon-mail.svg";

// Figma: Hom / node 612:1888 — desktop logged-out state. Full-bleed Trivia
// King still with an edge vignette, a signup card + email-capture card on
// the left and a feature list card on the right. All coordinates are the
// design's, shifted by the 72px nav rail the layout already provides.
const CARD_SHADOW = "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";
const CHUNKY_SHADOW = "0px 3.72px 0px 0px #d8d0e8, 0px 5.58px 14.881px 0px rgba(0,0,0,0.1)";
const CHUNKY_GRADIENT = "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(254,254,254,0.5))";
// The design stacks the same white radial edge vignette five times over the
// scene (Figma nodes 612:1902/2100/2101/2102/2103).
const VIGNETTE =
  "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0) 50%, rgba(255,255,255,0.15) 65%, rgba(255,255,255,0.35) 80%, rgba(255,255,255,0.7) 100%)";
const HEADING_FONT = {
  fontFamily: "'Noto Sans Georgian', 'Nunito', sans-serif",
  fontStretch: "62.5%" as const,
  fontWeight: 600,
};

// Full-bleed background for the guest scene: the animated Trivia King loop
// under the design's edge vignette; the exported still (image 647) keeps
// the frame visible until the video is ready.
export function DesktopGuestSceneBackground({ videoSrc }: { videoSrc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="hidden md:block absolute inset-0 z-0 bg-[#f9dbff] select-none"
    >
      <video
        src={videoSrc}
        poster={heroScene}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: Array(5).fill(VIGNETTE).join(", ") }}
      />
    </motion.div>
  );
}

// One chunky white social button (Google / Facebook / SMS) — border,
// soft gradient fill, 3D drop shadow and inset white highlight, with a
// white icon coin on the left.
function SocialButton({
  left,
  top,
  width,
  label,
  onClick,
  children,
}: {
  left: number;
  top: number;
  width: number;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute h-[54.466px] rounded-[18.498px] border-[1.542px] border-solid border-[#e8e0f5] bg-transparent"
      style={{ left, top, width, boxShadow: CHUNKY_SHADOW }}
    >
      <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[inherit]" style={{ background: CHUNKY_GRADIENT }} />
      {children}
      <p className="absolute left-[54.47px] top-[16.44px] font-['Nunito'] font-bold text-[12.332px] leading-[18.498px] tracking-[-0.1644px] text-[#402666] whitespace-nowrap">
        {label}
      </p>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.86px_0px_0px_white]" />
    </button>
  );
}

function FeatureRow({
  img,
  imgLeft,
  imgTop,
  imgSize,
  titleTop,
  bodyTop,
  title,
  body,
  bodyWidth = 196,
}: {
  img: string;
  imgLeft: number;
  imgTop: number;
  imgSize: number;
  titleTop: number;
  bodyTop: number;
  title: string;
  body: string;
  bodyWidth?: number;
}) {
  return (
    <>
      <div className="absolute" style={{ left: imgLeft, top: imgTop, width: imgSize, height: imgSize }}>
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img} />
      </div>
      <p
        className="absolute left-[92px] w-[180px] font-['Nunito'] font-bold text-[13px] leading-[18px] tracking-[-0.16px] text-[#402666]"
        style={{ top: titleTop }}
      >
        {title}
      </p>
      <p
        className="absolute left-[92px] font-['Nunito'] font-normal text-[12px] leading-[19.725px] tracking-[-0.16px] text-[#402666] opacity-70"
        style={{ top: bodyTop, width: bodyWidth }}
      >
        {body}
      </p>
    </>
  );
}

interface DesktopGuestLandingProps {
  onGoogle: () => void;
  onFacebook: () => void;
  onSms: () => void;
  onEmailContinue: (email: string) => void;
}

// Floating card overlay for the logged-out desktop homepage. Mounted over
// the full page (same origin as the Figma canvas minus the 72px nav rail),
// so every coordinate below is design-exact.
export function DesktopGuestLanding({ onGoogle, onFacebook, onSms, onEmailContinue }: DesktopGuestLandingProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="hidden md:block absolute inset-0 z-20 pointer-events-none"
    >
      {/* ===== Signup card (Figma 612:1974) ===== */}
      <div
        className="absolute left-[56px] top-[176px] w-[298px] h-[380px] rounded-[24px] bg-[rgba(252,247,255,0.8)] backdrop-blur-sm overflow-hidden pointer-events-auto"
        style={{ boxShadow: CARD_SHADOW }}
      >
        {/* Social proof: overlapping avatars + player count (612:2480/2509) */}
        <div className="absolute left-[25px] top-[23px] flex items-start">
          <img src={avatar1} alt="" className="size-[31.482px] mr-[-6.296px] rounded-full relative" />
          <img src={avatar2} alt="" className="size-[31.482px] mr-[-6.296px] rounded-full relative" />
          <img src={avatar3} alt="" className="size-[31.482px] rounded-full relative" />
        </div>
        <p className="absolute left-[117.3px] top-[27.74px] font-['Nunito'] font-normal text-[13px] leading-[22px] tracking-[-0.16px] text-black opacity-80 whitespace-nowrap">
          {t("extra.landingPlayersCount")}
        </p>
        {/* Divider (612:2511) */}
        <div aria-hidden className="absolute left-0 top-[72px] w-[297px] h-px bg-black opacity-[0.06]" />
        {/* Heading (612:1976) — Noto Sans Georgian ExtraCondensed SemiBold */}
        <p
          className="absolute left-[25px] top-[93px] text-[30.14px] leading-[30.14px] tracking-[-0.134px] uppercase whitespace-pre-line text-[#402666]"
          style={HEADING_FONT}
        >
          {t("extra.landingJoinFreeHeading")}
        </p>
        {/* Subtitle (612:2310) */}
        <p className="absolute left-[25px] top-[170px] w-[235px] font-['Nunito'] font-normal text-[13px] leading-[22px] tracking-[-0.16px] text-black opacity-70">
          {t("extra.landingJoinSubtitle")}
        </p>
        {/* Google (612:1981) */}
        <SocialButton left={19} top={240} width={260} label={t("extra.landingGoogleSignIn")} onClick={onGoogle}>
          <div className="absolute left-[13.36px] top-[10.28px] size-[30.83px] rounded-full bg-white border-[1.028px] border-solid border-[#d8d0e8]" />
          <img src={iconGoogle} alt="" className="absolute left-[19.53px] top-[16.44px] size-[18.498px]" />
        </SocialButton>
        {/* Facebook (612:2426) */}
        <SocialButton left={19} top={306.8} width={125.375} label="Facebook" onClick={onFacebook}>
          <div className="absolute left-[13.36px] top-[10.28px] size-[30.83px] rounded-full bg-white border-[1.028px] border-solid border-[#d8d0e8]" />
          <img src={iconFacebook} alt="" className="absolute left-[16.44px] top-[13.36px] size-[24.664px]" />
        </SocialButton>
        {/* SMS (612:2468) */}
        <SocialButton left={153.62} top={306.8} width={125.375} label="SMS" onClick={onSms}>
          <div className="absolute left-[13.36px] top-[10.28px] size-[30.83px] rounded-full bg-gradient-to-b from-[#02f35d] to-[#00c422] overflow-hidden" />
          <img src={iconSms} alt="" className="absolute left-[15.42px] top-[13.36px] size-[27.747px]" />
        </SocialButton>
      </div>

      {/* ===== Email capture card (Figma 612:2546) ===== */}
      <div
        className="absolute left-[54px] top-[566px] w-[298px] h-[179px] rounded-[24px] bg-[rgba(252,247,255,0.8)] backdrop-blur-sm overflow-hidden pointer-events-auto"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <p className="absolute left-[70px] top-[18px] font-['Nunito'] font-normal text-[12px] leading-[22px] tracking-[-0.16px] text-black opacity-60 whitespace-nowrap">
          {t("extra.landingOrEmail")}
        </p>
        <div aria-hidden className="absolute left-[21px] top-[29px] w-[27px] h-px bg-black opacity-[0.22]" />
        <div aria-hidden className="absolute left-[246px] top-[29px] w-[27px] h-px bg-black opacity-[0.22]" />
        {/* Email field (612:2555) — chunky look, top corners only */}
        <div
          className="absolute left-[19px] top-[53px] w-[260px] h-[54.466px] rounded-t-[18.498px] border-[1.542px] border-solid border-[#e8e0f5]"
          style={{ boxShadow: CHUNKY_SHADOW }}
        >
          <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[inherit]" style={{ background: CHUNKY_GRADIENT }} />
          <img src={iconMail} alt="" className="absolute left-[14.94px] top-[16.97px] size-[18px]" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onEmailContinue(email)}
            placeholder="hello@mytrivia.io"
            className="absolute left-[43.94px] top-0 right-[8px] h-full bg-transparent font-['Nunito'] font-normal text-[14px] leading-[22px] tracking-[-0.16px] text-black placeholder:text-black placeholder:opacity-50 outline-none border-none"
          />
          <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.86px_0px_0px_white]" />
        </div>
        {/* Green CTA (612:2576) — bottom corners only, 3D emerald chunk */}
        <button
          type="button"
          onClick={() => onEmailContinue(email)}
          className="absolute left-[19px] top-[102px] w-[260px] h-[54px] rounded-b-[24px] border-[3px] border-solid border-[#34d399] flex items-center justify-center shadow-[0px_6px_0px_0px_#047857,0px_10px_24px_0px_rgba(16,185,129,0.5)]"
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none rounded-[inherit]"
            style={{ background: "linear-gradient(to bottom, #6ee7b7, #10b981 50%, #059669)" }}
          />
          {/* Sparkle dots (612:2577-2579) */}
          <div aria-hidden className="absolute left-[16.42px] top-[8.42px] size-[5.152px] rounded-full bg-white opacity-[0.49]" />
          <div aria-hidden className="absolute left-[195.16px] top-[17.36px] size-[5.283px] rounded-full bg-white opacity-[0.35]" />
          <div aria-hidden className="absolute left-[32.71px] top-[40.71px] size-[4.589px] rounded-full bg-[rgba(255,255,255,0.8)] opacity-[0.58]" />
          <span className="relative font-['Inter'] font-bold text-[14px] text-white whitespace-nowrap drop-shadow-[0px_4px_3px_rgba(0,0,0,0.07)]">
            {t("extra.landingJoinFree")}
          </span>
          <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_3px_0px_0px_rgba(255,255,255,0.35)]" />
        </button>
      </div>

      {/* ===== Features card (Figma 612:2105) ===== */}
      <div
        className="absolute right-[68px] top-[176px] w-[308px] h-[424px] rounded-[24px] overflow-hidden pointer-events-auto"
        style={{
          background: "linear-gradient(to bottom, rgba(249,255,205,0.81), rgba(242,231,245,0.81))",
          boxShadow: CARD_SHADOW,
        }}
      >
        <p className="absolute left-[20px] top-[14px] font-['Nunito'] font-normal text-[13px] leading-[22px] tracking-[-0.16px] text-black opacity-80 whitespace-nowrap">
          {t("extra.landingOnlyOnMyTrivia")}
        </p>
        <div aria-hidden className="absolute left-0 top-[49px] w-[297px] h-px bg-black opacity-10" />
        <FeatureRow
          img={featureTrivia}
          imgLeft={20}
          imgTop={70}
          imgSize={57}
          titleTop={70}
          bodyTop={93}
          title={t("extra.landingFeature1Title")}
          body={t("extra.landingFeature1Desc")}
          bodyWidth={180}
        />
        <FeatureRow
          img={featureCategories}
          imgLeft={22}
          imgTop={154}
          imgSize={54}
          titleTop={154}
          bodyTop={177}
          title={t("extra.landingFeature2Title")}
          body={t("extra.landingFeature2Desc")}
        />
        <FeatureRow
          img={featureRanking}
          imgLeft={22}
          imgTop={242}
          imgSize={60}
          titleTop={243}
          bodyTop={266}
          title={t("extra.landingFeature3Title")}
          body={t("extra.landingFeature3Desc")}
        />
        <FeatureRow
          img={featureFriends}
          imgLeft={25}
          imgTop={331}
          imgSize={49}
          titleTop={333}
          bodyTop={356}
          title={t("extra.landingFeature4Title")}
          body={t("extra.landingFeature4Desc")}
        />
      </div>
    </motion.div>
  );
}
