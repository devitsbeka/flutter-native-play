// Georgian Trivia Categories Data - ქართული ტრივია

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
  // კლასიკური ტრივია (Classic Trivia)
  {
    id: "georgian_history",
    name: "საქართველოს ისტორია",
    icon: "🏰",
    color: "from-amber-400 to-orange-500",
    description: "ქართული სახელმწიფოებრიობა და კულტურა",
    totalLevels: 20,
    type: "classic",
  },
  {
    id: "world_history",
    name: "მსოფლიო ისტორია",
    icon: "📜",
    color: "from-yellow-400 to-amber-500",
    description: "მნიშვნელოვანი მოვლენები მსოფლიოში",
    totalLevels: 20,
    type: "classic",
  },
  {
    id: "geography",
    name: "გეოგრაფია",
    icon: "🌍",
    color: "from-blue-400 to-cyan-500",
    description: "ქვეყნები, დედაქალაქები და ღირსშესანიშნაობები",
    totalLevels: 20,
    type: "classic",
  },
  {
    id: "science",
    name: "მეცნიერება",
    icon: "🔬",
    color: "from-emerald-400 to-teal-500",
    description: "ფიზიკა, ქიმია, ბიოლოგია",
    totalLevels: 20,
    type: "classic",
  },
  {
    id: "sports",
    name: "სპორტი",
    icon: "⚽",
    color: "from-green-400 to-lime-500",
    description: "ფეხბურთი, რაგბი და სხვა სპორტი",
    totalLevels: 20,
    type: "classic",
  },
  {
    id: "georgian_literature",
    name: "ქართული ლიტერატურა",
    icon: "📚",
    color: "from-purple-400 to-violet-500",
    description: "მწერლები, პოეტები და ნაწარმოებები",
    totalLevels: 20,
    type: "classic",
  },

  // გართობა (Fun & Casual)
  {
    id: "movies",
    name: "კინო",
    icon: "🎬",
    color: "from-red-400 to-pink-500",
    description: "ფილმები და მსახიობები",
    totalLevels: 15,
    type: "fun",
  },
  {
    id: "music",
    name: "მუსიკა",
    icon: "🎵",
    color: "from-fuchsia-400 to-purple-500",
    description: "შემსრულებლები და სიმღერები",
    totalLevels: 15,
    type: "fun",
  },
  {
    id: "georgian_cuisine",
    name: "ქართული სამზარეულო",
    icon: "🍲",
    color: "from-orange-400 to-red-500",
    description: "ხინკალი, ხაჭაპური და სხვა",
    totalLevels: 15,
    type: "fun",
  },
  {
    id: "animals",
    name: "ცხოველები",
    icon: "🦁",
    color: "from-yellow-400 to-amber-500",
    description: "ველური ბუნება და შინაური ცხოველები",
    totalLevels: 15,
    type: "fun",
  },
  {
    id: "pop_culture",
    name: "პოპ კულტურა",
    icon: "📱",
    color: "from-cyan-400 to-blue-500",
    description: "ტრენდები და ვირუსული კონტენტი",
    totalLevels: 15,
    type: "fun",
  },

  // საგანმანათლებლო (Educational)
  {
    id: "math",
    name: "მათემატიკა",
    icon: "🧮",
    color: "from-indigo-400 to-blue-500",
    description: "რიცხვები, ლოგიკა და ამოცანები",
    totalLevels: 25,
    type: "educational",
  },
  {
    id: "technology",
    name: "ტექნოლოგიები",
    icon: "💻",
    color: "from-slate-400 to-gray-500",
    description: "კომპიუტერები და ინოვაციები",
    totalLevels: 20,
    type: "educational",
  },
  {
    id: "space",
    name: "კოსმოსი",
    icon: "🚀",
    color: "from-violet-400 to-indigo-500",
    description: "პლანეტები, ვარსკვლავები და გალაქტიკები",
    totalLevels: 20,
    type: "educational",
  },
  {
    id: "georgian_culture",
    name: "ქართული კულტურა",
    icon: "🍇",
    color: "from-rose-400 to-red-500",
    description: "ტრადიციები, ცეკვა და ღვინო",
    totalLevels: 20,
    type: "educational",
  },
  {
    id: "nature",
    name: "ბუნება",
    icon: "🌿",
    color: "from-green-400 to-emerald-500",
    description: "მცენარეები და ეკოსისტემები",
    totalLevels: 20,
    type: "educational",
  },
];

export const featuredItems: FeaturedItem[] = [
  {
    id: "new_year_2025",
    title: "საახალწლო გამოწვევა",
    subtitle: "დღესასწაულის ტრივია!",
    icon: "🎄",
    type: "seasonal",
    bgGradient: "from-red-500 via-green-500 to-red-500",
  },
  {
    id: "daily_challenge",
    title: "დღის გამოწვევა",
    subtitle: "მოიგე ბონუს XP!",
    icon: "⚡",
    type: "daily",
    bgGradient: "from-amber-400 to-orange-500",
  },
  {
    id: "trending_georgia",
    title: "საქართველო",
    subtitle: "შეამოწმე შენი ცოდნა!",
    icon: "🇬🇪",
    type: "trending",
    bgGradient: "from-purple-500 to-pink-500",
  },
];

export const getCategoryById = (id: string): Category | undefined => {
  return categories.find((cat) => cat.id === id);
};

export const getCategoriesByType = (type: Category["type"]): Category[] => {
  return categories.filter((cat) => cat.type === type);
};
