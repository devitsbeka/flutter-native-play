// Fake opponent data for simulated matchmaking

import botAvatar1 from "@/assets/avatars/bot-avatar-1.png";
import botAvatar2 from "@/assets/avatars/bot-avatar-2.png";
import botAvatar3 from "@/assets/avatars/bot-avatar-3.png";
import botAvatar4 from "@/assets/avatars/bot-avatar-4.png";
import botAvatar5 from "@/assets/avatars/bot-avatar-5.png";
import botAvatar6 from "@/assets/avatars/bot-avatar-6.png";
import botAvatar7 from "@/assets/avatars/bot-avatar-7.png";
import botAvatar8 from "@/assets/avatars/bot-avatar-8.png";
import botAvatar9 from "@/assets/avatars/bot-avatar-9.png";
import botAvatar10 from "@/assets/avatars/bot-avatar-10.png";

export interface FakeOpponent {
  name: string;
  countryCode: string;
  countryName: string;
  points: number;
  rank: string;
  avatarEmoji: string;
  avatarUrl: string;
}

const botAvatars = [
  botAvatar1,
  botAvatar2,
  botAvatar3,
  botAvatar4,
  botAvatar5,
  botAvatar6,
  botAvatar7,
  botAvatar8,
  botAvatar9,
  botAvatar10,
];

const firstNames = [
  "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Avery",
  "Skyler", "Dakota", "Jamie", "Reese", "Phoenix", "Sage", "Rowan", "Blake",
  "Cameron", "Drew", "Finley", "Harper", "Kai", "Logan", "Parker", "Peyton",
  "Yuki", "Hiroshi", "Sakura", "Chen", "Wei", "Ming", "Raj", "Priya", "Amit",
  "Sofia", "Lucas", "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Isabella",
  "Marco", "Lucia", "Hans", "Greta", "Pierre", "Marie", "Carlos", "Elena",
  "Ivan", "Natasha", "Ahmed", "Fatima", "Jin", "Hana", "Leo", "Mia"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore",
  "Tanaka", "Yamamoto", "Suzuki", "Wang", "Zhang", "Li", "Kim", "Park", "Lee",
  "Patel", "Singh", "Kumar", "Silva", "Santos", "Oliveira", "Mueller", "Schmidt",
  "Dubois", "Bernard", "Rossi", "Ferrari", "Ivanov", "Petrov", "Hassan", "Ali"
];

export const countries = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "GE", name: "Georgia", flag: "🇬🇪" },
];

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
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const country = countries[Math.floor(Math.random() * countries.length)];
  const points = Math.floor(Math.random() * 15000) + 500;
  const rankInfo = getRankFromPoints(points);
  const avatarEmoji = avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)];
  const avatarUrl = botAvatars[Math.floor(Math.random() * botAvatars.length)];

  return {
    name: `${firstName}${lastName.charAt(0)}`,
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
