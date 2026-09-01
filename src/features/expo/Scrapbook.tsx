import { Lock, X } from "lucide-react";
import { motion } from "framer-motion";
import { LEVELS_PER_SCENE, SCENES } from "./levels";
import { BlueBanner } from "./BlueBanner";

/**
 * "Build Your Own Scrapbook": every scene the player has finished a pack of,
 * as a photo card. Scenes still to come are shown greyed and locked with
 * the levels that unlock them, so the wall of cards is also the map.
 */
interface Props {
  unlocked: string[];
  onClose: () => void;
}

export function Scrapbook({ unlocked, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg,#0F2B66 0%,#0A1B40 100%)" }}
    >
      <BlueBanner>Build Your Own Scrapbook</BlueBanner>
      <button
        onClick={onClose}
        aria-label="Close scrapbook"
        className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#1E3A78] shadow-md"
        style={{ top: "calc(var(--safe-top) + 10px)" }}
      >
        <X className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-6 pt-2">
        <div className="grid grid-cols-2 gap-2">
          {SCENES.map((scene, i) => {
            const open = unlocked.includes(scene.id);
            const first = i * LEVELS_PER_SCENE + 1;
            const last = first + LEVELS_PER_SCENE - 1;
            const wide = i % 5 === 4;
            return (
              <div
                key={scene.id}
                className={`relative overflow-hidden rounded-[10px] ${wide ? "col-span-2" : ""}`}
                style={{
                  aspectRatio: wide ? "16 / 11" : "5 / 4",
                  boxShadow: "0 0 0 2px rgba(255,255,255,0.6), 0 8px 20px rgba(0,0,0,0.35)",
                }}
              >
                <img
                  src={scene.image}
                  alt={scene.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ filter: open ? "none" : "grayscale(1) brightness(0.55)" }}
                  draggable={false}
                />
                {!open && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white/90">
                    <Lock className="h-8 w-8" strokeWidth={2.2} />
                    <span className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-body)" }}>
                      Levels {first}–{last}
                    </span>
                  </div>
                )}
                <div
                  className="absolute inset-x-0 bottom-0 py-2 text-center text-[26px] font-medium text-white"
                  style={{ background: "rgba(20,30,50,0.62)", fontFamily: "var(--font-body)" }}
                >
                  {scene.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
