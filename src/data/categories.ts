// Trivia Categories Data

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  totalLevels: number;
  type: "classic" | "fun" | "educational";
}

export interface FeaturedItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  type: "seasonal" | "daily" | "trending";
  bgGradient: string;
  expiresAt?: string;
}

export const categories: Category[] = [
  // Classic Trivia
  {
    id: "science",
    name: "Science",
    icon: "🔬",
    color: "from-emerald-400 to-teal-500",
    description: "Biology, Chemistry, Physics & more",
    totalLevels: 20,
    type: "classic",
  },
  {
    id: "history",
    name: "History",
    icon: "📜",
    color: "from-amber-400 to-orange-500",
    description: "World events through the ages",
    totalLevels: 20,
    type: "classic",
  },
  {
    id: "geography",
    name: "Geography",
    icon: "🌍",
    color: "from-blue-400 to-cyan-500",
    description: "Countries, capitals & landmarks",
    totalLevels: 20,
    type: "classic",
  },
  {
    id: "sports",
    name: "Sports",
    icon: "⚽",
    color: "from-green-400 to-lime-500",
    description: "All sports & athletics",
    totalLevels: 20,
    type: "classic",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    icon: "🎬",
    color: "from-pink-400 to-rose-500",
    description: "Movies, TV & celebrities",
    totalLevels: 20,
    type: "classic",
  },
  {
    id: "art_literature",
    name: "Art & Literature",
    icon: "🎨",
    color: "from-purple-400 to-violet-500",
    description: "Books, paintings & artists",
    totalLevels: 20,
    type: "classic",
  },
  
  // Fun & Casual
  {
    id: "movies",
    name: "Movies",
    icon: "🎥",
    color: "from-red-400 to-pink-500",
    description: "Blockbusters & classics",
    totalLevels: 15,
    type: "fun",
  },
  {
    id: "music",
    name: "Music",
    icon: "🎵",
    color: "from-fuchsia-400 to-purple-500",
    description: "Artists, songs & albums",
    totalLevels: 15,
    type: "fun",
  },
  {
    id: "food",
    name: "Food & Cooking",
    icon: "🍕",
    color: "from-orange-400 to-red-500",
    description: "Cuisines & recipes",
    totalLevels: 15,
    type: "fun",
  },
  {
    id: "animals",
    name: "Animals",
    icon: "🦁",
    color: "from-yellow-400 to-amber-500",
    description: "Wildlife & pets",
    totalLevels: 15,
    type: "fun",
  },
  {
    id: "pop_culture",
    name: "Pop Culture",
    icon: "📱",
    color: "from-cyan-400 to-blue-500",
    description: "Trends, memes & viral content",
    totalLevels: 15,
    type: "fun",
  },
  
  // Educational
  {
    id: "math",
    name: "Mathematics",
    icon: "🧮",
    color: "from-indigo-400 to-blue-500",
    description: "Numbers, logic & puzzles",
    totalLevels: 25,
    type: "educational",
  },
  {
    id: "nature",
    name: "Nature",
    icon: "🌿",
    color: "from-green-400 to-emerald-500",
    description: "Plants, ecosystems & environment",
    totalLevels: 20,
    type: "educational",
  },
  {
    id: "technology",
    name: "Technology",
    icon: "💻",
    color: "from-slate-400 to-gray-500",
    description: "Gadgets, internet & innovations",
    totalLevels: 20,
    type: "educational",
  },
  {
    id: "space",
    name: "Space",
    icon: "🚀",
    color: "from-violet-400 to-indigo-500",
    description: "Planets, stars & universe",
    totalLevels: 20,
    type: "educational",
  },
  {
    id: "languages",
    name: "Languages",
    icon: "💬",
    color: "from-teal-400 to-cyan-500",
    description: "Words, phrases & linguistics",
    totalLevels: 20,
    type: "educational",
  },
];

export const featuredItems: FeaturedItem[] = [
  {
    id: "christmas_2024",
    title: "Christmas Special",
    subtitle: "Holiday trivia challenge!",
    icon: "🎄",
    type: "seasonal",
    bgGradient: "from-red-500 via-green-500 to-red-500",
  },
  {
    id: "daily_challenge",
    title: "Daily Challenge",
    subtitle: "Win bonus XP today!",
    icon: "⚡",
    type: "daily",
    bgGradient: "from-amber-400 to-orange-500",
  },
  {
    id: "trending_movies",
    title: "Box Office Hits",
    subtitle: "2024's biggest movies",
    icon: "🎬",
    type: "trending",
    bgGradient: "from-purple-500 to-pink-500",
  },
];

export const getCategoryById = (id: string): Category | undefined => {
  return categories.find(cat => cat.id === id);
};

export const getCategoriesByType = (type: Category["type"]): Category[] => {
  return categories.filter(cat => cat.type === type);
};
