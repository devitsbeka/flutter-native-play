// Trivia-themed room name generator for game rooms
// All names are ≤18 characters, focused on intelligence/challenge themes
// Context: friends/family competing - who's smarter, faster, more knowledgeable
// Uses plural forms for single-word names

// Themed room configurations matching the edge function
const THEMED_ROOMS = [
  // Intelligence/Knowledge (plural forms)
  { names: ["ერუდიტები", "მცოდნეები", "ბრძენები", "გენიოსები", "მოაზროვნეები", "ჭკვიანები"] },
  // Famous People (plural forms)
  { names: ["აინშტაინები", "დავინჩები", "ნიუტონები", "პიკასოები", "შექსპირები", "სოკრატეები"] },
  // Places/Structures (singular OK for places)
  { names: ["აკადემია", "ობსერვატორია", "ბიბლიოთეკა", "ანტიკა", "ოლიმპო", "პანთეონი"] },
  // Challenge/Game (plural forms)
  { names: ["ჩემპიონები", "გამარჯვებულები", "ლიდერები", "ნავიგატორები", "მებრძოლები"] },
  // Smart Animals (plural forms)
  { names: ["ბუები", "დელფინები", "სპილოები", "მაიმუნები", "ყორნები", "რვაფეხები"] },
  // Science (plural forms)
  { names: ["ასტრონომები", "მეცნიერები", "ფიზიკოსები", "მათემატიკოსები", "ინჟინრები", "ქიმიკოსები"] },
  // Quiz/Trivia (plural forms)
  { names: ["ქვიზერები", "ტრივიელები", "კითხვარები", "გამომცნობები"] },
  // Explorers/Adventurers (plural forms)
  { names: ["მკვლევარები", "აღმომჩენები", "მოგზაურები", "პიონერები"] },
];

// Flat list of all themed names for random selection
const ALL_TRIVIA_NAMES = THEMED_ROOMS.flatMap(theme => theme.names);

export function generateRoomName(): string {
  return ALL_TRIVIA_NAMES[Math.floor(Math.random() * ALL_TRIVIA_NAMES.length)];
}

// Export themed rooms for potential future use
export { THEMED_ROOMS, ALL_TRIVIA_NAMES };
