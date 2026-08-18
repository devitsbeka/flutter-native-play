// Theme-based room name generator - multilingual with 120+ unique options across 15 themes

type LangCode = 'ka' | 'en' | 'fr' | 'de' | 'es' | 'it' | 'pt';

const THEMED_ROOM_NAMES_KA: Record<string, string[]> = {
  champion: ["ოქროს თასი", "ვარსკვლავთა ბრძოლა", "მედლების კლუბი", "ჩემპიონები", "პირველობის რინგი", "გამარჯვებულთა ზონა", "ტრიუმფის არენა", "პოდიუმის გზა"],
  adventure: ["კოსმოსის მოგზაური", "ექსპედიცია X", "აღმოჩენის გზა", "მკვლევართა კლანი", "ჰორიზონტის მიღმა", "საზღვრების მიღმა", "ძიების ბილიკი", "ახალი ტერიტორია"],
  creature: ["ცეცხლის მცველი", "მითიური ბუნაგი", "ლეგენდის კვალი", "ჯადოსნური არსება", "ფანტასტიური კლუბი", "მონსტრების ლიგა", "ზღაპრის სამყარო", "ფრთოსანთა კლანი"],
  animal: ["მტაცებლის ხროვა", "ბუნაგის მეფე", "მფრინავი მხედარი", "ველური კლანი", "ბუნების ძალა", "თათების ლიგა", "ფოლადის კლანჭა", "სწრაფი ნადირი"],
  battle: ["ჯავშნის რინგი", "კლინკის ჟღერა", "მეომრის ბილიკი", "ფარების კედელი", "გლადიატორები", "რაინდთა კლანი", "ბრძოლის მოედანი", "ფოლადის გუნდი"],
  magic: ["ჯადოქართა სახლი", "კრისტალის კოშკი", "მოჯადოე კლანი", "შელოცვის წრე", "მაგიური ბროლი", "ალქიმიკოსები", "ჯადოს სკოლა", "მისტიკის კლუბი"],
  party: ["ზეიმის მოედანი", "ფეიერვერკი", "სახალისო ბუდე", "წვეულების კლუბი", "ბალონების ომი", "კონფეტის წვიმა", "დღესასწაული", "ფესტივალი"],
  nature: ["მწვერვალის ჯგუფი", "მზის ხეობა", "ტყის კლანი", "მთის მგლები", "ბუნების ძალა", "მწვანე ლიგა", "ხეობის მცველი", "კლდის არწივები"],
  tech: ["კიბერ არენა", "პიქსელების ომი", "დიჯიტალ გვარდია", "კოდის მეომრები", "ტექნო კლანი", "რობოტების ლიგა", "ჩიპის ჯგუფი", "მატრიცის რინგი"],
  music: ["რიტმის კლუბი", "ნოტების ბრძოლა", "ჰარმონია", "მელოდიის კლანი", "კონცერტის ზონა", "ბითების არენა", "როკის ბუნაგი", "ჯაზის კლუბი"],
  mystery: ["საიდუმლო კლუბი", "გამოცანის სახლი", "დეტექტივები", "შერლოკის კლანი", "მისტერიის ზონა", "გასაღების მფლობელი", "ნიღბის უკან", "საიდუმლო საზოგადო"],
  speed: ["მეხის სიჩქარე", "ელვის გუნდი", "თავგადასავალი", "რბოლის კლუბი", "ტურბო არენა", "სწრაფი და ფოლადი", "ნიტროს რინგი", "სიჩქარის ეშმაკი"],
  ocean: ["ზღვის მგლები", "ოკეანის კლანი", "ტალღის მხედარი", "მეკობრეები", "წყალქვეშა ლიგა", "ზვიგენის კბილი", "ნავთსადგური", "კაპიტნის ხიდი"],
  food: ["გემოვნების ბრძოლა", "შეფთა დუელი", "გურმანთა კლუბი", "რეცეპტის საიდუმლო", "სამზარეულოს ომი", "დეგუსტაცია", "ფლეივერის ზონა", "გასტრო არენა"],
  space: ["გალაქტიკის რინგი", "ვარსკვლავთა ჯგუფი", "კოსმიური კლანი", "ასტრონავტები", "ორბიტის მცველი", "პლანეტების ლიგა", "მეტეორის გზა", "კოსმოსის კაპიტანი"],
};

const THEMED_ROOM_NAMES_EN: Record<string, string[]> = {
  champion: ["Golden Cup", "Stars Battle", "Medals Club", "Champions", "Title Ring", "Winners Zone", "Triumph Arena", "Podium Way"],
  adventure: ["Space Traveler", "Expedition X", "Discovery Path", "Explorers Clan", "Beyond Horizon", "Beyond Borders", "Search Trail", "New Territory"],
  creature: ["Fire Guardian", "Mythical Den", "Legend's Trail", "Magic Creature", "Fantastic Club", "Monsters League", "Fairytale World", "Winged Clan"],
  animal: ["Predator Pack", "Den King", "Flying Rider", "Wild Clan", "Nature's Power", "Paws League", "Steel Claw", "Swift Hunter"],
  battle: ["Armor Ring", "Blade Clang", "Warrior's Path", "Shield Wall", "Gladiators", "Knights Clan", "Battle Arena", "Steel Team"],
  magic: ["Wizards House", "Crystal Tower", "Enchanted Clan", "Spell Circle", "Magic Orb", "Alchemists", "Magic School", "Mystic Club"],
  party: ["Celebration Plaza", "Fireworks", "Fun Nest", "Party Club", "Balloon War", "Confetti Rain", "Holiday", "Festival"],
  nature: ["Summit Group", "Sun Valley", "Forest Clan", "Mountain Wolves", "Nature's Force", "Green League", "Valley Guardian", "Rock Eagles"],
  tech: ["Cyber Arena", "Pixel War", "Digital Guard", "Code Warriors", "Techno Clan", "Robots League", "Chip Squad", "Matrix Ring"],
  music: ["Rhythm Club", "Notes Battle", "Harmony", "Melody Clan", "Concert Zone", "Beats Arena", "Rock Den", "Jazz Club"],
  mystery: ["Secret Club", "Riddle House", "Detectives", "Sherlock Clan", "Mystery Zone", "Key Holder", "Behind the Mask", "Secret Society"],
  speed: ["Thunder Speed", "Lightning Team", "Thrill", "Racing Club", "Turbo Arena", "Fast & Steel", "Nitro Ring", "Speed Demon"],
  ocean: ["Sea Wolves", "Ocean Clan", "Wave Rider", "Pirates", "Underwater League", "Shark Tooth", "Harbor", "Captain's Bridge"],
  food: ["Taste Battle", "Chefs Duel", "Gourmets Club", "Recipe Secret", "Kitchen War", "Tasting", "Flavor Zone", "Gastro Arena"],
  space: ["Galaxy Ring", "Stars Group", "Cosmic Clan", "Astronauts", "Orbit Guardian", "Planets League", "Meteor Path", "Space Captain"],
};

function getNamesByLang(lang: LangCode): Record<string, string[]> {
  if (lang === 'ka') return THEMED_ROOM_NAMES_KA;
  // All Latin-script languages use EN for the client-side fallback
  return THEMED_ROOM_NAMES_EN;
}

function normalizeLang(lang: string | null | undefined): LangCode {
  if (!lang) return 'en';
  const l = lang.toLowerCase().trim();
  if (['ka', 'en', 'fr', 'de', 'es', 'it', 'pt'].includes(l)) return l as LangCode;
  return 'en';
}

// Flatten all names for quick random access
const ALL_NAMES_KA = Object.values(THEMED_ROOM_NAMES_KA).flat();
const ALL_NAMES_EN = Object.values(THEMED_ROOM_NAMES_EN).flat();

export function generateRoomName(language?: string): string {
  const lang = normalizeLang(language);
  const names = lang === 'ka' ? ALL_NAMES_KA : ALL_NAMES_EN;
  return names[Math.floor(Math.random() * names.length)];
}

// Language-appropriate default fallback name
export function getDefaultRoomName(language?: string): string {
  const lang = normalizeLang(language);
  return lang === 'ka' ? 'სახალისო გუნდი' : 'Fun Squad';
}

// Export for potential future use
export { THEMED_ROOM_NAMES_KA as THEMED_ROOM_NAMES, ALL_NAMES_KA as TRIVIA_NAMES };
