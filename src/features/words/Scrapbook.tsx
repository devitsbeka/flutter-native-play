import { Lock } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { LEVELS_PER_SCENE, SCENES } from "./levels";

/**
 * The scrapbook: every scene the player has finished a pack of, as a photo
 * card. Scenes still to come are greyed and locked with the levels that
 * unlock them, so the wall of cards is also the map.
 */
interface Props {
  isOpen: boolean;
  unlocked: string[];
  onClose: () => void;
}

export function Scrapbook({ isOpen, unlocked, onClose }: Props) {
  const { t } = useLanguage();
  return (
    <GameModal isOpen={isOpen} onClose={onClose} title={t("words.scrapbookTitle")} variant="info" hideFooter>
      <div className="grid grid-cols-2 gap-3">
        {SCENES.map((scene, i) => {
          const open = unlocked.includes(scene.id);
          const first = i * LEVELS_PER_SCENE + 1;
          const last = first + LEVELS_PER_SCENE - 1;
          const wide = i % 5 === 4;
          return (
            <div
              key={scene.id}
              className={`relative overflow-hidden rounded-2xl border-[3px] border-white ${wide ? "col-span-2" : ""}`}
              style={{
                aspectRatio: wide ? "16 / 10" : "5 / 4",
                boxShadow: "0 6px 0 #E8E4EC, 0 10px 24px rgba(102,51,153,0.14)",
              }}
            >
              <img
                src={scene.image}
                alt={t(scene.nameKey)}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ filter: open ? "none" : "grayscale(1) brightness(0.6)" }}
                draggable={false}
              />
              {!open && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white">
                  <Lock className="h-7 w-7 drop-shadow" strokeWidth={2.2} />
                  <span className="text-xs font-bold drop-shadow">{t("words.unlockLevels", { from: first, to: last })}</span>
                </div>
              )}
              <div
                className="absolute inset-x-0 bottom-0 py-2 text-center font-display text-lg font-bold text-white"
                style={{ background: "linear-gradient(180deg, rgba(20,30,50,0) 0%, rgba(20,30,50,0.75) 40%)" }}
              >
                {t(scene.nameKey)}
              </div>
            </div>
          );
        })}
      </div>
    </GameModal>
  );
}
