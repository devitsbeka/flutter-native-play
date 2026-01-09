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
    gradient: "linear-gradient(135deg, #C62828 0%, #AD1457 25%, #E65100 50%, #C62828 75%, #880E4F 100%)",
    colors: ["#C62828", "#AD1457", "#E65100", "#880E4F"],
  },
  {
    id: "ocean_breeze",
    name: "Ocean Breeze",
    gradient: "linear-gradient(135deg, #1565C0 0%, #0097A7 25%, #4527A0 50%, #303F9F 75%, #00796B 100%)",
    colors: ["#1565C0", "#0097A7", "#4527A0", "#00796B"],
  },
  {
    id: "aurora_borealis",
    name: "Aurora Borealis",
    gradient: "linear-gradient(135deg, #00838F 0%, #2E7D32 25%, #00695C 50%, #4527A0 75%, #1B5E20 100%)",
    colors: ["#00838F", "#2E7D32", "#4527A0"],
  },
  {
    id: "lavender_mist",
    name: "Lavender Mist",
    gradient: "linear-gradient(135deg, #7B1FA2 0%, #512DA8 25%, #6A1B9A 50%, #8E24AA 75%, #4527A0 100%)",
    colors: ["#7B1FA2", "#512DA8", "#6A1B9A", "#8E24AA"],
  },
  {
    id: "tropical_paradise",
    name: "Tropical Paradise",
    gradient: "linear-gradient(135deg, #C2185B 0%, #D84315 25%, #00796B 50%, #F57C00 75%, #C2185B 100%)",
    colors: ["#C2185B", "#D84315", "#00796B", "#F57C00"],
  },
  {
    id: "forest_dawn",
    name: "Forest Dawn",
    gradient: "linear-gradient(135deg, #0277BD 0%, #00695C 25%, #558B2F 50%, #0288D1 75%, #2E7D32 100%)",
    colors: ["#0277BD", "#00695C", "#558B2F", "#2E7D32"],
  },
  {
    id: "cotton_candy",
    name: "Cotton Candy",
    gradient: "linear-gradient(135deg, #AD1457 0%, #00838F 25%, #6A1B9A 50%, #C2185B 75%, #0277BD 100%)",
    colors: ["#AD1457", "#00838F", "#6A1B9A", "#C2185B"],
  },
  {
    id: "golden_hour",
    name: "Golden Hour",
    gradient: "linear-gradient(135deg, #E65100 0%, #F57C00 25%, #EF6C00 50%, #FF8F00 75%, #E65100 100%)",
    colors: ["#E65100", "#F57C00", "#EF6C00", "#FF8F00"],
  },
  {
    id: "mystic_purple",
    name: "Mystic Purple",
    gradient: "linear-gradient(135deg, #7B1FA2 0%, #C2185B 25%, #6A1B9A 50%, #AD1457 75%, #512DA8 100%)",
    colors: ["#7B1FA2", "#C2185B", "#6A1B9A", "#512DA8"],
  },
  {
    id: "coral_reef",
    name: "Coral Reef",
    gradient: "linear-gradient(135deg, #D84315 0%, #00796B 25%, #BF360C 50%, #00838F 75%, #E64A19 100%)",
    colors: ["#D84315", "#00796B", "#BF360C", "#00838F"],
  },
  {
    id: "midnight_glow",
    name: "Midnight Glow",
    gradient: "linear-gradient(135deg, #1A237E 0%, #4527A0 25%, #283593 50%, #311B92 75%, #1A237E 100%)",
    colors: ["#1A237E", "#4527A0", "#283593", "#311B92"],
  },
  {
    id: "spring_bloom",
    name: "Spring Bloom",
    gradient: "linear-gradient(135deg, #E65100 0%, #BF360C 25%, #2E7D32 50%, #F57C00 75%, #D84315 100%)",
    colors: ["#E65100", "#BF360C", "#2E7D32", "#F57C00"],
  },
];

export const getRandomGradient = (): string => {
  return ROOM_GRADIENTS[Math.floor(Math.random() * ROOM_GRADIENTS.length)].id;
};

export const getGradientById = (id?: string | null): RoomGradient | undefined => {
  if (!id) return ROOM_GRADIENTS.find(g => g.id === 'lavender_mist');
  return ROOM_GRADIENTS.find(g => g.id === id) || ROOM_GRADIENTS.find(g => g.id === 'lavender_mist');
};
