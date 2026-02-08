// Fake opponent data for simulated matchmaking

import mascotAvatar1 from "@/assets/avatars/mascot-avatar-1.png";
import mascotAvatar2 from "@/assets/avatars/mascot-avatar-2.png";
import mascotAvatar3 from "@/assets/avatars/mascot-avatar-3.png";
import mascotAvatar4 from "@/assets/avatars/mascot-avatar-4.png";
import mascotAvatar5 from "@/assets/avatars/mascot-avatar-5.png";
import mascotAvatar6 from "@/assets/avatars/mascot-avatar-6.png";
import mascotAvatar7 from "@/assets/avatars/mascot-avatar-7.png";
import mascotAvatar8 from "@/assets/avatars/mascot-avatar-8.png";

export interface FakeOpponent {
  name: string;
  countryCode: string;
  countryName: string;
  points: number;
  rank: string;
  avatarEmoji: string;
  avatarUrl: string;
}

const mascotAvatars = [
  mascotAvatar1,
  mascotAvatar2,
  mascotAvatar3,
  mascotAvatar4,
  mascotAvatar5,
  mascotAvatar6,
  mascotAvatar7,
  mascotAvatar8,
];

const georgianFirstNames = [
  "გიორგი", "მარიამი", "ნიკა", "ანა", "დავითი", "ელენე", "ლუკა", "თამარი",
  "ნინო", "ალექსანდრე", "სოფია", "ილია", "ბარბარე", "გიო", "ნატო", "თეკო",
  "ლიკა", "ზურა", "ნანა", "მაკო", "ბექა", "რატი", "კოტე", "ანი",
  "სანდრო", "თაკო", "ირაკლი", "ეკა", "ლაშა", "მანანა", "გვანცა", "ბაჩო",
  "ტატო", "მარი", "თორნიკე", "ქეთი", "ლევანი", "თეა", "ნიკოლოზი", "მაია",
];

const georgianLastInitials = [
  "კ.", "გ.", "ბ.", "ჩ.", "თ.", "მ.", "ლ.", "ს.",
  "ხ.", "ჯ.", "წ.", "ფ.", "დ.", "რ.", "ა.", "ზ.",
  "ნ.", "პ.", "ე.", "შ.",
];

export const countries = [
  { code: "GE", name: "Georgia", flag: "🇬🇪" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "AM", name: "Armenia", flag: "🇦🇲" },
  { code: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
];

// Weighted country distribution — heavily favoring Georgia
const countryWeights = [
  { code: "GE", weight: 70 },
  { code: "US", weight: 4 },
  { code: "GB", weight: 3 },
  { code: "DE", weight: 3 },
  { code: "FR", weight: 3 },
  { code: "IT", weight: 2 },
  { code: "ES", weight: 2 },
  { code: "TR", weight: 4 },
  { code: "RU", weight: 3 },
  { code: "UA", weight: 2 },
  { code: "AM", weight: 2 },
  { code: "AZ", weight: 2 },
];

function getWeightedCountry() {
  const totalWeight = countryWeights.reduce((sum, c) => sum + c.weight, 0);
  let random = Math.random() * totalWeight;
  for (const entry of countryWeights) {
    random -= entry.weight;
    if (random <= 0) {
      return countries.find(c => c.code === entry.code)!;
    }
  }
  return countries[0]; // fallback to GE
}

const avatarEmojis = ["😎", "🤓", "🧐", "😏", "🤔", "😊", "🙂", "🤠", "👻", "🦊", "🐱", "🐶", "🦁", "🐯", "🐼", "🐨", "🦄", "🐲", "👾", "🤖"];

export const ranks = [
  { name: "ბრინჯაო", minPoints: 0, maxPoints: 999, color: "text-amber-600", gradient: null },
  { name: "ვერცხლი", minPoints: 1000, maxPoints: 2499, color: "text-gray-400", gradient: null },
  { name: "ოქრო", minPoints: 2500, maxPoints: 4999, color: "text-yellow-500", gradient: null },
  { name: "პლატინა", minPoints: 5000, maxPoints: 9999, color: "text-cyan-400", gradient: null },
  { name: "ბრილიანტი", minPoints: 10000, maxPoints: 24999, color: "text-blue-400", gradient: null },
  { name: "ოსტატი", minPoints: 25000, maxPoints: 49999, color: "text-transparent", gradient: "bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500 bg-clip-text" },
  { name: "გრანდმასტერი", minPoints: 50000, maxPoints: Infinity, color: "text-transparent", gradient: "bg-gradient-to-r from-amber-300 via-rose-400 to-purple-500 bg-clip-text" },
];

export function getRankFromPoints(points: number): { name: string; color: string; gradient: string | null } {
  const rank = ranks.find(r => points >= r.minPoints && points <= r.maxPoints);
  return rank || ranks[0];
}

export function generateFakeOpponent(): FakeOpponent {
  const firstName = georgianFirstNames[Math.floor(Math.random() * georgianFirstNames.length)];
  const lastInitial = georgianLastInitials[Math.floor(Math.random() * georgianLastInitials.length)];
  const country = getWeightedCountry();
  const points = Math.floor(Math.random() * 15000) + 500;
  const rankInfo = getRankFromPoints(points);
  const avatarEmoji = avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)];
  const avatarUrl = mascotAvatars[Math.floor(Math.random() * mascotAvatars.length)];

  return {
    name: `${firstName} ${lastInitial}`,
    countryCode: country.code,
    countryName: country.name,
    points,
    rank: rankInfo.name,
    avatarEmoji,
    avatarUrl,
  };
}

export function getCountryFlag(code: string): string {
  const country = countries.find(c => c.code === code);
  return country?.flag || "🏳️";
}
