/**
 * The questions a new My Trivia Party opens on.
 *
 * The screen used to start on one blank card saying "Tap to add a question…",
 * which asks the hardest part of the job — think of something — before it has
 * shown what the game is for. It opens on a worked example instead: family
 * questions in the shape this game plays best, where the question is about
 * the people in the room and so are the answers.
 *
 * The pool is much larger than a party needs, and ten are drawn from it at
 * random, so two parties made on the same evening are not the same ten cards.
 *
 * Nothing here is fixed. Every question, every answer and which one is right
 * can be edited, and the first answer is marked correct because a card needs
 * one, not because it is the answer for anybody's family.
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

/** How many of the pool a new party is seeded with. */
export const PARTY_STARTER_COUNT = 10;

const ka: StarterQuestion[] = [
  // — mornings and the daily round —
  { question: "ვინ იღვიძებს ოჯახში ყველაზე ადრე?", answers: ["დედა", "მამა", "ბებია", "მე თვითონ"], iconSlug: "alarm-clock" },
  { question: "ვინ იძინებს ყველაზე გვიან?", answers: ["უფროსი ძმა", "მე თვითონ", "მამა", "უმცროსი და"], iconSlug: "moon" },
  { question: "ვინ აგვიანებს ყველაზე ხშირად?", answers: ["მამა", "უფროსი და", "ბიძაშვილი", "მე თვითონ"], iconSlug: "wall-clock" },
  { question: "ვინ სვამს ყველაზე მეტ ყავას?", answers: ["მამა", "დედა", "ბებია", "უფროსი და"], iconSlug: "coffee" },
  { question: "ვინ ატარებს ყველაზე მეტ დროს ტელეფონზე?", answers: ["უმცროსი და", "ძმა", "მამა", "ბებია"], iconSlug: "smartphone" },
  { question: "ვინ ივიწყებს ხოლმე გასაღებებს?", answers: ["მამა", "დედა", "ძმა", "მე თვითონ"], iconSlug: "keys" },
  { question: "ვინ ალაგებს სახლში ყველაზე ხშირად?", answers: ["დედა", "ბებია", "უფროსი და", "მე თვითონ"], iconSlug: "broom" },
  { question: "ვინ რეცხავს ჭურჭელს ყველაზე ხშირად?", answers: ["დედა", "მამა", "უფროსი ძმა", "მე თვითონ"], iconSlug: "dish-sponge" },
  { question: "ვინ არის ოჯახში ყველაზე მოწესრიგებული?", answers: ["დედა", "ბებია", "მამა", "მე თვითონ"], iconSlug: "vacuum-cleaner" },

  // — the kitchen and what everyone likes —
  { question: "ვინ ამზადებს ოჯახში ყველაზე გემრიელ საჭმელს?", answers: ["ბებია", "დედა", "მამა", "უფროსი და"], iconSlug: "chef" },
  { question: "ვის უყვარს ყველაზე მეტად ტკბილეული?", answers: ["უმცროსი და", "ძმა", "ბაბუა", "მე თვითონ"], iconSlug: "candy" },
  { question: "ვინ ჭამს ყველაზე ნელა?", answers: ["უმცროსი ძმა", "მე თვითონ", "დედა", "ბებია"], iconSlug: "fork" },
  { question: "ვინ ირჩევს ხოლმე რესტორანს?", answers: ["მამა", "დედა", "უფროსი და", "ყველა ერთად"], iconSlug: "restaurant" },
  { question: "ვინ აკეთებს ყველაზე გემრიელ ტორტს?", answers: ["ბებია", "დედა", "დეიდა", "მე თვითონ"], iconSlug: "cake" },
  { question: "ვინ აჭმევს შინაურ ცხოველს?", answers: ["მე თვითონ", "უმცროსი და", "ძმა", "დედა"], iconSlug: "pet-bowl" },

  // — who everyone is —
  { question: "ვის შეუძლია ყველას გაცინება?", answers: ["ბაბუა", "ძმა", "დეიდა", "მე თვითონ"], iconSlug: "smile" },
  { question: "ვინ მღერის მანქანაში ყველაზე ხმამაღლა?", answers: ["მამა", "დედა", "ძმა", "ყველა ერთად"], iconSlug: "karaoke-microphone" },
  { question: "ვინ ლაპარაკობს ყველაზე მეტს?", answers: ["დეიდა", "ბებია", "უფროსი და", "მე თვითონ"], iconSlug: "text-message-speech-bubble" },
  { question: "ვინ იღებს ყველაზე მეტ სელფის?", answers: ["უფროსი და", "მე თვითონ", "ბიძაშვილი", "დედა"], iconSlug: "selfie" },
  { question: "ვის ეშინია ობობების?", answers: ["დედა", "უფროსი და", "მამა", "მე თვითონ"], iconSlug: "spiderweb" },
  { question: "ვინ უყურებს ტელევიზორს ყველაზე ხშირად?", answers: ["ბაბუა", "მამა", "ბებია", "ძმა"], iconSlug: "television" },

  // — what everyone remembers —
  { question: "ვის ახსოვს ყველას დაბადების დღე?", answers: ["ბებია", "დედა", "დეიდა", "მე თვითონ"], iconSlug: "birthday-cake" },
  { question: "ვინ იცის ყველაზე მეტი ანეკდოტი?", answers: ["ბაბუა", "მამა", "ბიძა", "ძმა"], iconSlug: "comedy-night" },
  { question: "ვინ პოულობს დაკარგულ ნივთებს?", answers: ["დედა", "ბებია", "უფროსი და", "მე თვითონ"], iconSlug: "binoculars" },
  { question: "ვის ახსოვს ბავშვობის ამბები ყველაზე კარგად?", answers: ["ბებია", "დედა", "ბაბუა", "უფროსი და"], iconSlug: "photo-album" },

  // — where everyone is going —
  { question: "ვინ აპირებს უახლოეს მომავალში მოგზაურობას?", answers: ["მამა", "დეიდა", "ძმა", "მთელი ოჯახი"], iconSlug: "suitcase" },
  { question: "ვის უყვარს თვითმფრინავით ფრენა?", answers: ["უფროსი და", "მამა", "მე თვითონ", "ბიძაშვილი"], iconSlug: "airplane" },
  { question: "ვის უნდა ყველაზე მეტად ზღვაზე წასვლა?", answers: ["უმცროსი და", "მე თვითონ", "დედა", "მთელი ოჯახი"], iconSlug: "beach" },
  { question: "ვინ ირჩევს მუსიკას მანქანაში?", answers: ["უფროსი და", "მამა", "ძმა", "დედა"], iconSlug: "sheet-music" },

  // — favourites —
  { question: "რომელი ფერი უყვარს დედას ყველაზე მეტად?", answers: ["წითელი", "ლურჯი", "მწვანე", "თეთრი"], iconSlug: "artist-palette" },
  { question: "რომელი ფილმი უყვარს ოჯახს ყველაზე მეტად?", answers: ["კომედია", "მულტფილმი", "სათავგადასავლო", "დეტექტივი"], iconSlug: "popcorn" },
  { question: "ვის უყვარს ზამთარი ყველაზე მეტად?", answers: ["ძმა", "უმცროსი და", "მამა", "მე თვითონ"], iconSlug: "snowflake" },
  { question: "ვის უყვარს ფეხბურთი ყველაზე მეტად?", answers: ["მამა", "ძმა", "ბიძა", "მე თვითონ"], iconSlug: "football" },

  // — the house and its holidays —
  { question: "ვინ ირჩევს საჩუქრებს ყველაზე კარგად?", answers: ["დედა", "დეიდა", "უფროსი და", "მე თვითონ"], iconSlug: "gift" },
  { question: "ვინ იღებს ყველაზე მეტ ფოტოს ოჯახურ სადილზე?", answers: ["დედა", "უფროსი და", "დეიდა", "მე თვითონ"], iconSlug: "camera" },
  { question: "ვინ ივიწყებს ხოლმე ქოლგას?", answers: ["მამა", "ძმა", "მე თვითონ", "უფროსი და"], iconSlug: "umbrella" },
];

const en: StarterQuestion[] = [
  { question: "Who wakes up earliest in the family?", answers: ["Mum", "Dad", "Grandma", "Me"], iconSlug: "alarm-clock" },
  { question: "Who goes to bed the latest?", answers: ["Big brother", "Me", "Dad", "Little sister"], iconSlug: "moon" },
  { question: "Who is late most often?", answers: ["Dad", "Big sister", "Cousin", "Me"], iconSlug: "wall-clock" },
  { question: "Who drinks the most coffee?", answers: ["Dad", "Mum", "Grandma", "Big sister"], iconSlug: "coffee" },
  { question: "Who spends the most time on the phone?", answers: ["Little sister", "Brother", "Dad", "Grandma"], iconSlug: "smartphone" },
  { question: "Who always forgets their keys?", answers: ["Dad", "Mum", "Brother", "Me"], iconSlug: "keys" },
  { question: "Who tidies the house most often?", answers: ["Mum", "Grandma", "Big sister", "Me"], iconSlug: "broom" },
  { question: "Who does the washing-up most often?", answers: ["Mum", "Dad", "Big brother", "Me"], iconSlug: "dish-sponge" },
  { question: "Who is the tidiest in the family?", answers: ["Mum", "Grandma", "Dad", "Me"], iconSlug: "vacuum-cleaner" },

  { question: "Who cooks the best food in the family?", answers: ["Grandma", "Mum", "Dad", "Big sister"], iconSlug: "chef" },
  { question: "Who loves sweets the most?", answers: ["Little sister", "Brother", "Grandpa", "Me"], iconSlug: "candy" },
  { question: "Who eats the slowest?", answers: ["Little brother", "Me", "Mum", "Grandma"], iconSlug: "fork" },
  { question: "Who always picks the restaurant?", answers: ["Dad", "Mum", "Big sister", "Everyone together"], iconSlug: "restaurant" },
  { question: "Who bakes the best cake?", answers: ["Grandma", "Mum", "Auntie", "Me"], iconSlug: "cake" },
  { question: "Who feeds the pet?", answers: ["Me", "Little sister", "Brother", "Mum"], iconSlug: "pet-bowl" },

  { question: "Who can make everyone laugh?", answers: ["Grandpa", "Brother", "Auntie", "Me"], iconSlug: "smile" },
  { question: "Who sings loudest in the car?", answers: ["Dad", "Mum", "Brother", "Everyone together"], iconSlug: "karaoke-microphone" },
  { question: "Who talks the most?", answers: ["Auntie", "Grandma", "Big sister", "Me"], iconSlug: "text-message-speech-bubble" },
  { question: "Who takes the most selfies?", answers: ["Big sister", "Me", "Cousin", "Mum"], iconSlug: "selfie" },
  { question: "Who is afraid of spiders?", answers: ["Mum", "Big sister", "Dad", "Me"], iconSlug: "spiderweb" },
  { question: "Who watches television most often?", answers: ["Grandpa", "Dad", "Grandma", "Brother"], iconSlug: "television" },

  { question: "Who remembers everyone's birthday?", answers: ["Grandma", "Mum", "Auntie", "Me"], iconSlug: "birthday-cake" },
  { question: "Who knows the most jokes?", answers: ["Grandpa", "Dad", "Uncle", "Brother"], iconSlug: "comedy-night" },
  { question: "Who finds the things everyone loses?", answers: ["Mum", "Grandma", "Big sister", "Me"], iconSlug: "binoculars" },
  { question: "Who remembers childhood stories best?", answers: ["Grandma", "Mum", "Grandpa", "Big sister"], iconSlug: "photo-album" },

  { question: "Who is going travelling soon?", answers: ["Dad", "Auntie", "Brother", "The whole family"], iconSlug: "suitcase" },
  { question: "Who loves flying the most?", answers: ["Big sister", "Dad", "Me", "Cousin"], iconSlug: "airplane" },
  { question: "Who most wants to go to the seaside?", answers: ["Little sister", "Me", "Mum", "The whole family"], iconSlug: "beach" },
  { question: "Who picks the music in the car?", answers: ["Big sister", "Dad", "Brother", "Mum"], iconSlug: "sheet-music" },

  { question: "Which colour does Mum love most?", answers: ["Red", "Blue", "Green", "White"], iconSlug: "artist-palette" },
  { question: "Which film does the family love most?", answers: ["Comedy", "Cartoon", "Adventure", "Detective"], iconSlug: "popcorn" },
  { question: "Who loves winter the most?", answers: ["Brother", "Little sister", "Dad", "Me"], iconSlug: "snowflake" },
  { question: "Who loves football the most?", answers: ["Dad", "Brother", "Uncle", "Me"], iconSlug: "football" },

  { question: "Who chooses the best presents?", answers: ["Mum", "Auntie", "Big sister", "Me"], iconSlug: "gift" },
  { question: "Who takes the most photos at dinner?", answers: ["Mum", "Big sister", "Auntie", "Me"], iconSlug: "camera" },
  { question: "Who always forgets their umbrella?", answers: ["Dad", "Brother", "Me", "Big sister"], iconSlug: "umbrella" },
];

export const PARTY_STARTER_PACK: Record<string, StarterQuestion[]> = { ka, en };

/**
 * The pool in the language being read. The other five translations spread
 * English, and so does anything unrecognised — a starter pack in the wrong
 * language is worse than one in a language everybody half-reads.
 */
export function partyStarterPool(language: string): StarterQuestion[] {
  return PARTY_STARTER_PACK[language] ?? PARTY_STARTER_PACK.en;
}

/**
 * `count` questions drawn from the pool, in a random order.
 *
 * A partial Fisher-Yates over a copy: every question is equally likely and
 * none repeats. `rng` is a seam for the tests, which need to know what they
 * are going to get.
 */
export function pickStarterQuestions(
  pool: StarterQuestion[],
  count: number,
  rng: () => number = Math.random,
): StarterQuestion[] {
  const deck = [...pool];
  const take = Math.min(count, deck.length);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(rng() * (deck.length - i));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, take);
}

/** Ten from the pool, for the language being read. */
export function partyStarterPack(
  language: string,
  count: number = PARTY_STARTER_COUNT,
  rng?: () => number,
): StarterQuestion[] {
  return pickStarterQuestions(partyStarterPool(language), count, rng);
}
