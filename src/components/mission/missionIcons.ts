import type { MissionIconKey } from "@/hooks/useMissions";

// 3D mission icons from the Figma set
import iconCheck from "@/assets/missions/check.png";
import iconMap from "@/assets/missions/map.png";
import iconTarget from "@/assets/missions/target.png";
import iconShoe from "@/assets/missions/shoe.png";
import iconTrophy from "@/assets/missions/trophy.png";
import iconTv from "@/assets/missions/tv.png";
import iconHearts from "@/assets/missions/hearts.png";
import iconTelevision from "@/assets/missions/television.png";
import iconMusic from "@/assets/missions/music.png";

export const MISSION_ICONS: Record<MissionIconKey, string> = {
  check: iconCheck,
  map: iconMap,
  target: iconTarget,
  shoe: iconShoe,
  trophy: iconTrophy,
  tv: iconTv,
  hearts: iconHearts,
  television: iconTelevision,
  music: iconMusic,
};
