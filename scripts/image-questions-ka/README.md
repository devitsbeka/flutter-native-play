# Georgian image questions

100 picture questions for the Georgian bank —
`supabase/migrations/20260818120000_image_questions_ka.sql`.

## The one thing that shapes all of it

An image question **hides its own text while it is being played**:

```tsx
// QuizGameScreenProd.tsx, MultiplayerGameScreenV2.tsx, CategoryQuizPage.tsx …
hideQuestionText={!!currentQuestion.imageUrl}
```

The player sees a photograph and four options, and nothing else. So every
question here is answerable from the picture alone — one animal, one flag, one
building, one dish, against three options that are not it. The stem exists for
the case where the image fails to load, which is the only time the card shows
it.

This is worth knowing before adding more: the bank already contains ~165
Georgian questions that carry a picture as decoration for a text question
("which country is the Taj Mahal in?" beside India's flag). Those are played
with the text hidden too. Some survive it by accident — the flag *is* the
answer — and some are unanswerable.

## The other constraint

`isValidQuestionLength` in `src/services/questionService.ts` drops any question
over **70 characters**, or with any option over **20**, before a game ever sees
it. Not a style rule — the row silently never appears. Both scripts here refuse
to emit anything that breaks it.

## Pipeline

```bash
python3 scripts/image-questions-ka/resolve-images.py      # spec.json  -> resolved.json + thumbs/
python3 scripts/image-questions-ka/build-contact-sheet.py # thumbs/    -> sheets/  (then look at them)
set -a && . ./.env && set +a
python3 scripts/image-questions-ka/build-migration.py     # resolved.json -> the migration
```

`spec.json` is the hand-written part: category, stem, answer, three
distractors, and the **name of a Wikipedia article** — not a URL.

Images are not chosen by URL on purpose. A hand-built `upload.wikimedia.org`
path fails silently in the two ways that matter: a 404 renders an empty card,
and a file that has been renamed renders somebody else's photograph. Asking the
API for an article's lead image cannot do either — the lead image of *Giraffe*
is a giraffe. The URL it returns is the same form as the 435 image questions
already in the bank.

`build-contact-sheet.py` lays the thumbnails out **in the card's own image box**
— `w-full h-36 object-contain object-top`, 144px tall — because that is where
the picture has to work. Pass indices to sheet only some of them:
`build-contact-sheet.py 30 31 39`.

Looking at all hundred is not optional, and it caught nine that every automated
check passed:

| what the article's lead image actually was | subject |
|---|---|
| a taxobox collage of four different birds | Toucan |
| a collage of nine lemur species | Lemur |
| a satellite photo of dunes from orbit | Erg |
| a Victorian botanical plate | Fern (twice, two different articles) |
| a dusk skyline silhouette | Burj Khalifa |
| a two-panel composite | White House |
| an animated GIF | Ten-pin bowling |
| two instruments behind shop glass, one of them the distractor | Panduri |
| a featureless white disc | Venus |

## What the generators check

`resolve-images.py` — the article exists and has a lead image · the URL answers
200 · 70/20 · four distinct options, all Georgian script (this caught an
Armenian `բ` inside a Georgian word) · no answer used twice in one category.
Anything over 1MB is re-requested narrower; a 144px-tall box does not need a
4.7MB PNG.

`build-migration.py` — the category exists and is the Georgian one · **no live
question already uses the image** · no live question already asks this stem with
this answer · 70/20 again on the final text.

The image check is the one that earns its keep: it rejected twelve questions
whose picture is already on a live question, including six flags. Since image
questions hide their text, "which country is the Taj Mahal in?" beside India's
flag already *is* a flag question — a second one would show the player the same
picture twice.

## Applying it

Ids are `uuid5` of each question's own key, and the INSERT carries
`ON CONFLICT (id) DO NOTHING`, so the file can be applied twice without
inserting the bank twice. Regenerating produces the same ids.

Undo:

```sql
DELETE FROM public.questions
 WHERE language = 'ka'
   AND created_at >= '2026-08-18'
   AND image_url LIKE 'https://upload.wikimedia.org/%';
```

`thumbs/` and `sheets/` are gitignored — they are ~45MB and rebuild from
`spec.json` in a few minutes.
