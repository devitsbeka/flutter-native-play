import cinema from "@/assets/thiings/cinema.png";
import history from "@/assets/thiings/history.png";
import ai from "@/assets/thiings/ai.png";
import fashion from "@/assets/thiings/fashion.png";
import chemistry from "@/assets/thiings/chemistry.png";
import anime from "@/assets/thiings/anime.png";
import deejay from "@/assets/thiings/deejay.png";
import meme from "@/assets/thiings/meme.png";
import art from "@/assets/thiings/art.png";
import gem from "@/assets/figma-home/gem-new.png";
import coin from "@/assets/figma-home/coin-new.png";
export { default as starIcon } from "@/assets/thiings/star.png";
export { default as lockIcon } from "@/assets/thiings/lock.png";

interface CategoryIconEntry {
  asset: string;
  /** Lowercased keywords (Georgian + English) matched against node labels. */
  keywords: string[];
}

/**
 * Thiings-library style icon registry: category names/keywords resolve to
 * rendered 3D icon assets, so worlds never hardcode image paths — a node's
 * label (or explicit `icon` key) is enough.
 */
export const categoryIconMeta: Record<string, CategoryIconEntry> = {
  cinema: { asset: cinema, keywords: ["კინო", "ფილმ", "cinema", "movie", "film"] },
  music: { asset: deejay, keywords: ["მუსიკ", "დიჯეი", "music", "dj", "deejay", "song"] },
  ai: { asset: ai, keywords: ["ტექნოლოგ", "ხელოვნური", "ინტელექტ", "tech", "ai", "robot"] },
  fashion: { asset: fashion, keywords: ["მოდა", "ტანსაცმ", "fashion", "dress", "style"] },
  chemistry: { asset: chemistry, keywords: ["ქიმია", "მეცნიერ", "chemistry", "science", "lab"] },
  anime: { asset: anime, keywords: ["ანიმე", "მცველ", "anime", "manga", "guardian"] },
  meme: { asset: meme, keywords: ["მემ", "მისიებ", "meme", "mission", "daily"] },
  art: { asset: art, keywords: ["ხელოვნებ", "art", "museum", "paint"] },
  history: { asset: history, keywords: ["ისტორ", "ომ", "history", "war", "plane"] },
  gem: { asset: gem, keywords: ["ალმას", "ზარდახშ", "gem", "chest", "diamond"] },
  coin: { asset: coin, keywords: ["საჩუქ", "ქულა", "ჯილდო", "coin", "gift", "reward"] },
};

/**
 * Resolve a category icon by explicit key first, then by keyword match on
 * the label. Falls back to the gem so every marker always renders an icon.
 */
export function resolveCategoryIcon(label: string, iconKey?: string): string {
  if (iconKey && categoryIconMeta[iconKey]) return categoryIconMeta[iconKey].asset;
  const needle = label.toLowerCase();
  for (const entry of Object.values(categoryIconMeta)) {
    if (entry.keywords.some((k) => needle.includes(k))) return entry.asset;
  }
  return gem;
}
