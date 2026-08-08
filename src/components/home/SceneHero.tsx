import { ReactNode } from "react";
import { motion } from "framer-motion";
import { formatCompactNumber } from "@/lib/utils";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";

interface SceneHeroProps {
  sceneUrl: string;
  level: number;
  xpCurrent: number;
  xpTotal: number;
  xpProgress: number; // 0..100
  coins: number;
  gems: number;
  onSceneClick: () => void;
  onCoinsClick: () => void;
  onGemsClick: () => void;
  playButton: ReactNode;
}

// The personalized 16:9 scene as the homepage hero: artwork fills the area
// with softly faded edges, and the stats the AvatarCircle used to carry
// float over it as glass chips — level+XP on the left, currencies on the
// right — leaving the character as the focal point.
export function SceneHero({
  sceneUrl,
  level,
  xpCurrent,
  xpTotal,
  xpProgress,
  coins,
  gems,
  onSceneClick,
  onCoinsClick,
  onGemsClick,
  playButton,
}: SceneHeroProps) {
  return (
    <div className="relative w-full h-full">
      {/* Scene artwork - soft mask so it melts into the app background */}
      <motion.img
        src={sceneUrl}
        alt=""
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        onClick={onSceneClick}
        className="absolute inset-0 w-full h-full object-cover object-center cursor-pointer select-none"
        draggable={false}
        style={{
          maskImage:
            "radial-gradient(ellipse 92% 90% at 50% 48%, black 62%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 92% 90% at 50% 48%, black 62%, transparent 100%)",
        }}
      />

      {/* Left: level shield + XP */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, type: "spring" }}
        className="absolute left-[6%] top-[34%] pointer-events-auto"
      >
        <div
          className="rounded-2xl px-5 py-4 text-center backdrop-blur-md"
          style={{
            background: "rgba(255,255,255,0.72)",
            boxShadow: "0 8px 28px rgba(109,63,224,0.16), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          <div
            className="mx-auto w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white mb-2.5"
            style={{
              background: "linear-gradient(180deg, #9061F9 0%, #6D3FE0 100%)",
              boxShadow: "0 3px 0 #4C2AA6",
            }}
          >
            <span className="font-black text-2xl leading-none">{level}</span>
            <span className="text-[10px] font-bold opacity-80">დონე</span>
          </div>
          <div className="w-28 h-2 rounded-full bg-purple-200/80 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, xpProgress))}%`,
                background: "linear-gradient(90deg, #9061F9, #6D3FE0)",
              }}
            />
          </div>
          <p className="mt-1.5 text-xs font-bold text-slate-600">
            {xpCurrent.toLocaleString()} / {xpTotal.toLocaleString()} XP
          </p>
        </div>
      </motion.div>

      {/* Right: currency chips */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="absolute right-[6%] top-[36%] flex flex-col gap-3 pointer-events-auto"
      >
        <motion.button
          onClick={onCoinsClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2.5 rounded-full pl-1.5 pr-4 py-1.5 backdrop-blur-md"
          style={{
            background: "rgba(255,255,255,0.72)",
            boxShadow: "0 6px 20px rgba(109,63,224,0.14), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          <img src={coinIcon} alt="" className="w-9 h-9" />
          <span className="font-black text-slate-700 text-lg">{formatCompactNumber(coins)}</span>
        </motion.button>
        <motion.button
          onClick={onGemsClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2.5 rounded-full pl-1.5 pr-4 py-1.5 backdrop-blur-md"
          style={{
            background: "rgba(255,255,255,0.72)",
            boxShadow: "0 6px 20px rgba(109,63,224,0.14), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          <img src={gemIcon} alt="" className="w-9 h-9" />
          <span className="font-black text-slate-700 text-lg">{formatCompactNumber(gems)}</span>
        </motion.button>
      </motion.div>

      {/* Bottom center: play button */}
      <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2 pointer-events-auto">
        {playButton}
      </div>
    </div>
  );
}
