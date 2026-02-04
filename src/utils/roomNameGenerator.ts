// Theme-based room name generator - 120+ unique options across 15 themes
// This is a fallback for when the edge function is not available

const THEMED_ROOM_NAMES: Record<string, string[]> = {
  champion: [
    "ოქროს თასი",        // Golden Cup
    "ვარსკვლავთა ბრძოლა", // Stars Battle
    "მედლების კლუბი",    // Medals Club
    "ჩემპიონები",        // Champions
    "პირველობის რინგი",   // Championship Ring
    "გამარჯვებულთა ზონა", // Winners Zone
    "ტრიუმფის არენა",     // Triumph Arena
    "პოდიუმის გზა",       // Podium Way
  ],
  adventure: [
    "კოსმოსის მოგზაური",  // Space Traveler
    "ექსპედიცია X",       // Expedition X
    "აღმოჩენის გზა",      // Discovery Path
    "მკვლევართა კლანი",   // Explorers Clan
    "ჰორიზონტის მიღმა",   // Beyond Horizon
    "საზღვრების მიღმა",   // Beyond Borders
    "ძიების ბილიკი",      // Search Trail
    "ახალი ტერიტორია",    // New Territory
  ],
  creature: [
    "ცეცხლის მცველი",     // Fire Guardian
    "მითიური ბუნაგი",     // Mythical Den
    "ლეგენდის კვალი",     // Legend's Trail
    "ჯადოსნური არსება",   // Magical Creature
    "ფანტასტიური კლუბი",  // Fantastic Club
    "მონსტრების ლიგა",    // Monsters League
    "ზღაპრის სამყარო",    // Fairytale World
    "ფრთოსანთა კლანი",    // Winged Clan
  ],
  animal: [
    "მტაცებლის ხროვა",    // Predator Pack
    "ბუნაგის მეფე",       // Den King
    "მფრინავი მხედარი",   // Flying Rider
    "ველური კლანი",       // Wild Clan
    "ბუნების ძალა",       // Nature's Power
    "თათების ლიგა",       // Paws League
    "ფოლადის კლანჭა",     // Steel Claw
    "სწრაფი ნადირი",      // Swift Hunter
  ],
  battle: [
    "ჯავშნის რინგი",      // Armor Ring
    "კლინკის ჟღერა",      // Blade Clang
    "მეომრის ბილიკი",     // Warrior's Path
    "ფარების კედელი",     // Shield Wall
    "გლადიატორები",       // Gladiators
    "რაინდთა კლანი",      // Knights Clan
    "ბრძოლის მოედანი",    // Battle Arena
    "ფოლადის გუნდი",      // Steel Team
  ],
  magic: [
    "ჯადოქართა სახლი",    // Wizards House
    "კრისტალის კოშკი",    // Crystal Tower
    "მოჯადოე კლანი",      // Enchanted Clan
    "შელოცვის წრე",       // Spell Circle
    "მაგიური ბროლი",      // Magic Orb
    "ალქიმიკოსები",       // Alchemists
    "ჯადოს სკოლა",        // Magic School
    "მისტიკის კლუბი",     // Mystic Club
  ],
  party: [
    "ზეიმის მოედანი",     // Celebration Square
    "ფეიერვერკი",         // Fireworks
    "სახალისო ბუდე",      // Fun Nest
    "წვეულების კლუბი",    // Party Club
    "ბალონების ომი",      // Balloon War
    "კონფეტის წვიმა",     // Confetti Rain
    "დღესასწაული",        // Holiday
    "ფესტივალი",          // Festival
  ],
  nature: [
    "მწვერვალის ჯგუფი",   // Summit Group
    "მზის ხეობა",         // Sun Valley
    "ტყის კლანი",         // Forest Clan
    "მთის მგლები",        // Mountain Wolves
    "ბუნების ძალა",       // Nature's Force
    "მწვანე ლიგა",        // Green League
    "ხეობის მცველი",      // Valley Guardian
    "კლდის არწივები",     // Rock Eagles
  ],
  tech: [
    "კიბერ არენა",        // Cyber Arena
    "პიქსელების ომი",     // Pixel War
    "დიჯიტალ გვარდია",    // Digital Guard
    "კოდის მეომრები",     // Code Warriors
    "ტექნო კლანი",        // Techno Clan
    "რობოტების ლიგა",     // Robots League
    "ჩიპის ჯგუფი",        // Chip Squad
    "მატრიცის რინგი",     // Matrix Ring
  ],
  music: [
    "რიტმის კლუბი",       // Rhythm Club
    "ნოტების ბრძოლა",     // Notes Battle
    "ჰარმონია",           // Harmony
    "მელოდიის კლანი",     // Melody Clan
    "კონცერტის ზონა",     // Concert Zone
    "ბითების არენა",      // Beats Arena
    "როკის ბუნაგი",       // Rock Den
    "ჯაზის კლუბი",        // Jazz Club
  ],
  mystery: [
    "საიდუმლო კლუბი",     // Secret Club
    "გამოცანის სახლი",    // Riddle House
    "დეტექტივები",        // Detectives
    "შერლოკის კლანი",     // Sherlock Clan
    "მისტერიის ზონა",     // Mystery Zone
    "გასაღების მფლობელი", // Key Holder
    "ნიღბის უკან",        // Behind the Mask
    "საიდუმლო საზოგადო",  // Secret Society
  ],
  speed: [
    "მეხის სიჩქარე",      // Thunder Speed
    "ელვის გუნდი",        // Lightning Team
    "თავგადასავალი",      // Thrill
    "რბოლის კლუბი",       // Racing Club
    "ტურბო არენა",        // Turbo Arena
    "სწრაფი და ფოლადი",   // Fast & Steel
    "ნიტროს რინგი",       // Nitro Ring
    "სიჩქარის ეშმაკი",    // Speed Demon
  ],
  ocean: [
    "ზღვის მგლები",       // Sea Wolves
    "ოკეანის კლანი",      // Ocean Clan
    "ტალღის მხედარი",     // Wave Rider
    "მეკობრეები",         // Pirates
    "წყალქვეშა ლიგა",     // Underwater League
    "ზვიგენის კბილი",     // Shark Tooth
    "ნავთსადგური",        // Harbor
    "კაპიტნის ხიდი",      // Captain's Bridge
  ],
  food: [
    "გემოვნების ბრძოლა",  // Taste Battle
    "შეფთა დუელი",        // Chefs Duel
    "გურმანთა კლუბი",     // Gourmets Club
    "რეცეპტის საიდუმლო",  // Recipe Secret
    "სამზარეულოს ომი",    // Kitchen War
    "დეგუსტაცია",         // Tasting
    "ფლეივერის ზონა",     // Flavor Zone
    "გასტრო არენა",       // Gastro Arena
  ],
  space: [
    "გალაქტიკის რინგი",   // Galaxy Ring
    "ვარსკვლავთა ჯგუფი", // Stars Group
    "კოსმიური კლანი",     // Cosmic Clan
    "ასტრონავტები",       // Astronauts
    "ორბიტის მცველი",     // Orbit Guardian
    "პლანეტების ლიგა",    // Planets League
    "მეტეორის გზა",       // Meteor Path
    "კოსმოსის კაპიტანი",  // Space Captain
  ],
};

// Flatten all names for quick random access
const ALL_NAMES = Object.values(THEMED_ROOM_NAMES).flat();

export function generateRoomName(): string {
  return ALL_NAMES[Math.floor(Math.random() * ALL_NAMES.length)];
}

// Export for potential future use
export { THEMED_ROOM_NAMES, ALL_NAMES as TRIVIA_NAMES };
