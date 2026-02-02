// Trivia-themed room name generator for game rooms
// Simple fallback names for when AI generation is not available

const TRIVIA_NAMES = [
  "IQ ბრძოლა",
  "გენიოსები", 
  "ჭკვიანები",
  "ერუდიტები",
  "მცოდნეები",
  "მეცნიერები",
  "კვიზმანიები",
  "ტვინები",
  "გონიერები",
  "გამარჯვებულები",
  "ლიდერები"
];

export function generateRoomName(): string {
  return TRIVIA_NAMES[Math.floor(Math.random() * TRIVIA_NAMES.length)];
}

// Export for potential future use
export { TRIVIA_NAMES };
