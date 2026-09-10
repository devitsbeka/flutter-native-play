/**
 * Plate Shot — a dev-server render target for the category plate's reel
 * (VSScreen.CategoryPlate), the way /dev/lobby is for the lobby: the reel
 * lives on two screens that both need a signed-in player and a category
 * list, which a screenshot pass cannot have. This page turns the plate over
 * the six picture games on the quick game's purple.
 *
 *   /dev/plate?target=3&hold=1   (hold: render the reel's strips at rest,
 *   frozen on their first row, so the window's geometry can be looked at)
 */
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CategoryPlate, VS_PURPLE } from "@/components/game/VSScreen";
import { POPULAR_CATEGORY_ICONS } from "@/config/popularImageCategories";

const ITEMS = [
  { name: "Guess the Flag", iconUrl: POPULAR_CATEGORY_ICONS.guess_flag },
  { name: "Guess the Logo", iconUrl: POPULAR_CATEGORY_ICONS.guess_logo },
  { name: "Guess the Celebrity", iconUrl: POPULAR_CATEGORY_ICONS.guess_celebrity },
  { name: "Guess the City", iconUrl: POPULAR_CATEGORY_ICONS.guess_city },
  { name: "Guess the Athlete", iconUrl: POPULAR_CATEGORY_ICONS.guess_sportsman },
  { name: "Guess the Movie", iconUrl: POPULAR_CATEGORY_ICONS.guess_movie },
];

export default function PlateShot() {
  const [params] = useSearchParams();
  const target = Math.min(ITEMS.length - 1, Math.max(0, Number(params.get("target") ?? 1)));
  const [locked, setLocked] = useState(false);
  const [turn, setTurn] = useState(0);
  const landed = useCallback(() => setLocked(true), []);
  const item = ITEMS[target];

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-5" style={{ background: VS_PURPLE }}>
      <div className="w-full max-w-[371px]" data-plate-shot={locked ? "landed" : "turning"}>
        <CategoryPlate
          name={item.name}
          iconUrl={item.iconUrl}
          isLocked={locked}
          stake={200}
          canSpin={locked}
          spinLabel="Spin"
          onSpin={() => {
            setLocked(false);
            setTurn((k) => k + 1);
          }}
          reel={{ items: ITEMS, target, turnKey: turn, onLanded: landed }}
        />
      </div>
    </div>
  );
}
