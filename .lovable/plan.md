

## Switch Mascot Names from Georgian Script to Latin Transliteration

### What Changes

All 8 mascot account names and the opponent name generator will switch from Georgian script (e.g., "მარიამი გ.") to Latin transliterations (e.g., "Mariami G.").

### Changes

#### 1. Update `src/data/opponents.ts`

Replace the `georgianFirstNames` array (currently in Georgian script) with Latin transliterations:

```
Before: "გიორგი", "მარიამი", "ნიკა", "ანა", "დავითი", "ელენე", "ლუკა", "თამარი", ...
After:  "Giorgi", "Mariami", "Nika", "Ana", "Daviti", "Elene", "Luka", "Tamari", ...
```

Full replacement list for all 40 names:
- გიორგი -> Giorgi, მარიამი -> Mariami, ნიკა -> Nika, ანა -> Ana, დავითი -> Daviti, ელენე -> Elene, ლუკა -> Luka, თამარი -> Tamari
- ნინო -> Nino, ალექსანდრე -> Alexandre, სოფია -> Sofia, ილია -> Ilia, ბარბარე -> Barbare, გიო -> Gio, ნატო -> Nato, თეკო -> Teko
- ლიკა -> Lika, ზურა -> Zura, ნანა -> Nana, მაკო -> Mako, ბექა -> Beka, რატი -> Rati, კოტე -> Kote, ანი -> Ani
- სანდრო -> Sandro, თაკო -> Tako, ირაკლი -> Irakli, ეკა -> Eka, ლაშა -> Lasha, მანანა -> Manana, გვანცა -> Gvantsa, ბაჩო -> Bacho
- ტატო -> Tato, მარი -> Mari, თორნიკე -> Tornike, ქეთი -> Keti, ლევანი -> Levani, თეა -> Tea, ნიკოლოზი -> Nikolozi, მაია -> Maia

Replace the `georgianLastInitials` array with Latin initials:

```
Before: "კ.", "გ.", "ბ.", "ჩ.", "თ.", "მ.", "ლ.", "ს.", ...
After:  "K.", "G.", "B.", "Ch.", "T.", "M.", "L.", "S.", ...
```

Full list: K., G., B., Ch., T., M., L., S., Kh., J., Ts., P., D., R., A., Z., N., E., Sh.

#### 2. Update 8 Database Profiles

Run a SQL migration to update the `nickname` column for each mascot account:

| User ID | Old Nickname | New Nickname |
|---------|-------------|-------------|
| ae8c42e6... | გიორგი | Giorgi |
| 620e54af... | მარიამი | Mariami |
| d93f95e2... | ნიკა | Nika |
| a6782341... | ანა | Ana |
| 877670d3... | დავითი | Daviti |
| d7a2020e... | ელენე | Elene |
| ef667c9e... | ლუკა | Luka |
| d322f4a2... | თამარი | Tamari |

### Technical Details

**File: `src/data/opponents.ts`**
- Lines 33-39: Replace `georgianFirstNames` array values with Latin equivalents
- Lines 41-45: Replace `georgianLastInitials` array values with Latin equivalents

**Database migration:**
```sql
UPDATE profiles SET nickname = 'Giorgi' WHERE id = 'ae8c42e6-5023-4d75-9634-03b6dfc14fca';
UPDATE profiles SET nickname = 'Mariami' WHERE id = '620e54af-2457-4d68-b0c1-79b1f12d51b2';
UPDATE profiles SET nickname = 'Nika' WHERE id = 'd93f95e2-6fab-43e7-ba62-867d0fc5dc90';
UPDATE profiles SET nickname = 'Ana' WHERE id = 'a6782341-a581-4138-9219-73f47957adfa';
UPDATE profiles SET nickname = 'Daviti' WHERE id = '877670d3-8265-4d21-8313-cd2d97e2654b';
UPDATE profiles SET nickname = 'Elene' WHERE id = 'd7a2020e-d6a5-47e6-b3f7-b855ce07dc59';
UPDATE profiles SET nickname = 'Luka' WHERE id = 'ef667c9e-d8ec-46ec-bea5-0cd475bb2322';
UPDATE profiles SET nickname = 'Tamari' WHERE id = 'd322f4a2-1ebe-4d65-bccb-daf625095828';
```

### Files Changed
- `src/data/opponents.ts` -- Latin transliterated names and initials
- Database migration -- update 8 profile nicknames

