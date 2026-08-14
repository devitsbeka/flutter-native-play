/**
 * The ten questions a new My Trivia Party opens with.
 *
 * The screen used to start on one blank card with "Tap to add a question…",
 * which asks the hardest part of the job — think of something — before it has
 * shown what the game is for. These are a worked example instead: a family
 * pack in the shape the game plays best, where the question is about the
 * people in the room and the answers are the people in the room.
 *
 * Nothing here is fixed. Every question, every answer and which one is right
 * can be edited, and the pack is only a starting point — the first answer is
 * marked correct because a card needs one, not because it is the answer for
 * anybody's family.
 *
 * Both sets fit the editor's limits: 65 characters for a question, 25 for an
 * answer. `src/config/__tests__/partyStarterPack.test.ts` holds them to it.
 *
 * The icon slugs are real rows in `icon_library` and name the *topic* of the
 * question, never one of its answers — an icon that points at the answer is
 * what QuestionIconPicker's safety check exists to prevent.
 */

export interface StarterQuestion {
  question: string;
  /** First one is marked correct. Everything is editable afterwards. */
  answers: [string, string, string, string];
  iconSlug: string;
}

const ka: StarterQuestion[] = [
  {
    question: "ვინ იღვიძებს ოჯახში ყველაზე ადრე?",
    answers: ["დედა", "მამა", "ბებია", "მე თვითონ"],
    iconSlug: "alarm-clock",
  },
  {
    question: "ვინ ამზადებს ოჯახში ყველაზე გემრიელ საჭმელს?",
    answers: ["ბებია", "დედა", "მამა", "უფროსი და"],
    iconSlug: "chef",
  },
  {
    question: "ვინ აგვიანებს ყველაზე ხშირად?",
    answers: ["მამა", "უფროსი და", "ბიძაშვილი", "მე თვითონ"],
    iconSlug: "wall-clock",
  },
  {
    question: "რომელი ფერი უყვარს დედას ყველაზე მეტად?",
    answers: ["წითელი", "ლურჯი", "მწვანე", "თეთრი"],
    iconSlug: "artist-palette",
  },
  {
    question: "ვინ აპირებს უახლოეს მოგზაურობას?",
    answers: ["მამა", "დეიდა", "ძმა", "მთელი ოჯახი"],
    iconSlug: "suitcase",
  },
  {
    question: "ვინ ატარებს ყველაზე მეტ დროს ტელეფონზე?",
    answers: ["უმცროსი და", "ძმა", "მამა", "ბებია"],
    iconSlug: "smartphone",
  },
  {
    question: "ვის ახსოვს ყველას დაბადების დღე?",
    answers: ["ბებია", "დედა", "დეიდა", "მე თვითონ"],
    iconSlug: "birthday-cake",
  },
  {
    question: "ვინ მღერის მანქანაში ყველაზე ხმამაღლა?",
    answers: ["მამა", "დედა", "ძმა", "ყველა ერთად"],
    iconSlug: "karaoke-microphone",
  },
  {
    question: "ვინ იძინებს ყველაზე გვიან?",
    // "და" on its own is both "sister" and "and" — spelled out so an answer
    // button cannot be read as a stray conjunction.
    answers: ["უფროსი ძმა", "მე თვითონ", "მამა", "უმცროსი და"],
    iconSlug: "moon",
  },
  {
    question: "ვის შეუძლია ყველას გაცინება?",
    answers: ["ბაბუა", "ძმა", "დეიდა", "მე თვითონ"],
    iconSlug: "smile",
  },
];

const en: StarterQuestion[] = [
  {
    question: "Who wakes up earliest in the family?",
    answers: ["Mum", "Dad", "Grandma", "Me"],
    iconSlug: "alarm-clock",
  },
  {
    question: "Who cooks the best food in the family?",
    answers: ["Grandma", "Mum", "Dad", "Big sister"],
    iconSlug: "chef",
  },
  {
    question: "Who is late most often?",
    answers: ["Dad", "Big sister", "Cousin", "Me"],
    iconSlug: "wall-clock",
  },
  {
    question: "Which colour does Mum love most?",
    answers: ["Red", "Blue", "Green", "White"],
    iconSlug: "artist-palette",
  },
  {
    question: "Who is going travelling soon?",
    answers: ["Dad", "Auntie", "Brother", "The whole family"],
    iconSlug: "suitcase",
  },
  {
    question: "Who spends the most time on the phone?",
    answers: ["Little sister", "Brother", "Dad", "Grandma"],
    iconSlug: "smartphone",
  },
  {
    question: "Who remembers everyone's birthday?",
    answers: ["Grandma", "Mum", "Auntie", "Me"],
    iconSlug: "birthday-cake",
  },
  {
    question: "Who sings loudest in the car?",
    answers: ["Dad", "Mum", "Brother", "Everyone together"],
    iconSlug: "karaoke-microphone",
  },
  {
    question: "Who goes to bed the latest?",
    answers: ["Big brother", "Me", "Dad", "Sister"],
    iconSlug: "moon",
  },
  {
    question: "Who can make everyone laugh?",
    answers: ["Grandpa", "Brother", "Auntie", "Me"],
    iconSlug: "smile",
  },
];

export const PARTY_STARTER_PACK: Record<string, StarterQuestion[]> = { ka, en };

/**
 * The pack in the language being read. The other five translations spread
 * English, and so does anything unrecognised — a starter pack in the wrong
 * language is worse than one in a language everybody half-reads.
 */
export function partyStarterPack(language: string): StarterQuestion[] {
  return PARTY_STARTER_PACK[language] ?? PARTY_STARTER_PACK.en;
}
