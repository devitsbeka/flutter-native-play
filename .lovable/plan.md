

## Fix Answer-Revealing Icons on Mascot Trivias

### Problem
Several trivia icons reveal the correct answer instead of representing the question's context/clue. For example, showing a `canada-flag` icon for the question "Which country's flag has a maple leaf?" gives away the answer (Canada). The icon should be `maple-leaf` -- the clue mentioned in the question, not the answer itself.

### Principle
**Icons must represent the question context (what the question talks about), never the correct answer.**

### Fixes Needed (Answer-Revealing Icons Only)

**Irakli - "ინტელექტის ტესტი"** (id: e03a0467)
| Question | Current Icon | Reveals | Fix | Reason |
|----------|-------------|---------|-----|--------|
| Which country's flag has maple leaf? | `canada-flag` | Answer (Canada) | `maple-leaf` | The clue IS the maple leaf |
| Which planet is called the red planet? | `mars` | Answer (Mars) | `star` | Generic space/planet context |

**Elene - "ადამიანის სხეული"** (id: 3501fa1e)
| Question | Current Icon | Reveals | Fix | Reason |
|----------|-------------|---------|-----|--------|
| What is the nerve cell called? | `neuron` | Answer (neuron) | `brain` | Brain/nervous system context |
| Which organ produces bile? | `liver` | Answer (liver) | `stethoscope` | Generic medical context |
| Where does oxygen exchange happen? | `lungs` | Answer (lungs) | `wind` | Oxygen/air context |

**Elene - "მეცნიერების აღმოჩენები"** (id: 4c04280a)
| Question | Current Icon | Reveals | Fix | Reason |
|----------|-------------|---------|-----|--------|
| Which is the largest planet? | `jupiter` | Answer (Jupiter) | `star` | Generic space context |
| Smallest particle keeping element properties? | `atom` | Answer (atom) | `microscope` | Examining tiny things |

**Dato - "მრავალფეროვანი კითხვები"** (id: e38f80a1)
| Question | Current Icon | Reveals | Fix | Reason |
|----------|-------------|---------|-----|--------|
| Which bird is the fastest? | `falcon` | Answer (peregrine falcon) | `feather` | Bird/flight context |

**Keti - "ვინ იცის მეტი?"** (id: 89b6bba6)
| Question | Current Icon | Reveals | Fix | Reason |
|----------|-------------|---------|-----|--------|
| Most famous Japanese dish? | `sushi` | Answer (sushi) | `chopsticks` | Japanese cuisine context |

**Nino - "შერეული ვიქტორინა"** (id: 99116cb9)
| Question | Current Icon | Reveals | Fix | Reason |
|----------|-------------|---------|-----|--------|
| Which is the largest planet? | `jupiter` | Answer (Jupiter) | `star` | Generic space context |
| Which sport has the heaviest ball? | `bowling-ball` | Answer (bowling) | `weight` | Heavy/weight context |

**Salome - "ტესტი ერუდიტებისთვის"** (id: 93eb9637)
| Question | Current Icon | Reveals | Fix | Reason |
|----------|-------------|---------|-----|--------|
| Which animal can change color? | `chameleon` | Answer (chameleon) | `rainbow` | Color-changing context |

**Tornike - "ყველაფერი ცოტ-ცოტა"** (id: 441639c7)
| Question | Current Icon | Reveals | Fix | Reason |
|----------|-------------|---------|-----|--------|
| Which is the fastest animal? | `cheetah` | Answer (cheetah) | `lightning` | Speed context |

### Icons That Are Fine (Context-Based, Not Answer-Revealing)
These were set correctly and stay as-is:
- `eiffel-tower` -- question mentions Eiffel Tower, answer is Paris
- `sun` -- question mentions sun rays, answer is vitamin D
- `football` -- question about football, answer is a player/country
- `maple-leaf` (new) -- question clue, answer is Canada
- `machu-picchu` -- question mentions Machu Picchu, answer is Peru
- `pizza` -- question mentions pizza, answer is Italy
- `colosseum` -- question mentions Colosseum, answer is Rome
- `emerald` -- question mentions emerald, answer is green
- `bone` -- generic (answer is specifically femur, not "bone")

### Technical Implementation
SQL UPDATE statements targeting the `questions` JSONB column. Each fix updates a specific array index's `icon_slug` field. All replacement slugs have been verified to exist in `icon_library`.

Total: 13 icon fixes across 8 trivias.

