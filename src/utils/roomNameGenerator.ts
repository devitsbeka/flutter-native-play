// Georgian room name generator for game rooms

const adjectives = [
  "მხიარული", // Cheerful
  "ჭკვიანი", // Smart
  "ძლიერი", // Strong
  "სწრაფი", // Fast
  "ბრწყინვალე", // Brilliant
  "გენიალური", // Genius
  "საოცარი", // Amazing
  "ლეგენდარული", // Legendary
  "ეპიკური", // Epic
  "დიდებული", // Glorious
  "მამაცი", // Brave
  "ბედნიერი", // Happy
  "ფანტასტიური", // Fantastic
  "მაგარი", // Cool
  "სუპერ", // Super
];

const nouns = [
  "გუნდი", // Team
  "მეგობრები", // Friends
  "გმირები", // Heroes
  "ვარსკვლავები", // Stars
  "ჩემპიონები", // Champions
  "გენიოსები", // Geniuses
  "მოგზაურები", // Travelers
  "მეომრები", // Warriors
  "ოსტატები", // Masters
  "ლიდერები", // Leaders
  "მეფეები", // Kings
  "ტიტანები", // Titans
  "დრაკონები", // Dragons
  "არწივები", // Eagles
  "ფენიქსები", // Phoenixes
];

export function generateRoomName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
}
