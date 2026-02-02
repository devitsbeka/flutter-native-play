// Trivia-themed room name generator for game rooms
// All names are ≤18 characters, focused on intelligence/challenge themes
// Context: friends/family competing - who's smarter, faster, more knowledgeable

const TRIVIA_NAMES = [
  // Intelligence/Knowledge (≤18 chars)
  "IQ არენა",           // 8  - IQ Arena
  "ქვიზ არენა",         // 10 - Quiz Arena
  "გონების არენა",      // 13 - Mind Arena
  "ცოდნის არენა",       // 12 - Knowledge Arena
  "ტვინის შტორმი",      // 13 - Brain Storm
  "ბრძენთა კლუბი",      // 13 - Sages Club
  "გენიოსთა კლუბი",     // 14 - Geniuses Club
  "ჭკუის ტესტი",        // 11 - Wit Test
  "ცოდნის ტესტი",       // 12 - Knowledge Test
  
  // Challenge/Duel (≤18 chars)
  "ტრივია დუელი",       // 12 - Trivia Duel
  "ბრძენთა დუელი",      // 13 - Sages Duel
  "გონების დუელი",      // 13 - Mind Duel
  "ქვიზ შეჯიბრი",       // 12 - Quiz Contest
  "ცოდნის ბრძოლა",      // 13 - Knowledge Battle
  "ჭკუის ბრძოლა",       // 12 - Wit Battle
  "IQ ბატალია",         // 10 - IQ Battle
  "გონების რბოლა",      // 13 - Mind Race
  
  // Team/Friends (≤18 chars)
  "გუნდური ქვიზი",      // 13 - Team Quiz
  "მეგობართა ქვიზი",    // 14 - Friends' Quiz
  "ოჯახის ქვიზი",       // 12 - Family Quiz
  "კომპანიის ქვიზი",    // 15 - Company's Quiz
  "გუნდის არენა",       // 12 - Team Arena
  "საოჯახო დუელი",      // 13 - Family Duel
  
  // Short/Universal (≤12 chars)
  "ქვიზ ზონა",          // 9  - Quiz Zone
  "გონება+",            // 7  - Mind+
  "ცოდნა+",             // 6  - Knowledge+
  "ტრივია+",            // 8  - Trivia+
  "IQ ზონა",            // 7  - IQ Zone
  "ბრძენი",             // 6  - Sage
  "გენიოსი",            // 7  - Genius
  "ჭკვიანები",          // 9  - Smart Ones
  "ერუდიტები",          // 9  - Erudites
  "მცოდნეები",          // 9  - Knowers
];

export function generateRoomName(): string {
  return TRIVIA_NAMES[Math.floor(Math.random() * TRIVIA_NAMES.length)];
}
