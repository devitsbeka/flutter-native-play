// Inspirational room name generator for game rooms
// These names are epic and creative - perfect for friends gathering to play trivia!

const INSPIRATIONAL_NAMES = [
  // Cosmic
  "კოსმოსური ხომალდი",      // Cosmic Ship
  "ვარსკვლავთა კავშირი",    // Star Alliance
  "გალაქტიკის მცველები",    // Galaxy Guardians
  "მთვარის მხარე",          // Moon Side
  "კოსმოსური არენა",        // Cosmic Arena
  // Adventure
  "მოგზაურთა ბანაკი",       // Travelers' Camp
  "აღმომჩენთა კლუბი",       // Explorers' Club
  "თავგადასავლის გზა",      // Path of Adventure
  "ჰორიზონტის მიღმა",       // Beyond the Horizon
  // Nature
  "ბუნების მცველები",       // Nature Guardians
  "მწვანე ოაზისი",          // Green Oasis
  "ტყის საიდუმლო",          // Forest Secret
  "მთის მწვერვალი",         // Mountain Peak
  // Fantasy
  "დრაკონთა ბუდე",          // Dragons' Nest
  "ფენიქსის ფრთები",        // Phoenix Wings
  "ჯადოსნური ტყე",          // Magical Forest
  "მოჯადოებული სასახლე",    // Enchanted Palace
  // Wisdom
  "ბრძენთა საბჭო",          // Council of Sages
  "გენიოსების კლუბი",       // Geniuses' Club
  "ცოდნის ციხე",            // Fortress of Knowledge
  "ჭკვიანების ოთახი",       // Smart Ones' Room
  // Legends
  "ლეგენდების ოთახი",       // Room of Legends
  "მითების სამყარო",        // World of Myths
  "გმირთა არენა",           // Heroes' Arena
  "დიდებულთა კლუბი",        // Club of the Great
  // Champions
  "ჩემპიონთა ლიგა",         // Champions' League
  "გამარჯვებულთა კლუბი",    // Winners' Club
  "ტიტანების არენა",        // Titans' Arena
  "ძლევამოსილთა ოთახი",     // Room of the Victorious
  // Friends
  "მეგობრების ოთახი",       // Friends' Room
  "სახალისო კომპანია",      // Fun Company
  "მხიარულთა არენა",        // Arena of the Cheerful
  "ხუმრობების კლუბი",       // Jokes Club
];

export function generateRoomName(): string {
  return INSPIRATIONAL_NAMES[Math.floor(Math.random() * INSPIRATIONAL_NAMES.length)];
}
