/**
 * The two language-specific literature categories.
 *
 * These have no Georgian or English pool to translate from — a category
 * flagged `is_language_specific` serves exactly one language, and its level
 * count is decided by that language alone. So these are written, not
 * translated: five new questions in the voice the existing bank already uses
 * (author-and-work, one unambiguous answer, three plausible contemporaries).
 *
 * Keyed by category slug. `level` and `difficulty` are given here because
 * there is no source row to copy them from.
 */
export default {
  spanish_literature: [
    {
      language: "es",
      level: 20,
      difficulty: "medium",
      q: "¿Quién escribió «Los santos inocentes»?",
      c: "Miguel Delibes",
      w: ["Camilo José Cela", "Ana María Matute", "Rafael Sánchez Ferlosio"],
    },
    {
      language: "es",
      level: 20,
      difficulty: "easy",
      q: "¿Qué poeta del 27 escribió «Romancero gitano»?",
      c: "Federico García Lorca",
      w: ["Rafael Alberti", "Luis Cernuda", "Jorge Guillén"],
    },
  ],

  portuguese_literature: [
    {
      language: "pt",
      level: 20,
      difficulty: "easy",
      q: "Quem escreveu «Ensaio sobre a Cegueira»?",
      c: "José Saramago",
      w: ["António Lobo Antunes", "Miguel Torga", "Vergílio Ferreira"],
    },
    {
      language: "pt",
      level: 20,
      difficulty: "medium",
      q: "Que heterónimo de Fernando Pessoa assina «O Guardador de Rebanhos»?",
      c: "Alberto Caeiro",
      w: ["Ricardo Reis", "Álvaro de Campos", "Bernardo Soares"],
    },
    {
      language: "pt",
      level: 20,
      difficulty: "medium",
      q: "Quem escreveu o romance «Terra Sonâmbula»?",
      c: "Mia Couto",
      w: ["Pepetela", "Luandino Vieira", "Ondjaki"],
    },
  ],
};
