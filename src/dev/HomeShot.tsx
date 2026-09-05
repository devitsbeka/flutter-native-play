/**
 * Home Shot — a dev-server render target for the phone home's hero chrome
 * (Figma 1076:1881), like /dev/lobby for the lobby: the reward tabs and the
 * profile card only mount for a signed-in player, which a screenshot pass
 * cannot be, so this page feeds them sample values over a still scene at
 * the frame's own 69px header height.
 *
 *   /dev/home?scene=<image url>
 */
import { useSearchParams } from "react-router-dom";
import { MobileHeroWidgets, MobileProfileCard } from "@/components/home/MobileHome";
import homeScene from "@/assets/figma-home/home-scene.webp";

// SmartAvatar maps local paths to the bot avatars only; a real profile
// picture is a URL, so the sample is one too (as on /dev/lobby).
const FACE = "https://api.dicebear.com/9.x/thumbs/png?seed=beka&size=96";

export default function HomeShot() {
  const [params] = useSearchParams();
  const scene = params.get("scene") ?? homeScene;
  const noop = () => undefined;
  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-[#faf6ff]"
      style={{ "--home-header-h": "69px" } as React.CSSProperties}
    >
      <img src={scene} alt="" className="absolute inset-x-0 top-0 w-full" draggable={false} />
      <MobileHeroWidgets giftLabel="3h 21m" onGiftClick={noop} onStreakClick={noop} onQuestClick={noop} />
      <MobileProfileCard
        nickname="Beka"
        avatarUrl={FACE}
        coins={61400}
        gems={129}
        onAvatarClick={noop}
        onNameClick={noop}
        onCoinsClick={noop}
        onGemsClick={noop}
      />
    </div>
  );
}
