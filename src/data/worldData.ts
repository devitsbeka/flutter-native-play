// Trivia World - Geographic Progression System

export interface Category {
  id: string;
  name: string;
  emoji: string;
  questionsRequired: number;
}

export interface Country {
  code: string;
  name: string;
  emoji: string;
  categories: Category[];
  unlockRequirement: number | null; // null = starter country, number = countries needed to unlock
}

export interface Continent {
  id: string;
  name: string;
  emoji: string;
  countries: Country[];
  unlockRequirement: number; // continents completed to unlock
  color: string; // for globe visualization
}

// Standard categories for all countries
const standardCategories: Category[] = [
  { id: "food", name: "Food & Cuisine", emoji: "🍜", questionsRequired: 5 },
  { id: "music", name: "Music", emoji: "🎵", questionsRequired: 5 },
  { id: "culture", name: "Culture & Traditions", emoji: "🏛️", questionsRequired: 5 },
  { id: "geography", name: "Geography", emoji: "🗺️", questionsRequired: 5 },
  { id: "cinema", name: "Cinema & TV", emoji: "🎬", questionsRequired: 5 },
  { id: "history", name: "History", emoji: "📜", questionsRequired: 5 },
  { id: "sports", name: "Sports", emoji: "⚽", questionsRequired: 5 },
  { id: "random", name: "Random Facts", emoji: "❓", questionsRequired: 5 },
];

// Helper to create country with standard categories
const createCountry = (code: string, name: string, emoji: string, unlockRequirement: number | null = null): Country => ({
  code,
  name,
  emoji,
  categories: standardCategories,
  unlockRequirement,
});

export const continents: Continent[] = [
  {
    id: "asia",
    name: "Asia",
    emoji: "🌏",
    color: "#FF6B6B",
    unlockRequirement: 0, // Starter continent
    countries: [
      createCountry("TH", "Thailand", "🇹🇭", null), // Starter
      createCountry("JP", "Japan", "🇯🇵", 1),
      createCountry("KR", "South Korea", "🇰🇷", 2),
      createCountry("CN", "China", "🇨🇳", 3),
      createCountry("IN", "India", "🇮🇳", 4),
      createCountry("VN", "Vietnam", "🇻🇳", 5),
      createCountry("ID", "Indonesia", "🇮🇩", 6),
      createCountry("PH", "Philippines", "🇵🇭", 7),
    ],
  },
  {
    id: "europe",
    name: "Europe",
    emoji: "🌍",
    color: "#4ECDC4",
    unlockRequirement: 0, // Also starter
    countries: [
      createCountry("FR", "France", "🇫🇷", null), // Starter
      createCountry("IT", "Italy", "🇮🇹", 1),
      createCountry("ES", "Spain", "🇪🇸", 2),
      createCountry("DE", "Germany", "🇩🇪", 3),
      createCountry("GB", "United Kingdom", "🇬🇧", 4),
      createCountry("NL", "Netherlands", "🇳🇱", 5),
      createCountry("PT", "Portugal", "🇵🇹", 6),
      createCountry("GR", "Greece", "🇬🇷", 7),
      createCountry("SE", "Sweden", "🇸🇪", 8),
      createCountry("PL", "Poland", "🇵🇱", 9),
    ],
  },
  {
    id: "north_america",
    name: "North America",
    emoji: "🌎",
    color: "#45B7D1",
    unlockRequirement: 1, // Complete 1 continent
    countries: [
      createCountry("US", "United States", "🇺🇸", null),
      createCountry("CA", "Canada", "🇨🇦", 1),
      createCountry("MX", "Mexico", "🇲🇽", 2),
      createCountry("CU", "Cuba", "🇨🇺", 3),
      createCountry("JM", "Jamaica", "🇯🇲", 4),
    ],
  },
  {
    id: "south_america",
    name: "South America",
    emoji: "🌎",
    color: "#96CEB4",
    unlockRequirement: 1,
    countries: [
      createCountry("BR", "Brazil", "🇧🇷", null),
      createCountry("AR", "Argentina", "🇦🇷", 1),
      createCountry("CO", "Colombia", "🇨🇴", 2),
      createCountry("PE", "Peru", "🇵🇪", 3),
      createCountry("CL", "Chile", "🇨🇱", 4),
    ],
  },
  {
    id: "africa",
    name: "Africa",
    emoji: "🌍",
    color: "#DDA0DD",
    unlockRequirement: 2,
    countries: [
      createCountry("EG", "Egypt", "🇪🇬", null),
      createCountry("ZA", "South Africa", "🇿🇦", 1),
      createCountry("MA", "Morocco", "🇲🇦", 2),
      createCountry("KE", "Kenya", "🇰🇪", 3),
      createCountry("NG", "Nigeria", "🇳🇬", 4),
      createCountry("ET", "Ethiopia", "🇪🇹", 5),
    ],
  },
  {
    id: "oceania",
    name: "Oceania",
    emoji: "🌏",
    color: "#F7DC6F",
    unlockRequirement: 3,
    countries: [
      createCountry("AU", "Australia", "🇦🇺", null),
      createCountry("NZ", "New Zealand", "🇳🇿", 1),
      createCountry("FJ", "Fiji", "🇫🇯", 2),
    ],
  },
];

// Helper functions
export const getContinentById = (id: string): Continent | undefined => 
  continents.find(c => c.id === id);

export const getCountryByCode = (code: string): { country: Country; continent: Continent } | undefined => {
  for (const continent of continents) {
    const country = continent.countries.find(c => c.code === code);
    if (country) {
      return { country, continent };
    }
  }
  return undefined;
};

export const getCategoryById = (categoryId: string): Category | undefined =>
  standardCategories.find(c => c.id === categoryId);

export const getTotalCountries = (): number =>
  continents.reduce((acc, c) => acc + c.countries.length, 0);

export const getTotalCategories = (): number => standardCategories.length;

export const allCategories = standardCategories;
