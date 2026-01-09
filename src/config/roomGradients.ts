export interface RoomGradient {
  id: string;
  name: string;
  gradient: string;
  colors: string[];
}

export const ROOM_GRADIENTS: RoomGradient[] = [
  {
    id: "sunset_dream",
    name: "Sunset Dream",
    gradient: "linear-gradient(135deg, #7F1D1D 0%, #831843 25%, #991B1B 50%, #7F1D1D 75%, #6D1C4C 100%)",
    colors: ["#7F1D1D", "#831843", "#991B1B", "#6D1C4C"],
  },
  {
    id: "ocean_breeze",
    name: "Ocean Breeze",
    gradient: "linear-gradient(135deg, #0C4A6E 0%, #0E7490 25%, #312E81 50%, #1E3A5F 75%, #134E4A 100%)",
    colors: ["#0C4A6E", "#0E7490", "#312E81", "#134E4A"],
  },
  {
    id: "aurora_borealis",
    name: "Aurora Borealis",
    gradient: "linear-gradient(135deg, #065F46 0%, #166534 25%, #3730A3 50%, #14532D 75%, #1E3A5F 100%)",
    colors: ["#065F46", "#166534", "#3730A3", "#14532D"],
  },
  {
    id: "lavender_mist",
    name: "Lavender Mist",
    gradient: "linear-gradient(135deg, #5B21B6 0%, #4C1D95 25%, #581C87 50%, #6B21A8 75%, #4C1D95 100%)",
    colors: ["#5B21B6", "#4C1D95", "#581C87", "#6B21A8"],
  },
  {
    id: "tropical_paradise",
    name: "Tropical Paradise",
    gradient: "linear-gradient(135deg, #831843 0%, #7C2D12 25%, #115E59 50%, #9A3412 75%, #831843 100%)",
    colors: ["#831843", "#7C2D12", "#115E59", "#9A3412"],
  },
  {
    id: "forest_dawn",
    name: "Forest Dawn",
    gradient: "linear-gradient(135deg, #0369A1 0%, #115E59 25%, #3F6212 50%, #0284C7 75%, #166534 100%)",
    colors: ["#0369A1", "#115E59", "#3F6212", "#166534"],
  },
  {
    id: "cotton_candy",
    name: "Cotton Candy",
    gradient: "linear-gradient(135deg, #831843 0%, #0E7490 25%, #581C87 50%, #9D174D 75%, #0C4A6E 100%)",
    colors: ["#831843", "#0E7490", "#581C87", "#9D174D"],
  },
  {
    id: "golden_hour",
    name: "Golden Hour",
    gradient: "linear-gradient(135deg, #78350F 0%, #92400E 25%, #7C2D12 50%, #854D0E 75%, #78350F 100%)",
    colors: ["#78350F", "#92400E", "#7C2D12", "#854D0E"],
  },
  {
    id: "mystic_purple",
    name: "Mystic Purple",
    gradient: "linear-gradient(135deg, #5B21B6 0%, #9D174D 25%, #581C87 50%, #831843 75%, #4C1D95 100%)",
    colors: ["#5B21B6", "#9D174D", "#581C87", "#4C1D95"],
  },
  {
    id: "coral_reef",
    name: "Coral Reef",
    gradient: "linear-gradient(135deg, #7C2D12 0%, #115E59 25%, #991B1B 50%, #0E7490 75%, #7C2D12 100%)",
    colors: ["#7C2D12", "#115E59", "#991B1B", "#0E7490"],
  },
  {
    id: "midnight_glow",
    name: "Midnight Glow",
    gradient: "linear-gradient(135deg, #1E1B4B 0%, #3730A3 25%, #312E81 50%, #2E1065 75%, #1E1B4B 100%)",
    colors: ["#1E1B4B", "#3730A3", "#312E81", "#2E1065"],
  },
  {
    id: "spring_bloom",
    name: "Spring Bloom",
    gradient: "linear-gradient(135deg, #7C2D12 0%, #991B1B 25%, #166534 50%, #78350F 75%, #7C2D12 100%)",
    colors: ["#7C2D12", "#991B1B", "#166534", "#78350F"],
  },
];

export const getRandomGradient = (): string => {
  return ROOM_GRADIENTS[Math.floor(Math.random() * ROOM_GRADIENTS.length)].id;
};

export const getGradientById = (id?: string | null): RoomGradient | undefined => {
  if (!id) return ROOM_GRADIENTS.find(g => g.id === 'lavender_mist');
  return ROOM_GRADIENTS.find(g => g.id === id) || ROOM_GRADIENTS.find(g => g.id === 'lavender_mist');
};
