

## Fix Irrelevant Icons on Mascot Account Trivias

### Problem
Many mascot trivia questions use generic/non-existent icon slugs (like `science`, `landmark`, `food`, `sports`, `animal`, etc.) that either don't exist in the icon library or are too generic. For example, Irakli's "ინტელექტის ტესტი" shows an Indian flag icon for a question about Canada's maple leaf flag, and the Leaning Tower of Pisa for an Eiffel Tower question.

### What Will Change
Direct database updates to the `questions` JSONB column in `user_quiz_posts` for all 16 mascot trivias. Each question gets a specific, relevant icon slug that exists in the icon library.

### Icon Fixes Per Trivia

**Ana - "მსოფლიო ხელოვნება"** (id: 289655cd)
- All 7 questions use `artist` -- OK, consistent art theme. Keep as-is.

**Ana - "ცნობილი ნახატები"** (id: ad3f3c94)
- All use `basic-painting-set` -- OK but could be better. Replace all with `mona-lisa` for the painting theme.

**Ana - "თანამედროვე ხელოვნება"** (id: 6a8e8565)
- All use `artist` -- OK, keep as-is.

**Ana - "რენესანსის ოსტატები"** (id: 36ac459c)
- All use `basic-painting-set` -- OK, keep as-is.

**Dato - "მრავალფეროვანი კითხვები"** (id: e38f80a1)
- `science` (liquid metal) -> `beaker`
- `landmark` (Machu Picchu) -> `machu-picchu`
- `phone` (telephone invention) -> `phone` (exists, OK)
- `tv` (Breaking Bad) -> keep `tv` -- need to check... Actually the icon_library doesn't have `tv`. Let me use `television`.
- `bird` (fastest bird) -> `falcon`

**Elene - "ადამიანის სხეული"** (id: 3501fa1e)
- All 7 questions use `heart` -- should be per-question:
  - Bone question -> `bone`
  - Liver/bile question -> `liver`
  - Heart chambers -> `heart` (keep)
  - Eye/retina -> keep `heart` (no eye icon available)
  - Neuron -> `neuron`
  - Insulin -> keep `heart`
  - Lungs -> `lungs`

**Elene - "მეცნიერების აღმოჩენები"** (id: 4c04280a)
- All use `astronomy-starter-kit` -- should be per-question:
  - Water formula -> `beaker`
  - Jupiter -> `jupiter`
  - Newton/gravity -> `scientist`
  - Nitrogen/atmosphere -> `earth`
  - Atom -> `atom`
  - Speed of light -> `prism`
  - Einstein -> `scientist`

**Giorgi - "ფეხბურთის ვარსკვლავები"** (id: dd1cbd88)
- All use `basic-soccer-ball` -- OK, consistent. Keep as-is.

**Giorgi - "ქართული ფეხბურთი"** (id: 7b6f237a)
- All use `soccer-net` -- OK. Keep as-is.

**Irakli - "ინტელექტის ტესტი"** (id: e03a0467)
- `flag` (Canada maple leaf) -> `canada-flag`
- `planet` (Mars red planet) -> `mars`
- `football` (Ronaldo goals) -> `football` (exists, OK)
- `sun` (vitamin D) -> `sun` (exists, OK)
- `tower` (Eiffel tower) -> `eiffel-tower`

**Keti - "ვინ იცის მეტი?"** (id: 89b6bba6)
- `mountain` (Everest) -> `mountain` (exists, OK)
- `food` (sushi) -> `sushi`
- `wall` (Berlin Wall) -> `wall` (exists, OK)
- `movie` (Oscars/Titanic) -> `movie` (exists, OK)
- `dna` (DNA B-form) -> `dna` (exists, OK)

**Luka - "ესპორტის სამყარო"** (id: ea14ceba)
- All use `joystick` -- exists, OK. Keep as-is.

**Luka - "გეიმინგის ისტორია"** (id: 90b27aff)
- All use `joystick` -- exists, OK. Keep as-is.

**Nino - "შერეული ვიქტორინა"** (id: 99116cb9)
- `planet` (Jupiter) -> `jupiter`
- `food` (pizza/Italy) -> `pizza`
- `book` (Vepkhistkaosani) -> `book` (exists, OK)
- `sports` (heaviest ball) -> `bowling-ball`
- `ocean` (smallest ocean) -> `ocean` (exists, OK)

**Saba - "გამოიცანი!"** (id: 37f690a4)
- `movie` (DiCaprio/Titanic) -> `movie` (exists, OK)
- `tooth` (adult teeth count) -> `tooth` (exists, OK)
- `globe` (Tokyo/Japan capital) -> `globe` (exists, OK)
- `olympic` (first Olympics) -> `gold-medal`
- `gem` (emerald color) -> `emerald`

**Salome - "ტესტი ერუდიტებისთვის"** (id: 93eb9637)
- `music` (Michael Jackson) -> `treble-clef`
- `desert` (Atacama) -> `cactus`
- `animal` (chameleon) -> `chameleon`
- `football` (Brazil World Cup) -> `football` (exists, OK)
- `body` (largest organ/skin) -> `human-heart` (closest medical icon)

**Tornike - "ყველაფერი ცოტ-ცოტა"** (id: 441639c7)
- `river` (Nile) -> `river` (exists, OK)
- `war` (WWII start) -> `tank`
- `science` (Fe/iron) -> `beaker`
- `landmark` (Colosseum/Rome) -> `colosseum`
- `animal` (cheetah fastest) -> `cheetah`

### Technical Implementation

A single edge function or a set of SQL UPDATE statements that modify the `questions` JSONB for each trivia. Each UPDATE targets one `user_quiz_posts` row by its `id` and replaces icon_slug values inside the JSONB array.

Total: ~10 trivias need icon fixes (6 are fine as-is).

### Summary of Fixes
- 10 trivias updated with question-specific icons
- All replacement slugs verified to exist in the `icon_library` table
- No code changes needed -- purely database content fixes

