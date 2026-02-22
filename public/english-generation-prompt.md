# English Trivia Question Generation — Master Prompt

> Copy-paste this ENTIRE prompt to an AI agent (Claude, GPT, etc.) to generate English trivia questions. No modifications needed.

---

## Your Task

Generate **200 English trivia questions** spread across ALL 41 categories listed below (~5 per category). Each question must follow the exact JSON format and strict quality rules.

Output a single valid JSON object. **Do not split into multiple messages** — return everything in one JSON block.

---

## Output Format

```json
{
  "questions": [
    {
      "category_slug": "astronomy",
      "question_text": "What is the largest planet in our solar system?",
      "correct_answer": "Jupiter",
      "incorrect_answers": ["Saturn", "Mars", "Neptune"],
      "difficulty": "easy",
      "language": "en",
      "icon_keyword": "planet"
    }
  ]
}
```

**All fields are required** except `icon_keyword` (recommended but optional).

---

## The 41 Categories (use these exact `category_slug` values)

### Science (9)
| Slug | Name | Example Topics |
|------|------|---------------|
| `astronomy` | Astronomy | Stars, planets, telescopes, constellations |
| `biology` | Biology | Cells, DNA, evolution, organisms |
| `chemistry` | Chemistry | Elements, reactions, periodic table |
| `physics` | Physics | Forces, energy, quantum, relativity |
| `math` | Mathematics | Numbers, geometry, famous theorems |
| `science` | General Science | Scientific method, discoveries, Nobel prizes |
| `geology` | Geology | Rocks, minerals, tectonic plates, volcanoes |
| `ecology` | Ecology | Ecosystems, climate, biodiversity |
| `medicine` | Medicine & Health | Diseases, anatomy, medical breakthroughs |

### History & Culture (5)
| Slug | Name | Example Topics |
|------|------|---------------|
| `world_history` | World History | Ancient civilizations, revolutions, key dates |
| `military_history` | Military History | Wars, battles, military leaders |
| `archaeology` | Archaeology | Ancient ruins, discoveries, civilizations |
| `religion_mythology` | Religion & Mythology | Gods, sacred texts, myths |
| `philosophy` | Philosophy | Philosophers, schools of thought, ethics |

### Geography & Nature (4)
| Slug | Name | Example Topics |
|------|------|---------------|
| `geography` | Geography | Countries, capitals, rivers, mountains |
| `space` | Space | Space missions, NASA, ISS, satellites |
| `nature` | Nature | Forests, oceans, weather, natural wonders |
| `languages` | Languages & Linguistics | Language families, grammar, translation |

### Technology (3)
| Slug | Name | Example Topics |
|------|------|---------------|
| `programming` | Programming | Languages, algorithms, famous programmers |
| `technology` | Technology | Inventions, gadgets, tech companies |
| `robotics_ai` | Robotics & AI | Machine learning, robots, AI history |

### Entertainment (7)
| Slug | Name | Example Topics |
|------|------|---------------|
| `movies` | Movies | Directors, actors, Oscar winners, iconic films |
| `tv_series` | TV Series | Popular shows, characters, streaming |
| `music` | Music | Artists, genres, albums, instruments |
| `video_games` | Video Games | Games, studios, characters, consoles |
| `anime_manga` | Anime & Manga | Series, creators, studios, characters |
| `pop_culture` | Pop Culture | Trends, viral moments, icons |
| `celebrities` | Celebrities | Famous people, achievements, trivia |

### Society (6)
| Slug | Name | Example Topics |
|------|------|---------------|
| `politics` | Politics | Leaders, systems, elections, organizations |
| `economics` | Economics | Markets, currencies, economic theory |
| `psychology` | Psychology | Theories, experiments, cognitive biases |
| `fashion` | Fashion & Style | Designers, brands, fashion history |
| `social_media` | Social Media | Platforms, influencers, viral trends |
| `memes_internet` | Memes & Internet | Internet culture, viral memes, online history |

### Arts & Food (3)
| Slug | Name | Example Topics |
|------|------|---------------|
| `art` | Art | Painters, movements, famous works |
| `architecture` | Architecture | Buildings, architects, styles |
| `world_cuisine` | World Cuisine | Dishes, ingredients, culinary traditions |

### Miscellaneous (4)
| Slug | Name | Example Topics |
|------|------|---------------|
| `sports` | Sports | Athletes, records, Olympics, teams |
| `animals` | Animals | Species, habitats, animal facts |
| `fun_facts` | Fun Facts | Surprising trivia, records, oddities |
| `myths_reality` | Myths vs Reality | Common misconceptions debunked |

---

## STRICT Rules (violations = REJECTED)

### 1. Character Limits
| Field | Max |
|-------|-----|
| `question_text` | **65 chars** (including the `?`) |
| `correct_answer` | **20 chars** |
| Each incorrect answer | **20 chars** |

### 2. Formatting
- Question **MUST** end with `?`
- Single clear question — no compound sentences
- Do NOT start with "Which of the following..."
- All 4 answers must be grammatically consistent

### 3. Answer-in-Question Check (CRITICAL)
The correct answer **MUST NOT** appear as a substring in the question.

- ❌ `"What is Jupiter's largest moon?"` + `"Jupiter"` → REJECTED
- ✅ `"What is the largest planet in our solar system?"` + `"Jupiter"` → OK

### 4. Answer Length Balance
Max difference between longest and shortest answer: **8 characters**

### 5. Answer Count
- Exactly **3 incorrect answers** per question (4 total options)
- No duplicate answers
- All non-empty

### 6. Difficulty Distribution
- **easy** (30%): Common knowledge
- **medium** (50%): Requires domain knowledge
- **hard** (20%): Expert-level, obscure

### 7. Icon Keyword
- Single English word for the question's **topic** (not the answer!)
- `"planet"`, `"war"`, `"dna"`, `"film"`, `"music"` etc.
- **MUST NOT** match or hint at the correct answer

### 8. No Duplicates
- Each question tests a **unique fact**
- Don't rephrase the same question ("Who painted X?" / "Which artist created X?")

### 9. Language
- Set `"language": "en"` on **every** question

---

## Example Questions

```json
{
  "questions": [
    {
      "category_slug": "astronomy",
      "question_text": "What is the closest star to Earth?",
      "correct_answer": "The Sun",
      "incorrect_answers": ["Proxima Centauri", "Sirius", "Alpha Centauri"],
      "difficulty": "easy",
      "language": "en",
      "icon_keyword": "star"
    },
    {
      "category_slug": "world_history",
      "question_text": "In what year did World War II end?",
      "correct_answer": "1945",
      "incorrect_answers": ["1944", "1946", "1943"],
      "difficulty": "easy",
      "language": "en",
      "icon_keyword": "war"
    },
    {
      "category_slug": "biology",
      "question_text": "What organelle is the powerhouse of a cell?",
      "correct_answer": "Mitochondria",
      "incorrect_answers": ["Nucleus", "Ribosome", "Chloroplast"],
      "difficulty": "easy",
      "language": "en",
      "icon_keyword": "cell"
    },
    {
      "category_slug": "movies",
      "question_text": "Who directed the 1994 film Pulp Fiction?",
      "correct_answer": "Quentin Tarantino",
      "incorrect_answers": ["Martin Scorsese", "Steven Spielberg", "David Fincher"],
      "difficulty": "medium",
      "language": "en",
      "icon_keyword": "film"
    },
    {
      "category_slug": "chemistry",
      "question_text": "What is the chemical symbol for gold?",
      "correct_answer": "Au",
      "incorrect_answers": ["Ag", "Fe", "Cu"],
      "difficulty": "easy",
      "language": "en",
      "icon_keyword": "metal"
    }
  ]
}
```

---

## Instructions for the AI Agent

1. Generate exactly **200 questions** spread across all 41 categories (~5 per category)
2. Follow the difficulty distribution: 30% easy, 50% medium, 20% hard
3. Return a single valid JSON object with a `"questions"` array
4. Self-verify every question against the rules above before outputting
5. Count characters carefully — the 65-char question limit is strict

**To generate more**: Run this prompt multiple times and combine the JSON outputs. Each run produces ~200 unique questions. Repeat ~41 times for ~8,200 total questions covering all categories deeply.

**For category-focused generation**: Add this line to the top: _"Focus all 200 questions on the `[slug]` category only."_
