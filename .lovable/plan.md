
# გეგმა: ქართული ტრანსლიტერაციის რუკის გაფართოება

## რას გავაკეთებ

ვამატებ 150+ ახალ ტრანსლიტერაციის მაპინგს `smart-icon-search` Edge Function-ში, რომლებიც მოიცავს აიკონის მოდალში გამოყენებულ კატეგორიებს და დამატებით ობიექტებს.

---

## დასამატებელი კატეგორიები

### 1. ცხოველები (Animals) - გაფართოებული
```text
txa, txis → goat, animal, farm
gori, ghori → pig, swine, farm  
khatami, qatami → chicken, poultry, bird
chaki, chakhi → chicken, poultry, bird
ardvi → otter, animal, water
baykushi → owl, bird, night
tsikani → kid, goat, baby
tsxvari → sheep, wool, farm
kurdgheli → rabbit, bunny, pet
batka → duck, bird, water
batkni → duckling, duck, baby
indauri → turkey, bird, poultry
vira → donkey, animal, farm
irmis → deer, animal, forest
tskupri → squirrel, rodent, animal
bughri → hamster, rodent, pet
tagvi → mouse, rodent, small
mckhvrepi → cricket, insect, bug
tsigani → bee, insect, honey
priangi → butterfly, insect, wing
xoxobi → pheasant, bird, georgian
```

### 2. გართობა (Entertainment)
```text
tamashi → game, play, gaming, entertainment
satamashoebi → games, gaming, toys
tamashebi → games, gaming, play
satamasho → toy, plaything, game
tomi → doll, toy, puppet
satamashoe → toys, games, plaything
tsekva → dance, dancing, ballet
disneylandi → disney, theme park, fun
karnavali → carnival, festival, parade
cirki → circus, clown, performance
teatri → theater, stage, drama
opera → opera, music, theater
baleti → ballet, dance, performance
koncerti → concert, music, live
festivali → festival, celebration, party
garti → fun, entertainment, joy
xumroba → joke, humor, funny
anekdoti → joke, funny, humor
```

### 3. ტექნოლოგია (Technology)
```text
telefoni → phone, mobile, smartphone
kompiuteri → computer, laptop, desktop
smartfoni → smartphone, mobile, phone
tableti → tablet, ipad, device
kamera → camera, photo, photography
proeqtori → projector, screen, presentation
monitari → monitor, screen, display
klaviatura → keyboard, typing, computer
tauchi → mouse, computer, device
tausi → mouse, computer, cursor
printeri → printer, office, document
skaneri → scanner, office, document
airtagi → airtag, tracker, tech
dronei → drone, flying, camera
roboti → robot, ai, technology
xelovnuri inteleqti → AI, artificial intelligence, robot
programireba → programming, code, developer
programisti → programmer, developer, coder
aplikacia → app, application, mobile
saiti → website, site, web
softveri → software, program, application
harti → hard drive, storage, disk
modemi → modem, internet, wifi
routeri → router, wifi, internet
naushniki → headphones, audio, music
dinamiki → speaker, audio, sound
mikrofoni → microphone, audio, recording
```

### 4. ტრანსპორტი (Transport)
```text
manqana → car, vehicle, automobile
avto → car, auto, vehicle
avtomobili → automobile, car, vehicle
motocikli → motorcycle, bike, motor
velosipedi → bicycle, bike, cycling
skuteri → scooter, vehicle, ride
taksii → taxi, cab, ride
avtobusi → bus, transport, public
marshutka → minibus, van, transport
tramvai → tram, trolley, rail
metro → metro, subway, underground
matarebeli → train, railway, transport
gemi → ship, boat, vessel
navti → boat, ship, vessel
iaxta → yacht, boat, luxury
katamari → catamaran, boat, sailing
tvitmprinavi → airplane, plane, flight
vertmprenei → helicopter, chopper, flying
saraketoe → spaceship, rocket, space
satyepo → cargo, truck, transport
tirai → truck, lorry, transport
gadasazidi → trailer, transport, haul
ambulansi → ambulance, emergency, medical
saxandzro → fire truck, emergency, rescue
policia → police car, law, patrol
```

### 5. ბუნება (Nature)
```text
xe → tree, plant, forest
yvavili → flower, bloom, plant
balaki → grass, lawn, green
bichi → beach, sand, sea
mtsvane → green, nature, plant
chikhvi → bird, tweet, avian
mgeli → wolf, wild, animal
datvi → bear, wild, forest
iremi → deer, animal, forest
titi → finger (typo: allow for "chiti" → bird)
mta → mountain, peak, summit
tba → lake, water, pond
ghru → cloud, sky, weather
varskvlavi → star, night, sky
mze → sun, solar, light
mtvare → moon, lunar, night
wvima → rain, water, weather
tovli → snow, winter, cold
```

### 6. სპორტი (Sports)
```text
burti → ball, sport, game
fexburti → football, soccer, ball
kalatburti → basketball, ball, hoop
volei → volleyball, ball, net
golfi → golf, club, ball
tenisi → tennis, racket, ball
biniliaridi → billiards, pool, cue
basketboli → basketball, ball, hoop
chidaoba → wrestling, sport, fight
krivi → boxing, fight, sport
machvi → fencing, sword, sport
cekva → dance, ballet, sport
cekvaa → skating, ice, sport
tkhilam → ski, snow, winter
korpi → hockey, ice, sport
```

### 7. საჭმელი (Food)
```text
xachapuri → khachapuri, cheese, bread
xinkali → khinkali, dumpling, meat
shashliki → shashlik, kebab, grill
mtsvadi → barbecue, grill, meat
lobio → beans, georgian, food
ajapsandali → vegetable, stew, georgian
badrijani → eggplant, vegetable, food
churchxela → churchkhela, candy, georgian
tqemali → plum sauce, georgian, condiment
satsivi → walnut sauce, georgian, chicken
```

---

## ტექნიკური დეტალები

### ფაილი რომელშიც ცვლილებები იქნება
`supabase/functions/smart-icon-search/index.ts`

### ცვლილების ტიპი
- `LATIN_TRANSLITERATIONS` ობიექტის გაფართოება 150+ ახალი ჩანაწერით
- ტიპოების გათვალისწინება (მაგ. "chaki" და "chakhi" ორივე → chicken)
- ვარიანტების დამატება (მაგ. "cxeni" და "tskheni" ორივე → horse)

### შედეგი
ძიების მაგალითები:
- "txa" → თხა, თხის → goat აიკონები
- "chakhi" → ქათამი → chicken აიკონები
- "gori" → ღორი → pig აიკონები
- "telefoni" → phone, smartphone აიკონები
- "manqana" → car, vehicle აიკონები
