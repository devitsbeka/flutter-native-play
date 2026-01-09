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
    gradient: "linear-gradient(135deg, #FF6B6B 0%, #FFE66D 25%, #FF8E53 50%, #FF6B6B 75%, #C44D58 100%)",
    colors: ["#FF6B6B", "#FFE66D", "#FF8E53", "#C44D58"],
  },
  {
    id: "ocean_breeze",
    name: "Ocean Breeze",
    gradient: "linear-gradient(135deg, #667eea 0%, #48D1CC 25%, #764ba2 50%, #6B5B95 75%, #88D8B0 100%)",
    colors: ["#667eea", "#48D1CC", "#764ba2", "#88D8B0"],
  },
  {
    id: "aurora_borealis",
    name: "Aurora Borealis",
    gradient: "linear-gradient(135deg, #00C9FF 0%, #92FE9D 25%, #00C9FF 50%, #7B68EE 75%, #92FE9D 100%)",
    colors: ["#00C9FF", "#92FE9D", "#7B68EE"],
  },
  {
    id: "lavender_mist",
    name: "Lavender Mist",
    gradient: "linear-gradient(135deg, #E0BBE4 0%, #957DAD 25%, #D291BC 50%, #FEC8D8 75%, #FFDFD3 100%)",
    colors: ["#E0BBE4", "#957DAD", "#D291BC", "#FEC8D8"],
  },
  {
    id: "tropical_paradise",
    name: "Tropical Paradise",
    gradient: "linear-gradient(135deg, #FF6B95 0%, #FFA07A 25%, #20B2AA 50%, #FFD93D 75%, #FF6B95 100%)",
    colors: ["#FF6B95", "#FFA07A", "#20B2AA", "#FFD93D"],
  },
  {
    id: "forest_dawn",
    name: "Forest Dawn",
    gradient: "linear-gradient(135deg, #134E5E 0%, #71B280 25%, #3A6073 50%, #16A085 75%, #71B280 100%)",
    colors: ["#134E5E", "#71B280", "#3A6073", "#16A085"],
  },
  {
    id: "cotton_candy",
    name: "Cotton Candy",
    gradient: "linear-gradient(135deg, #FFDEE9 0%, #B5FFFC 25%, #E8D5FF 50%, #FFB6C1 75%, #87CEEB 100%)",
    colors: ["#FFDEE9", "#B5FFFC", "#E8D5FF", "#FFB6C1"],
  },
  {
    id: "golden_hour",
    name: "Golden Hour",
    gradient: "linear-gradient(135deg, #F7971E 0%, #FFD200 25%, #FF8C00 50%, #FFA500 75%, #FFD700 100%)",
    colors: ["#F7971E", "#FFD200", "#FF8C00", "#FFD700"],
  },
  {
    id: "mystic_purple",
    name: "Mystic Purple",
    gradient: "linear-gradient(135deg, #41295a 0%, #8E44AD 25%, #9B59B6 50%, #E91E63 75%, #41295a 100%)",
    colors: ["#41295a", "#8E44AD", "#9B59B6", "#E91E63"],
  },
  {
    id: "coral_reef",
    name: "Coral Reef",
    gradient: "linear-gradient(135deg, #FF7F50 0%, #40E0D0 25%, #FF6B6B 50%, #48D1CC 75%, #FF7F50 100%)",
    colors: ["#FF7F50", "#40E0D0", "#FF6B6B", "#48D1CC"],
  },
  {
    id: "midnight_glow",
    name: "Midnight Glow",
    gradient: "linear-gradient(135deg, #0F2027 0%, #203A43 25%, #2C5364 50%, #4776E6 75%, #8E54E9 100%)",
    colors: ["#0F2027", "#2C5364", "#4776E6", "#8E54E9"],
  },
  {
    id: "spring_bloom",
    name: "Spring Bloom",
    gradient: "linear-gradient(135deg, #FFECD2 0%, #FCB69F 25%, #A8E6CF 50%, #FFE082 75%, #FF8A80 100%)",
    colors: ["#FFECD2", "#FCB69F", "#A8E6CF", "#FFE082"],
  },
];

export const getRandomGradient = (): string => {
  return ROOM_GRADIENTS[Math.floor(Math.random() * ROOM_GRADIENTS.length)].id;
};

export const getGradientById = (id?: string | null): RoomGradient | undefined => {
  if (!id) return ROOM_GRADIENTS.find(g => g.id === 'lavender_mist');
  return ROOM_GRADIENTS.find(g => g.id === id) || ROOM_GRADIENTS.find(g => g.id === 'lavender_mist');
};
