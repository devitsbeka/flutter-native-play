

## Add Icon Slugs to All Seeded Mascot Content

### Problem

The seed function generated questions without `icon_slug` values. Both the post-level `icon_slug` column and individual question `icon_slug` fields are NULL for all mascot content, so no icons appear during gameplay.

### Solution

Write a SQL migration that updates all mascot quiz posts to have:
1. **Post-level `icon_slug`** -- a relevant icon for the trivia cover
2. **Per-question `icon_slug`** inside each question's JSONB object -- so icons show during gameplay

We'll use actual slugs from the icon library (verified from the database) to ensure they resolve to real icons.

### Icon Slug Assignments

Based on available slugs in the icon library:

| Account | Post Title | Post `icon_slug` | Per-Question `icon_slug` |
|---------|-----------|------------------|--------------------------|
| Giorgi | ფეხბურთის ვარსკვლავები | `basic-soccer-ball` | `basic-soccer-ball` |
| Giorgi | ქართული ფეხბურთი | `soccer-net` | `soccer-net` |
| Giorgi | ლიონელ მესი (round) | `basic-soccer-ball` | `basic-soccer-ball` |
| Giorgi | კრისტიანო რონალდუ (round) | `basic-soccer-ball` | `basic-soccer-ball` |
| Giorgi | NBA ლეგენდები (round) | `champions-league-trophy` | `champions-league-trophy` |
| Mariami | სამზარეულოს საიდუმლოებები | `chef` | `chef` |
| Mariami | მსოფლიო სამზარეულო | `chef` | `chef` |
| Mariami | ქართული წინწკლები (round) | `chef` | `chef` |
| Mariami | მთავარი კერძები (round) | `campfire-cooking-pot` | `campfire-cooking-pot` |
| Mariami | ქართული ტკბილეული (round) | `chef` | `chef` |
| Nika | როკ მუსიკის ისტორია | `basic-guitar-starter-kit` | `basic-guitar-starter-kit` |
| Nika | ქართული მუსიკა | `musician` | `musician` |
| Nika | 80-იანების ჰიტები (round) | `basic-guitar-starter-kit` | `basic-guitar-starter-kit` |
| Nika | 90-იანების ჰიტები (round) | `musician` | `musician` |
| Ana | მსოფლიო ხელოვნება | `artist` | `artist` |
| Ana | ცნობილი ნახატები | `basic-painting-set` | `basic-painting-set` |
| Ana | რენესანსის ოსტატები (round) | `basic-painting-set` | `basic-painting-set` |
| Ana | თანამედროვე ხელოვნება (round) | `artist` | `artist` |
| Daviti | კინოს ოსკარები | `movie-projector` | `movie-projector` |
| Daviti | ქართული კინო | `cinema-screen` | `cinema-screen` |
| Daviti | Marvel სამყარო (round) | `movie` | `movie` |
| Daviti | ჰარი პოტერი (round) | `book` | `book` |
| Daviti | ვარსკვლავური ომები (round) | `space-craft` | `space-craft` |
| Elene | მეცნიერების აღმოჩენები | `astronomy-starter-kit` | `astronomy-starter-kit` |
| Elene | ადამიანის სხეული | `heart` | `heart` |
| Elene | მზის სისტემა (round) | `earth` | `earth` |
| Elene | ვარსკვლავები და გალაქტიკები (round) | `blazing-star` | `blazing-star` |
| Luka | ესპორტის სამყარო | `joystick` | `joystick` |
| Luka | რეტრო თამაშები | `joystick` | `joystick` |
| Luka | Nintendo კლასიკა (round) | `joystick` | `joystick` |
| Luka | PlayStation ექსკლუზივები (round) | `joystick` | `joystick` |
| Luka | PC გეიმინგი (round) | `joystick` | `joystick` |

For Tamari's content (if seeded later), the same pattern applies with `book` and `bookshelf` slugs.

### Technical Details

**Database migration:**

A single SQL migration that for each of the ~30 mascot posts:
1. Sets the `icon_slug` column on `user_quiz_posts`
2. Updates each question object in the JSONB `questions` array to include `"icon_slug": "<slug>"` using `jsonb_set` or a JSONB transformation

The JSONB update will iterate over the `questions` array and inject `icon_slug` into each element. Example pattern:

```text
UPDATE user_quiz_posts 
SET 
  icon_slug = 'joystick',
  questions = (
    SELECT jsonb_agg(
      elem || jsonb_build_object('icon_slug', 'joystick')
    )
    FROM jsonb_array_elements(questions) AS elem
  )
WHERE id = '90b27aff-3721-464c-ad60-35ae935f9a16';
```

This is repeated for all mascot posts with their respective icon slugs.

**No code file changes needed** -- this is purely a database data fix.

### Files Changed
- Database migration only (update `icon_slug` on ~30 `user_quiz_posts` rows + inject per-question `icon_slug` into JSONB)
