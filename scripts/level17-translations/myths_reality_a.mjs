/**
 * myths_reality, part 1 of 2 — 17 Georgian-original questions.
 *
 * The category's house style is a claim answered with Myth / Reality, or a
 * yes/no whose options carry the hedge ("only in large doses", "only for
 * chieftains"). Both survive translation only if the hedges stay hedges —
 * flattening them to plain Yes/No would leave four options where two are the
 * same answer.
 */
export default {
  // ვიტამინი C გაციებისგან გვიცავს? — მითი
  "c991f535-8d58-4917-a34d-b87564fc4dc2": {
    en: { q: "Is it true that vitamin C protects you from catching a cold?", c: "Myth", w: ["Reality", "Only in large doses", "Only as prevention"] },
    de: { q: "Stimmt es, dass Vitamin C vor Erkältungen schützt?", c: "Mythos", w: ["Realität", "Nur in hohen Dosen", "Nur zur Vorbeugung"] },
    es: { q: "¿Es cierto que la vitamina C protege del resfriado?", c: "Mito", w: ["Realidad", "Solo en dosis altas", "Solo como prevención"] },
    fr: { q: "Est-il vrai que la vitamine C protège du rhume ?", c: "Mythe", w: ["Réalité", "Seulement à forte dose", "Seulement en prévention"] },
    it: { q: "È vero che la vitamina C protegge dal raffreddore?", c: "Mito", w: ["Realtà", "Solo ad alte dosi", "Solo come prevenzione"] },
    pt: { q: "É verdade que a vitamina C protege das constipações?", c: "Mito", w: ["Realidade", "Só em doses altas", "Só como prevenção"] },
  },

  // ცისარტყელას ბოლოზე ოქროს ქოთანია? — მითი
  "232f0b5a-f72a-40fa-93ca-fbeb70c7efab": {
    en: { q: "Is it true that there is a pot of gold at the end of the rainbow?", c: "Myth", w: ["Reality", "Only in fairy tales", "Only in Ireland"] },
    de: { q: "Stimmt es, dass am Ende des Regenbogens ein Topf voll Gold steht?", c: "Mythos", w: ["Realität", "Nur in Märchen", "Nur in Irland"] },
    es: { q: "¿Es cierto que al final del arcoíris hay una olla de oro?", c: "Mito", w: ["Realidad", "Solo en los cuentos", "Solo en Irlanda"] },
    fr: { q: "Est-il vrai qu'un chaudron d'or se trouve au bout de l'arc-en-ciel ?", c: "Mythe", w: ["Réalité", "Seulement dans les contes", "Seulement en Irlande"] },
    it: { q: "È vero che alla fine dell'arcobaleno c'è una pentola d'oro?", c: "Mito", w: ["Realtà", "Solo nelle fiabe", "Solo in Irlanda"] },
    pt: { q: "É verdade que no fim do arco-íris há um pote de ouro?", c: "Mito", w: ["Realidade", "Só nos contos", "Só na Irlanda"] },
  },

  // პეპლები მწერები არიან? — რეალობა
  "8c20ab2f-93e3-4f3e-95e5-31bd803fc112": {
    en: { q: "Is it true that butterflies are insects?", c: "Reality", w: ["Myth", "They are birds", "They are plants"] },
    de: { q: "Stimmt es, dass Schmetterlinge Insekten sind?", c: "Realität", w: ["Mythos", "Sie sind Vögel", "Sie sind Pflanzen"] },
    es: { q: "¿Es cierto que las mariposas son insectos?", c: "Realidad", w: ["Mito", "Son aves", "Son plantas"] },
    fr: { q: "Est-il vrai que les papillons sont des insectes ?", c: "Réalité", w: ["Mythe", "Ce sont des oiseaux", "Ce sont des plantes"] },
    it: { q: "È vero che le farfalle sono insetti?", c: "Realtà", w: ["Mito", "Sono uccelli", "Sono piante"] },
    pt: { q: "É verdade que as borboletas são insetos?", c: "Realidade", w: ["Mito", "São aves", "São plantas"] },
  },

  // მზე დედამიწის გარშემო ბრუნავს? — მითი
  "fa34fe6c-eca9-4799-af3b-41394c8506a2": {
    en: { q: "Is it true that the Sun orbits the Earth?", c: "Myth", w: ["Reality", "It used to be true", "Only in winter"] },
    de: { q: "Stimmt es, dass sich die Sonne um die Erde dreht?", c: "Mythos", w: ["Realität", "Früher stimmte es", "Nur im Winter"] },
    es: { q: "¿Es cierto que el Sol gira alrededor de la Tierra?", c: "Mito", w: ["Realidad", "Antes era cierto", "Solo en invierno"] },
    fr: { q: "Est-il vrai que le Soleil tourne autour de la Terre ?", c: "Mythe", w: ["Réalité", "C'était vrai autrefois", "Seulement en hiver"] },
    it: { q: "È vero che il Sole gira intorno alla Terra?", c: "Mito", w: ["Realtà", "Una volta era vero", "Solo d'inverno"] },
    pt: { q: "É verdade que o Sol gira à volta da Terra?", c: "Mito", w: ["Realidade", "Antigamente era verdade", "Só no inverno"] },
  },

  // ადამიანს მხოლოდ ხუთი გრძნობა აქვს? — მცდარია
  "b7d24308-8734-4579-8206-2db5102db0bc": {
    en: { q: "By modern science, is it true that humans have only five senses?", c: "False", w: ["True", "It depends on the person", "Only the main ones count"] },
    de: { q: "Stimmt es nach heutiger Wissenschaft, dass der Mensch nur fünf Sinne hat?", c: "Falsch", w: ["Wahr", "Das ist von Mensch zu Mensch verschieden", "Nur die wichtigsten zählen"] },
    es: { q: "Según la ciencia actual, ¿es cierto que el ser humano solo tiene cinco sentidos?", c: "Falso", w: ["Verdadero", "Depende de la persona", "Solo cuentan los principales"] },
    fr: { q: "Selon la science actuelle, l'être humain n'a-t-il que cinq sens ?", c: "Faux", w: ["Vrai", "Cela dépend de la personne", "Seuls les principaux comptent"] },
    it: { q: "Secondo la scienza attuale, è vero che l'uomo ha solo cinque sensi?", c: "Falso", w: ["Vero", "Dipende dalla persona", "Contano solo i principali"] },
    pt: { q: "Segundo a ciência atual, é verdade que o ser humano só tem cinco sentidos?", c: "Falso", w: ["Verdadeiro", "Depende da pessoa", "Só contam os principais"] },
  },

  // ადამიანის ტვინი მხოლოდ 10%-ით მუშაობს? — მითი
  "746ec440-9b10-469a-b5b1-12c9c98559e3": {
    en: { q: "Is it true that we use only 10% of our brain?", c: "Myth", w: ["Reality", "Partly a myth", "Partly true"] },
    de: { q: "Stimmt es, dass wir nur 10 % unseres Gehirns nutzen?", c: "Mythos", w: ["Realität", "Teilweise ein Mythos", "Teilweise wahr"] },
    es: { q: "¿Es cierto que solo usamos el 10% del cerebro?", c: "Mito", w: ["Realidad", "En parte es un mito", "En parte es cierto"] },
    fr: { q: "Est-il vrai que nous n'utilisons que 10 % de notre cerveau ?", c: "Mythe", w: ["Réalité", "En partie un mythe", "En partie vrai"] },
    it: { q: "È vero che usiamo solo il 10% del cervello?", c: "Mito", w: ["Realtà", "In parte è un mito", "In parte è vero"] },
    pt: { q: "É verdade que só usamos 10% do cérebro?", c: "Mito", w: ["Realidade", "Em parte é um mito", "Em parte é verdade"] },
  },

  // საქართველო ღვინის სამშობლოა? — რეალობა
  "133accc3-d4f2-4b88-9daf-cdfc412bdba7": {
    en: { q: "Is it true that Georgia is the birthplace of wine?", c: "Reality", w: ["Myth", "It was Greece", "It was Italy"] },
    de: { q: "Stimmt es, dass Georgien die Wiege des Weins ist?", c: "Realität", w: ["Mythos", "Es war Griechenland", "Es war Italien"] },
    es: { q: "¿Es cierto que Georgia es la cuna del vino?", c: "Realidad", w: ["Mito", "Fue Grecia", "Fue Italia"] },
    fr: { q: "Est-il vrai que la Géorgie est le berceau du vin ?", c: "Réalité", w: ["Mythe", "C'était la Grèce", "C'était l'Italie"] },
    it: { q: "È vero che la Georgia è la culla del vino?", c: "Realtà", w: ["Mito", "È stata la Grecia", "È stata l'Italia"] },
    pt: { q: "É verdade que a Geórgia é o berço do vinho?", c: "Realidade", w: ["Mito", "Foi a Grécia", "Foi a Itália"] },
  },

  // ვიკინგებს რქიანი ჩაფხუტები ეხურათ? — მითი
  "60cfd124-0c4f-45c8-8faa-51005b88872e": {
    en: { q: "Is it true that Vikings wore horned helmets?", c: "Myth", w: ["Reality", "Only during rituals", "Only the chieftains"] },
    de: { q: "Stimmt es, dass Wikinger Hörnerhelme trugen?", c: "Mythos", w: ["Realität", "Nur bei Ritualen", "Nur die Anführer"] },
    es: { q: "¿Es cierto que los vikingos llevaban cascos con cuernos?", c: "Mito", w: ["Realidad", "Solo en los rituales", "Solo los jefes"] },
    fr: { q: "Est-il vrai que les Vikings portaient des casques à cornes ?", c: "Mythe", w: ["Réalité", "Seulement lors des rituels", "Seulement les chefs"] },
    it: { q: "È vero che i vichinghi portavano elmi con le corna?", c: "Mito", w: ["Realtà", "Solo durante i rituali", "Solo i capi"] },
    pt: { q: "É verdade que os vikings usavam capacetes com chifres?", c: "Mito", w: ["Realidade", "Só nos rituais", "Só os chefes"] },
  },

  // ოქროს თევზს 3 წამიანი მეხსიერება აქვს? — მითი
  "17ac1daa-b816-416c-af14-ee350b23f23f": {
    en: { q: "Is it true that a goldfish has a three-second memory?", c: "Myth", w: ["Reality", "Only young fish", "Only one species"] },
    de: { q: "Stimmt es, dass ein Goldfisch ein Gedächtnis von drei Sekunden hat?", c: "Mythos", w: ["Realität", "Nur junge Fische", "Nur eine Art"] },
    es: { q: "¿Es cierto que un pez de colores tiene tres segundos de memoria?", c: "Mito", w: ["Realidad", "Solo los peces jóvenes", "Solo una especie"] },
    fr: { q: "Est-il vrai qu'un poisson rouge a trois secondes de mémoire ?", c: "Mythe", w: ["Réalité", "Seulement les jeunes poissons", "Seulement une espèce"] },
    it: { q: "È vero che un pesce rosso ha tre secondi di memoria?", c: "Mito", w: ["Realtà", "Solo i pesci giovani", "Solo una specie"] },
    pt: { q: "É verdade que um peixinho-dourado tem três segundos de memória?", c: "Mito", w: ["Realidade", "Só os peixes jovens", "Só uma espécie"] },
  },

  // ჩინეთის დიდი კედელი მთვარიდან ჩანს? — მითი
  "cc666d3c-032a-4a75-8f45-3ef769286a69": {
    en: { q: "Is it true that the Great Wall of China is visible from the Moon?", c: "Myth", w: ["Reality", "Only with a telescope", "Only in clear weather"] },
    de: { q: "Stimmt es, dass die Chinesische Mauer vom Mond aus zu sehen ist?", c: "Mythos", w: ["Realität", "Nur mit einem Teleskop", "Nur bei klarem Wetter"] },
    es: { q: "¿Es cierto que la Gran Muralla China se ve desde la Luna?", c: "Mito", w: ["Realidad", "Solo con telescopio", "Solo con buen tiempo"] },
    fr: { q: "Est-il vrai que la Grande Muraille est visible depuis la Lune ?", c: "Mythe", w: ["Réalité", "Seulement au télescope", "Seulement par temps clair"] },
    it: { q: "È vero che la Grande Muraglia si vede dalla Luna?", c: "Mito", w: ["Realtà", "Solo col telescopio", "Solo col tempo sereno"] },
    pt: { q: "É verdade que a Grande Muralha da China se vê da Lua?", c: "Mito", w: ["Realidade", "Só com telescópio", "Só com tempo limpo"] },
  },

  // დელფინები ძუძუმწოვრები არიან? — დიახ
  "74ea2f47-fc11-4b0f-b7ff-53dac6379604": {
    en: { q: "Are dolphins mammals?", c: "Yes", w: ["No", "They are fish", "They are amphibians"] },
    de: { q: "Sind Delfine Säugetiere?", c: "Ja", w: ["Nein", "Sie sind Fische", "Sie sind Amphibien"] },
    es: { q: "¿Los delfines son mamíferos?", c: "Sí", w: ["No", "Son peces", "Son anfibios"] },
    fr: { q: "Les dauphins sont-ils des mammifères ?", c: "Oui", w: ["Non", "Ce sont des poissons", "Ce sont des amphibiens"] },
    it: { q: "I delfini sono mammiferi?", c: "Sì", w: ["No", "Sono pesci", "Sono anfibi"] },
    pt: { q: "Os golfinhos são mamíferos?", c: "Sim", w: ["Não", "São peixes", "São anfíbios"] },
  },

  // შენობებიდან ჩამოვარდნილი მონეტა სასიკვდილოა? — არა
  "0186835d-f2dd-4d2e-a773-20a058e79e5e": {
    en: { q: "Is a coin dropped from a skyscraper deadly?", c: "No, it is not", w: ["Yes, it is dangerous", "Almost always", "The odds are high"] },
    de: { q: "Ist eine von einem Hochhaus fallende Münze tödlich?", c: "Nein, ist sie nicht", w: ["Ja, sie ist gefährlich", "Fast immer", "Die Chance ist hoch"] },
    es: { q: "¿Una moneda lanzada desde un rascacielos es mortal?", c: "No, no lo es", w: ["Sí, es peligrosa", "Casi siempre", "Hay muchas posibilidades"] },
    fr: { q: "Une pièce tombée d'un gratte-ciel est-elle mortelle ?", c: "Non, elle ne l'est pas", w: ["Oui, c'est dangereux", "Presque toujours", "Le risque est élevé"] },
    it: { q: "Una moneta caduta da un grattacielo è mortale?", c: "No, non lo è", w: ["Sì, è pericolosa", "Quasi sempre", "Le probabilità sono alte"] },
    pt: { q: "Uma moeda atirada de um arranha-céus é mortal?", c: "Não, não é", w: ["Sim, é perigosa", "Quase sempre", "As hipóteses são altas"] },
  },

  // გველებს არ აქვთ ძვლები? — არა, აქვთ
  "01f01912-359c-48ea-953a-20a10443d2e3": {
    en: { q: "Is it true that snakes have no bones?", c: "No, they have bones", w: ["Yes, they have none", "Yes, only skin", "Yes, only cartilage"] },
    de: { q: "Stimmt es, dass Schlangen keine Knochen haben?", c: "Nein, sie haben welche", w: ["Ja, sie haben keine", "Ja, nur Haut", "Ja, nur Knorpel"] },
    es: { q: "¿Es cierto que las serpientes no tienen huesos?", c: "No, sí tienen", w: ["Sí, no tienen", "Sí, solo piel", "Sí, solo cartílago"] },
    fr: { q: "Est-il vrai que les serpents n'ont pas d'os ?", c: "Non, ils en ont", w: ["Oui, ils n'en ont pas", "Oui, seulement la peau", "Oui, seulement du cartilage"] },
    it: { q: "È vero che i serpenti non hanno ossa?", c: "No, le hanno", w: ["Sì, non ne hanno", "Sì, solo pelle", "Sì, solo cartilagine"] },
    pt: { q: "É verdade que as cobras não têm ossos?", c: "Não, têm ossos", w: ["Sim, não têm", "Sim, só pele", "Sim, só cartilagem"] },
  },

  // რატომ ყმუიან მგლები? — კომუნიკაციისთვის
  "05e928d2-4cea-475f-943c-f04a7f340d1b": {
    en: { q: "Why do wolves howl?", c: "To communicate", w: ["To react to the Moon", "Only at full moon", "Because of experiments"] },
    de: { q: "Warum heulen Wölfe?", c: "Zur Verständigung", w: ["Als Reaktion auf den Mond", "Nur bei Vollmond", "Wegen Experimenten"] },
    es: { q: "¿Por qué aúllan los lobos?", c: "Para comunicarse", w: ["Para reaccionar a la Luna", "Solo en luna llena", "Por experimentos"] },
    fr: { q: "Pourquoi les loups hurlent-ils ?", c: "Pour communiquer", w: ["Pour réagir à la Lune", "Seulement à la pleine lune", "À cause d'expériences"] },
    it: { q: "Perché i lupi ululano?", c: "Per comunicare", w: ["Per reagire alla Luna", "Solo con la luna piena", "A causa di esperimenti"] },
    pt: { q: "Porque é que os lobos uivam?", c: "Para comunicar", w: ["Para reagir à Lua", "Só na lua cheia", "Por causa de experiências"] },
  },

  // ფენგ შუი მეცნიერულად დადასტურებულია? — არა, ფსევდომეცნიერებაა
  "0911b024-6997-4099-bba2-5418293daee1": {
    en: { q: "Is feng shui a scientifically proven concept?", c: "No, it is pseudoscience", w: ["Yes, by architectural studies", "Yes, through energy fields", "Yes, in part"] },
    de: { q: "Ist Feng-Shui ein wissenschaftlich belegtes Konzept?", c: "Nein, es ist Pseudowissenschaft", w: ["Ja, durch Architekturstudien", "Ja, über Energiefelder", "Ja, teilweise"] },
    es: { q: "¿Es el feng shui un concepto probado científicamente?", c: "No, es pseudociencia", w: ["Sí, por estudios de arquitectura", "Sí, por los campos de energía", "Sí, en parte"] },
    fr: { q: "Le feng shui est-il un concept prouvé scientifiquement ?", c: "Non, c'est une pseudoscience", w: ["Oui, par des études d'architecture", "Oui, par les champs d'énergie", "Oui, en partie"] },
    it: { q: "Il feng shui è un concetto scientificamente provato?", c: "No, è pseudoscienza", w: ["Sì, da studi di architettura", "Sì, tramite i campi energetici", "Sì, in parte"] },
    pt: { q: "O feng shui é um conceito comprovado cientificamente?", c: "Não, é pseudociência", w: ["Sim, por estudos de arquitetura", "Sim, pelos campos de energia", "Sim, em parte"] },
  },

  // ტოკიოში ღამით ცეკვის აკრძალვა დღესაც მოქმედებს? — არა, კანონი შეიცვალა
  "0b8c129b-b983-43df-b44d-cd7f4f42007f": {
    en: { q: "Is dancing in Tokyo clubs after dark still banned today?", c: "No, the law was changed", w: ["Yes, it is banned", "Only in clubs", "Only after 10 p.m."] },
    de: { q: "Ist das nächtliche Tanzen in Tokios Clubs heute noch verboten?", c: "Nein, das Gesetz wurde geändert", w: ["Ja, es ist verboten", "Nur in Clubs", "Nur nach 22 Uhr"] },
    es: { q: "¿Sigue prohibido bailar de noche en los clubes de Tokio?", c: "No, la ley cambió", w: ["Sí, está prohibido", "Solo en los clubes", "Solo después de las 22:00"] },
    fr: { q: "Danser la nuit dans les clubs de Tokyo est-il toujours interdit ?", c: "Non, la loi a changé", w: ["Oui, c'est interdit", "Seulement dans les clubs", "Seulement après 22 h"] },
    it: { q: "Ballare di notte nei club di Tokyo è ancora vietato?", c: "No, la legge è cambiata", w: ["Sì, è vietato", "Solo nei club", "Solo dopo le 22"] },
    pt: { q: "Dançar à noite nos clubes de Tóquio continua proibido?", c: "Não, a lei mudou", w: ["Sim, é proibido", "Só nos clubes", "Só depois das 22h"] },
  },

  // რომელი ვიტამინის დეფიციტი იწვევს ღამის სიბრმავეს? — A ვიტამინი
  "1205abb5-9fd4-427b-b57c-9939ec764257": {
    en: { q: "A deficiency of which vitamin causes night blindness?", c: "Vitamin A", w: ["Vitamin C", "Vitamin D", "Vitamin B12"] },
    de: { q: "Ein Mangel an welchem Vitamin verursacht Nachtblindheit?", c: "Vitamin A", w: ["Vitamin C", "Vitamin D", "Vitamin B12"] },
    es: { q: "¿La falta de qué vitamina provoca ceguera nocturna?", c: "Vitamina A", w: ["Vitamina C", "Vitamina D", "Vitamina B12"] },
    fr: { q: "Une carence en quelle vitamine provoque la cécité nocturne ?", c: "Vitamine A", w: ["Vitamine C", "Vitamine D", "Vitamine B12"] },
    it: { q: "La carenza di quale vitamina causa la cecità notturna?", c: "Vitamina A", w: ["Vitamina C", "Vitamina D", "Vitamina B12"] },
    pt: { q: "A falta de que vitamina provoca cegueira noturna?", c: "Vitamina A", w: ["Vitamina C", "Vitamina D", "Vitamina B12"] },
  },
};
