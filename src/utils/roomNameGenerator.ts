// Fun trivia room name generator - exciting themes for game rooms
// Simple fallback names for when AI generation is not available

const TRIVIA_NAMES = [
  // Battle themes
  "ტვინების არენა",   // Brain Arena
  "გონების რინგი",    // Mind Ring
  "IQ დუელი",         // IQ Duel
  // Team themes  
  "გენიოსთა კლუბი",   // Genius Club
  "ჭკვიანთა ბანდა",   // Smart Gang
  // Fun themes
  "IQ პარტი",         // IQ Party
  "გონების რეივი",    // Mind Rave
  // Epic themes
  "დრაკონთა კლუბი",   // Dragon Club
  "ნინჯა ტვინები",    // Ninja Brains
  "ფენიქსის ბრძოლა",  // Phoenix Battle
  "ლომთა ბრძოლა",     // Lions' Battle
];

export function generateRoomName(): string {
  return TRIVIA_NAMES[Math.floor(Math.random() * TRIVIA_NAMES.length)];
}

// Export for potential future use
export { TRIVIA_NAMES };
