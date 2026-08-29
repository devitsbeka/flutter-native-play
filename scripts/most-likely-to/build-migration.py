#!/usr/bin/env python3
"""Build the Most Likely To migration: one party category, 36 vote prompts x 7
languages, the vote-results table and the settlement function.

Run:  python3 scripts/most-likely-to/build-migration.py

"Most Likely To" is a party category with no fixed correct answer: every
player in the room votes for a player, and the most-voted player becomes the
round's correct answer (majority scoring). The prompt bank comes from the
product design (Figma "Hom", node 689-310); two prompts whose original form
had non-person answers (favourite colour / favourite film) are adapted to the
person-vote format, and family-specific wording is neutralised so the same
bank works for a room of friends.

Rows in `questions` carry the sentinel correct_answer '__vote__' and no
incorrect answers. That shape is deliberately invalid for every generic
selection pipeline (isValidQuestionLength rejects fewer than 3 incorrect
answers), so these prompts can never leak into solo levels, TV rounds or
mixed pools — only the dedicated multiplayer vote path serves them.

Non-English rows carry translated_from so the translation cron skips them.
Ids are uuid5, so re-running mints the same ids and the ON CONFLICT DO
NOTHING inserts make a second apply a no-op.
"""

import pathlib
import uuid

HERE = pathlib.Path(__file__).parent
OUT = HERE.parent.parent / "supabase" / "migrations" / "20260916100000_most_likely_to.sql"

NS = uuid.uuid5(uuid.NAMESPACE_URL, "flutter-native-play/most-likely-to")
LANGS = ["en", "ka", "de", "es", "fr", "it", "pt"]

CATEGORY_SLUG = "most_likely_to"
CATEGORY_UUID = str(uuid.uuid5(NS, f"category/{CATEGORY_SLUG}"))
VOTE_SENTINEL = "__vote__"
POINTS = 100

CATEGORY_NAMES = {
    "en": "Most Likely To",
    "ka": "ვინ არის ყველაზე?",
    "de": "Wer von uns?",
    "es": "¿Quién de nosotros?",
    "fr": "Qui de nous ?",
    "it": "Chi di noi?",
    "pt": "Quem de nós?",
}

CATEGORY_DESCRIPTIONS = {
    "en": "Vote for the player who fits best — the most-voted answer wins!",
    "ka": "მიეცი ხმა მოთამაშეს, რომელიც ყველაზე მეტად შეესაბამება — უმრავლესობის პასუხი იმარჯვებს!",
    "de": "Stimme für den Spieler, der am besten passt — die meistgewählte Antwort gewinnt!",
    "es": "Vota por el jugador que mejor encaje: ¡gana la respuesta más votada!",
    "fr": "Vote pour le joueur qui correspond le mieux — la réponse la plus votée gagne !",
    "it": "Vota il giocatore più adatto: vince la risposta più votata!",
    "pt": "Vote no jogador que mais combina — a resposta mais votada vence!",
}

# slug, then one text per language. en first (the translation root).
PROMPTS = [
    ("wakes-earliest", {
        "en": "Who wakes up the earliest?",
        "ka": "ვინ იღვიძებს ყველაზე ადრე?",
        "de": "Wer wacht am frühesten auf?",
        "es": "¿Quién se despierta más temprano?",
        "fr": "Qui se réveille le plus tôt ?",
        "it": "Chi si sveglia più presto?",
        "pt": "Quem acorda mais cedo?",
    }),
    ("sleeps-latest", {
        "en": "Who goes to bed the latest?",
        "ka": "ვინ იძინებს ყველაზე გვიან?",
        "de": "Wer geht am spätesten ins Bett?",
        "es": "¿Quién se acuesta más tarde?",
        "fr": "Qui se couche le plus tard ?",
        "it": "Chi va a letto più tardi?",
        "pt": "Quem vai dormir mais tarde?",
    }),
    ("always-late", {
        "en": "Who is late most often?",
        "ka": "ვინ აგვიანებს ყველაზე ხშირად?",
        "de": "Wer kommt am häufigsten zu spät?",
        "es": "¿Quién llega tarde más a menudo?",
        "fr": "Qui est le plus souvent en retard ?",
        "it": "Chi è in ritardo più spesso?",
        "pt": "Quem se atrasa com mais frequência?",
    }),
    ("most-coffee", {
        "en": "Who drinks the most coffee?",
        "ka": "ვინ სვამს ყველაზე მეტ ყავას?",
        "de": "Wer trinkt den meisten Kaffee?",
        "es": "¿Quién toma más café?",
        "fr": "Qui boit le plus de café ?",
        "it": "Chi beve più caffè?",
        "pt": "Quem bebe mais café?",
    }),
    ("most-phone-time", {
        "en": "Who spends the most time on their phone?",
        "ka": "ვინ ატარებს ყველაზე მეტ დროს ტელეფონზე?",
        "de": "Wer verbringt die meiste Zeit am Handy?",
        "es": "¿Quién pasa más tiempo con el móvil?",
        "fr": "Qui passe le plus de temps sur son téléphone ?",
        "it": "Chi passa più tempo al telefono?",
        "pt": "Quem passa mais tempo no telefone?",
    }),
    ("forgets-keys", {
        "en": "Who always forgets their keys?",
        "ka": "ვინ ივიწყებს ხოლმე გასაღებებს?",
        "de": "Wer vergisst ständig seine Schlüssel?",
        "es": "¿Quién olvida siempre las llaves?",
        "fr": "Qui oublie toujours ses clés ?",
        "it": "Chi dimentica sempre le chiavi?",
        "pt": "Quem sempre esquece as chaves?",
    }),
    ("tidies-most", {
        "en": "Who tidies up most often?",
        "ka": "ვინ ალაგებს სახლში ყველაზე ხშირად?",
        "de": "Wer räumt am häufigsten auf?",
        "es": "¿Quién ordena la casa más a menudo?",
        "fr": "Qui range le plus souvent ?",
        "it": "Chi mette in ordine più spesso?",
        "pt": "Quem arruma a casa com mais frequência?",
    }),
    ("washes-dishes", {
        "en": "Who does the washing-up most often?",
        "ka": "ვინ რეცხავს ჭურჭელს ყველაზე ხშირად?",
        "de": "Wer spült am häufigsten das Geschirr?",
        "es": "¿Quién friega los platos más a menudo?",
        "fr": "Qui fait le plus souvent la vaisselle ?",
        "it": "Chi lava i piatti più spesso?",
        "pt": "Quem lava a louça com mais frequência?",
    }),
    ("tidiest-person", {
        "en": "Who is the tidiest?",
        "ka": "ვინ არის ყველაზე მოწესრიგებული?",
        "de": "Wer ist am ordentlichsten?",
        "es": "¿Quién es el más ordenado?",
        "fr": "Qui est le plus ordonné ?",
        "it": "Chi è il più ordinato?",
        "pt": "Quem é o mais organizado?",
    }),
    ("best-cook", {
        "en": "Who cooks the best food?",
        "ka": "ვინ ამზადებს ყველაზე გემრიელ საჭმელს?",
        "de": "Wer kocht das leckerste Essen?",
        "es": "¿Quién cocina la comida más rica?",
        "fr": "Qui cuisine les meilleurs plats ?",
        "it": "Chi cucina i piatti più buoni?",
        "pt": "Quem cozinha a comida mais gostosa?",
    }),
    ("loves-sweets", {
        "en": "Who loves sweets the most?",
        "ka": "ვის უყვარს ყველაზე მეტად ტკბილეული?",
        "de": "Wer liebt Süßigkeiten am meisten?",
        "es": "¿Quién ama más los dulces?",
        "fr": "Qui aime le plus les sucreries ?",
        "it": "Chi ama di più i dolci?",
        "pt": "Quem ama mais os doces?",
    }),
    ("eats-slowest", {
        "en": "Who eats the slowest?",
        "ka": "ვინ ჭამს ყველაზე ნელა?",
        "de": "Wer isst am langsamsten?",
        "es": "¿Quién come más despacio?",
        "fr": "Qui mange le plus lentement ?",
        "it": "Chi mangia più lentamente?",
        "pt": "Quem come mais devagar?",
    }),
    ("picks-restaurant", {
        "en": "Who always picks the restaurant?",
        "ka": "ვინ ირჩევს ხოლმე რესტორანს?",
        "de": "Wer sucht immer das Restaurant aus?",
        "es": "¿Quién elige siempre el restaurante?",
        "fr": "Qui choisit toujours le restaurant ?",
        "it": "Chi sceglie sempre il ristorante?",
        "pt": "Quem sempre escolhe o restaurante?",
    }),
    ("best-cake", {
        "en": "Who bakes the best cake?",
        "ka": "ვინ აცხობს ყველაზე გემრიელ ტორტს?",
        "de": "Wer backt den leckersten Kuchen?",
        "es": "¿Quién hornea el mejor pastel?",
        "fr": "Qui fait le meilleur gâteau ?",
        "it": "Chi prepara la torta più buona?",
        "pt": "Quem faz o melhor bolo?",
    }),
    ("feeds-pet", {
        "en": "Who feeds the pet?",
        "ka": "ვინ აჭმევს შინაურ ცხოველს?",
        "de": "Wer füttert das Haustier?",
        "es": "¿Quién da de comer a la mascota?",
        "fr": "Qui nourrit l'animal de compagnie ?",
        "it": "Chi dà da mangiare all'animale domestico?",
        "pt": "Quem alimenta o animal de estimação?",
    }),
    ("makes-laugh", {
        "en": "Who can make everyone laugh?",
        "ka": "ვის შეუძლია ყველას გაცინება?",
        "de": "Wer kann alle zum Lachen bringen?",
        "es": "¿Quién puede hacer reír a todos?",
        "fr": "Qui peut faire rire tout le monde ?",
        "it": "Chi riesce a far ridere tutti?",
        "pt": "Quem consegue fazer todos rirem?",
    }),
    ("sings-loudest", {
        "en": "Who sings loudest in the car?",
        "ka": "ვინ მღერის მანქანაში ყველაზე ხმამაღლა?",
        "de": "Wer singt im Auto am lautesten?",
        "es": "¿Quién canta más fuerte en el coche?",
        "fr": "Qui chante le plus fort en voiture ?",
        "it": "Chi canta più forte in macchina?",
        "pt": "Quem canta mais alto no carro?",
    }),
    ("talks-most", {
        "en": "Who talks the most?",
        "ka": "ვინ ლაპარაკობს ყველაზე მეტს?",
        "de": "Wer redet am meisten?",
        "es": "¿Quién habla más?",
        "fr": "Qui parle le plus ?",
        "it": "Chi parla di più?",
        "pt": "Quem fala mais?",
    }),
    ("most-selfies", {
        "en": "Who takes the most selfies?",
        "ka": "ვინ იღებს ყველაზე მეტ სელფის?",
        "de": "Wer macht die meisten Selfies?",
        "es": "¿Quién se hace más selfis?",
        "fr": "Qui prend le plus de selfies ?",
        "it": "Chi si fa più selfie?",
        "pt": "Quem tira mais selfies?",
    }),
    ("fears-spiders", {
        "en": "Who is most afraid of spiders?",
        "ka": "ვის ეშინია ყველაზე მეტად ობობების?",
        "de": "Wer hat am meisten Angst vor Spinnen?",
        "es": "¿Quién tiene más miedo a las arañas?",
        "fr": "Qui a le plus peur des araignées ?",
        "it": "Chi ha più paura dei ragni?",
        "pt": "Quem tem mais medo de aranhas?",
    }),
    ("most-tv", {
        "en": "Who watches the most television?",
        "ka": "ვინ უყურებს ტელევიზორს ყველაზე ხშირად?",
        "de": "Wer schaut am meisten fern?",
        "es": "¿Quién ve más la televisión?",
        "fr": "Qui regarde le plus la télévision ?",
        "it": "Chi guarda più la televisione?",
        "pt": "Quem vê mais televisão?",
    }),
    ("remembers-birthdays", {
        "en": "Who remembers everyone's birthday?",
        "ka": "ვის ახსოვს ყველას დაბადების დღე?",
        "de": "Wer merkt sich die Geburtstage von allen?",
        "es": "¿Quién recuerda el cumpleaños de todos?",
        "fr": "Qui se souvient de l'anniversaire de tout le monde ?",
        "it": "Chi ricorda il compleanno di tutti?",
        "pt": "Quem lembra o aniversário de todos?",
    }),
    ("most-jokes", {
        "en": "Who knows the most jokes?",
        "ka": "ვინ იცის ყველაზე მეტი ანეკდოტი?",
        "de": "Wer kennt die meisten Witze?",
        "es": "¿Quién sabe más chistes?",
        "fr": "Qui connaît le plus de blagues ?",
        "it": "Chi conosce più barzellette?",
        "pt": "Quem sabe mais piadas?",
    }),
    ("finds-lost-things", {
        "en": "Who finds the things everyone loses?",
        "ka": "ვინ პოულობს დაკარგულ ნივთებს?",
        "de": "Wer findet die Sachen, die alle verlieren?",
        "es": "¿Quién encuentra las cosas que todos pierden?",
        "fr": "Qui retrouve les objets que tout le monde perd ?",
        "it": "Chi trova le cose che tutti perdono?",
        "pt": "Quem encontra as coisas que todos perdem?",
    }),
    ("childhood-stories", {
        "en": "Who remembers childhood stories best?",
        "ka": "ვის ახსოვს ბავშვობის ამბები ყველაზე კარგად?",
        "de": "Wer erinnert sich am besten an Kindheitsgeschichten?",
        "es": "¿Quién recuerda mejor las historias de la infancia?",
        "fr": "Qui se souvient le mieux des histoires d'enfance ?",
        "it": "Chi ricorda meglio le storie d'infanzia?",
        "pt": "Quem lembra melhor as histórias de infância?",
    }),
    ("travels-soon", {
        "en": "Who will travel somewhere soon?",
        "ka": "ვინ აპირებს უახლოეს მომავალში მოგზაურობას?",
        "de": "Wer wird bald verreisen?",
        "es": "¿Quién viajará pronto?",
        "fr": "Qui va bientôt partir en voyage ?",
        "it": "Chi partirà presto per un viaggio?",
        "pt": "Quem vai viajar em breve?",
    }),
    ("loves-flying", {
        "en": "Who loves flying the most?",
        "ka": "ვის უყვარს თვითმფრინავით ფრენა ყველაზე მეტად?",
        "de": "Wer liebt das Fliegen am meisten?",
        "es": "¿Quién ama más volar?",
        "fr": "Qui aime le plus prendre l'avion ?",
        "it": "Chi ama di più volare?",
        "pt": "Quem ama mais voar?",
    }),
    ("wants-seaside", {
        "en": "Who most wants to go to the seaside?",
        "ka": "ვის უნდა ყველაზე მეტად ზღვაზე წასვლა?",
        "de": "Wer will am liebsten ans Meer?",
        "es": "¿Quién quiere más ir a la playa?",
        "fr": "Qui a le plus envie d'aller à la mer ?",
        "it": "Chi vuole di più andare al mare?",
        "pt": "Quem mais quer ir à praia?",
    }),
    ("picks-car-music", {
        "en": "Who picks the music in the car?",
        "ka": "ვინ ირჩევს მუსიკას მანქანაში?",
        "de": "Wer sucht im Auto die Musik aus?",
        "es": "¿Quién elige la música en el coche?",
        "fr": "Qui choisit la musique en voiture ?",
        "it": "Chi sceglie la musica in macchina?",
        "pt": "Quem escolhe a música no carro?",
    }),
    # Adapted from "Which colour does Mum love most?" — non-person options in
    # the original don't fit a player vote.
    ("loves-bright-colours", {
        "en": "Who loves bright colours the most?",
        "ka": "ვის უყვარს კაშკაშა ფერები ყველაზე მეტად?",
        "de": "Wer liebt bunte Farben am meisten?",
        "es": "¿Quién ama más los colores vivos?",
        "fr": "Qui aime le plus les couleurs vives ?",
        "it": "Chi ama di più i colori vivaci?",
        "pt": "Quem ama mais as cores vivas?",
    }),
    # Adapted from "Which film does the family love most?" — same reason.
    ("most-films", {
        "en": "Who watches the most films?",
        "ka": "ვინ უყურებს ყველაზე მეტ ფილმს?",
        "de": "Wer schaut die meisten Filme?",
        "es": "¿Quién ve más películas?",
        "fr": "Qui regarde le plus de films ?",
        "it": "Chi guarda più film?",
        "pt": "Quem vê mais filmes?",
    }),
    ("loves-winter", {
        "en": "Who loves winter the most?",
        "ka": "ვის უყვარს ზამთარი ყველაზე მეტად?",
        "de": "Wer liebt den Winter am meisten?",
        "es": "¿Quién ama más el invierno?",
        "fr": "Qui aime le plus l'hiver ?",
        "it": "Chi ama di più l'inverno?",
        "pt": "Quem ama mais o inverno?",
    }),
    ("loves-football", {
        "en": "Who loves football the most?",
        "ka": "ვის უყვარს ფეხბურთი ყველაზე მეტად?",
        "de": "Wer liebt Fußball am meisten?",
        "es": "¿Quién ama más el fútbol?",
        "fr": "Qui aime le plus le football ?",
        "it": "Chi ama di più il calcio?",
        "pt": "Quem ama mais o futebol?",
    }),
    ("best-presents", {
        "en": "Who chooses the best presents?",
        "ka": "ვინ ირჩევს საჩუქრებს ყველაზე კარგად?",
        "de": "Wer sucht die besten Geschenke aus?",
        "es": "¿Quién elige los mejores regalos?",
        "fr": "Qui choisit les meilleurs cadeaux ?",
        "it": "Chi sceglie i regali migliori?",
        "pt": "Quem escolhe os melhores presentes?",
    }),
    ("dinner-photos", {
        "en": "Who takes the most photos at dinner?",
        "ka": "ვინ იღებს ყველაზე მეტ ფოტოს სადილზე?",
        "de": "Wer macht beim Essen die meisten Fotos?",
        "es": "¿Quién hace más fotos en la cena?",
        "fr": "Qui prend le plus de photos au dîner ?",
        "it": "Chi fa più foto a cena?",
        "pt": "Quem tira mais fotos no jantar?",
    }),
    ("forgets-umbrella", {
        "en": "Who always forgets their umbrella?",
        "ka": "ვინ ივიწყებს ხოლმე ქოლგას?",
        "de": "Wer vergisst ständig seinen Regenschirm?",
        "es": "¿Quién olvida siempre el paraguas?",
        "fr": "Qui oublie toujours son parapluie ?",
        "it": "Chi dimentica sempre l'ombrello?",
        "pt": "Quem sempre esquece o guarda-chuva?",
    }),
]


def q(text: str) -> str:
    """SQL-quote a literal."""
    return "'" + text.replace("'", "''") + "'"


def build() -> str:
    out = []
    w = out.append

    w("-- \"Most Likely To\" — a party category where players vote for a player and")
    w("-- the most-voted player is the correct answer (majority scoring).")
    w("--")
    w("-- Generated by scripts/most-likely-to/build-migration.py.")
    w("-- Regenerate rather than editing by hand. Idempotent: uuid5 ids and")
    w("-- ON CONFLICT DO NOTHING throughout.")
    w("--")
    w("-- The prompt rows carry correct_answer '__vote__' and NO incorrect answers,")
    w("-- which every generic selection pipeline rejects (fewer than 3 incorrect")
    w("-- answers) — so they cannot leak into solo levels, TV rounds or mixed")
    w("-- pools. Only the dedicated multiplayer vote path serves them, with the")
    w("-- room's player names as the answers.")
    w("")
    w("BEGIN;")
    w("")
    w(f"-- ══ {CATEGORY_SLUG} ══")
    w("INSERT INTO public.categories (id, category_id, name, description, icon, icon_slug, color, type, is_active, total_levels, sort_order, language, is_language_specific)")
    w(f"VALUES ({q(CATEGORY_UUID)}, {q(CATEGORY_SLUG)}, {q(CATEGORY_NAMES['ka'])}, {q(CATEGORY_DESCRIPTIONS['ka'])}, '🗳️', 'group-of-people', 'from-fuchsia-400 to-pink-500', 'fun', true, 1, 8, 'ka', false)")
    w("ON CONFLICT (category_id) DO NOTHING;")
    w("INSERT INTO public.category_translations (category_id, language, name, description) VALUES")
    rows = []
    for lang in LANGS:
        rows.append(f"  ({q(CATEGORY_UUID)}, {q(lang)}, {q(CATEGORY_NAMES[lang])}, {q(CATEGORY_DESCRIPTIONS[lang])})")
    w(",\n".join(rows))
    w("ON CONFLICT (category_id, language) DO NOTHING;")
    w("")
    w("-- ── the prompt bank: 36 prompts x 7 languages ─────────────────────────────")
    w("INSERT INTO public.questions (")
    w("  id, category_id, language, question_text, correct_answer, incorrect_answers,")
    w("  difficulty, level_number, is_active, in_production, translated_from")
    w(") VALUES")
    rows = []
    for slug, texts in PROMPTS:
        en_id = str(uuid.uuid5(NS, f"question/{slug}/en"))
        for lang in LANGS:
            qid = en_id if lang == "en" else str(uuid.uuid5(NS, f"question/{slug}/{lang}"))
            translated_from = "NULL" if lang == "en" else q(en_id)
            rows.append(
                f"  ({q(qid)}, {q(CATEGORY_UUID)}, {q(lang)}, {q(texts[lang])}, "
                f"{q(VOTE_SENTINEL)}, '[]'::jsonb, 'easy', 1, true, true, {translated_from})"
            )
    w(",\n".join(rows))
    w("ON CONFLICT (id) DO NOTHING;")
    w("")
    w("""-- ── vote settlement ────────────────────────────────────────────────────────
--
-- One row per settled question. The primary key is the idempotency claim
-- (same pattern as room_first_correct / tv_observer_awards): the first
-- settle_most_likely_votes call for a (game, question) inserts the row and
-- pays out; every later call is a no-op. The table is in the realtime
-- publication so every device learns the winners the moment they exist.

CREATE TABLE IF NOT EXISTS public.room_vote_results (
  game_id        uuid        NOT NULL,
  question_index integer     NOT NULL,
  room_id        uuid        NOT NULL,
  winners        text[]      NOT NULL DEFAULT '{}',
  vote_counts    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  settled_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, question_index)
);

ALTER TABLE public.room_vote_results ENABLE ROW LEVEL SECURITY;

-- Readable by players; written ONLY by the SECURITY DEFINER settlement
-- function (no INSERT/UPDATE/DELETE policy on purpose). Guarded so a
-- re-apply stays a no-op.
DO $$ BEGIN
  CREATE POLICY "vote results readable"
    ON public.room_vote_results
    FOR SELECT TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Realtime delivery of settlements. Guarded: the CI harness has no
-- supabase_realtime publication, and a bare ALTER would abort this whole
-- transaction there.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.room_vote_results;
EXCEPTION
  WHEN undefined_object THEN NULL;  -- no publication (CI harness)
  WHEN duplicate_object THEN NULL;  -- already added (re-apply)
END $$;

-- Settle the vote for one question (p_question_index set) or for every
-- still-unsettled question of the game (p_question_index NULL — the results
-- screen's catch-all sweep).
--
-- For each question: tally player_answers (empty answers are timeouts and
-- don't count), take the most-voted answer(s) — ties all win — and pay every
-- player who voted for a winner a flat 100 points, marking their answer row
-- correct. Scores land in room_participants.score exactly like live play, so
-- complete_room_round's totals pick them up unchanged.
--
-- Only questions whose room_questions row carries the '__vote__' sentinel are
-- ever settled, so this function cannot mint points on a normal trivia round.
CREATE OR REPLACE FUNCTION public.settle_most_likely_votes(
  p_room_id uuid,
  p_game_id uuid,
  p_question_index integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idx integer;
  v_winners text[];
  v_counts jsonb;
  v_claimed integer;
  v_settled integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = p_room_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not a participant of this room';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.room_games
    WHERE id = p_game_id AND room_id = p_room_id
  ) THEN
    RAISE EXCEPTION 'game does not belong to this room';
  END IF;

  FOR v_idx IN
    SELECT rq.question_index
    FROM public.room_questions rq
    WHERE rq.game_id = p_game_id
      AND rq.room_id = p_room_id
      AND rq.correct_answer = '__vote__'
      AND (p_question_index IS NULL OR rq.question_index = p_question_index)
    ORDER BY rq.question_index
  LOOP
    -- The tally. player_answers rows are wiped at every round start, so
    -- (room_id, question_index) only ever holds the current round's votes.
    SELECT COALESCE(array_agg(answer ORDER BY answer), '{}')
    INTO v_winners
    FROM (
      SELECT answer, count(*) AS votes
      FROM public.player_answers
      WHERE room_id = p_room_id
        AND question_index = v_idx
        AND answer <> ''
      GROUP BY answer
    ) tallied
    WHERE votes = (
      SELECT max(votes) FROM (
        SELECT count(*) AS votes
        FROM public.player_answers
        WHERE room_id = p_room_id
          AND question_index = v_idx
          AND answer <> ''
        GROUP BY answer
      ) m
    );

    SELECT COALESCE(jsonb_object_agg(answer, votes), '{}'::jsonb)
    INTO v_counts
    FROM (
      SELECT answer, count(*) AS votes
      FROM public.player_answers
      WHERE room_id = p_room_id
        AND question_index = v_idx
        AND answer <> ''
      GROUP BY answer
    ) c;

    -- The claim. Exactly one caller inserts the row; the payout below rides
    -- in the same transaction, so a question settles exactly once or not at
    -- all.
    INSERT INTO public.room_vote_results (game_id, question_index, room_id, winners, vote_counts)
    VALUES (p_game_id, v_idx, p_room_id, v_winners, v_counts)
    ON CONFLICT (game_id, question_index) DO NOTHING
    RETURNING 1 INTO v_claimed;

    IF v_claimed IS NULL THEN
      CONTINUE;
    END IF;

    v_settled := v_settled + 1;

    IF array_length(v_winners, 1) IS NULL THEN
      CONTINUE; -- nobody voted; nothing to pay
    END IF;

    UPDATE public.player_answers
    SET is_correct = true,
        points_earned = 100
    WHERE room_id = p_room_id
      AND question_index = v_idx
      AND answer = ANY(v_winners);

    UPDATE public.room_participants rp
    SET score = COALESCE(rp.score, 0) + 100
    FROM public.player_answers pa
    WHERE pa.room_id = p_room_id
      AND pa.question_index = v_idx
      AND pa.answer = ANY(v_winners)
      AND rp.room_id = p_room_id
      AND rp.user_id = pa.user_id;
  END LOOP;

  RETURN v_settled;
END;
$$;

-- SECURITY DEFINER functions are granted to PUBLIC *and* anon by Supabase's
-- bootstrap — close both, then grant exactly who may call it (AGENTS.md
-- rule 3).
REVOKE ALL ON FUNCTION public.settle_most_likely_votes(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_most_likely_votes(uuid, uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.settle_most_likely_votes(uuid, uuid, integer) TO authenticated;

COMMIT;""")
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    OUT.write_text(build(), encoding="utf-8")
    n_questions = len(PROMPTS) * len(LANGS)
    print(f"wrote {OUT} ({len(PROMPTS)} prompts x {len(LANGS)} languages = {n_questions} question rows)")
