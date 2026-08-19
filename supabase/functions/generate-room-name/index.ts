import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Banned inappropriate Georgian words
const BANNED_WORDS = [
  'ტრაკი', 'განავალი', 'ფურთხი', 'ბოზი', 'შევეცი', 'მოვეცი',
  'ტყვნა', 'მუტელი', 'ყლე', 'ქერა', 'დედა', 'მამა', 'შენი'
];

// Max character limit for room names per script type
const MAX_NAME_LENGTH_KA = 18;
const MAX_NAME_LENGTH_LATIN = 22;

type LangCode = 'ka' | 'en' | 'fr' | 'de' | 'es' | 'it' | 'pt';

// Theme-based room names by language
const THEMED_ROOM_NAMES: Record<string, { names: Record<LangCode, string[]>, iconKeywords: string[] }> = {
  champion: {
    names: {
      ka: ["ოქროს თასი", "ვარსკვლავთა ბრძოლა", "მედლების კლუბი", "ჩემპიონები", "პირველობის რინგი", "გამარჯვებულთა ზონა", "ტრიუმფის არენა", "პოდიუმის გზა"],
      en: ["Golden Cup", "Stars Battle", "Medals Club", "Champions", "Title Ring", "Winners Zone", "Triumph Arena", "Podium Way"],
      fr: ["Coupe d'Or", "Combat d'Étoiles", "Club Médailles", "Champions", "Ring du Titre", "Zone Victoire", "Arène Triomphe", "Voie du Podium"],
      de: ["Goldpokal", "Sternenkampf", "Medaillen-Club", "Champions", "Titelring", "Siegerzone", "Triumph-Arena", "Podiumsweg"],
      es: ["Copa Dorada", "Duelo Estelar", "Club Medallas", "Campeones", "Ring del Título", "Zona Ganadora", "Arena Triunfo", "Vía del Podio"],
      it: ["Coppa d'Oro", "Sfida Stellare", "Club Medaglie", "Campioni", "Ring del Titolo", "Zona Vincenti", "Arena Trionfo", "Via del Podio"],
      pt: ["Taça Dourada", "Duelo Estelar", "Clube Medalhas", "Campeões", "Ring do Título", "Zona Vitória", "Arena Triunfo", "Via do Pódio"],
    },
    iconKeywords: ['trophy', 'medal', 'cup', 'winner', 'gold']
  },
  adventure: {
    names: {
      ka: ["კოსმოსის მოგზაური", "ექსპედიცია X", "აღმოჩენის გზა", "მკვლევართა კლანი", "ჰორიზონტის მიღმა", "საზღვრების მიღმა", "ძიების ბილიკი", "ახალი ტერიტორია"],
      en: ["Space Traveler", "Expedition X", "Discovery Path", "Explorers Clan", "Beyond Horizon", "Beyond Borders", "Search Trail", "New Territory"],
      fr: ["Voyageur Spatial", "Expédition X", "Voie Découverte", "Clan Explorateurs", "Au-delà Horizon", "Sans Frontières", "Piste Recherche", "Nouveau Terrain"],
      de: ["Raumreisender", "Expedition X", "Entdeckerpfad", "Forscher-Clan", "Hinter dem Horizont", "Ohne Grenzen", "Suchpfad", "Neues Gebiet"],
      es: ["Viajero Espacial", "Expedición X", "Ruta Descubre", "Clan Explorador", "Más Allá Horizonte", "Sin Fronteras", "Sendero Busca", "Nuevo Territorio"],
      it: ["Viaggiatore Spazio", "Spedizione X", "Via Scoperta", "Clan Esploratori", "Oltre Orizzonte", "Senza Confini", "Sentiero Ricerca", "Nuovo Territorio"],
      pt: ["Viajante Espacial", "Expedição X", "Trilha Descobre", "Clã Exploradores", "Além Horizonte", "Sem Fronteiras", "Trilha Busca", "Novo Território"],
    },
    iconKeywords: ['rocket', 'compass', 'map', 'telescope', 'binoculars']
  },
  creature: {
    names: {
      ka: ["ცეცხლის მცველი", "მითიური ბუნაგი", "ლეგენდის კვალი", "ჯადოსნური არსება", "ფანტასტიური კლუბი", "მონსტრების ლიგა", "ზღაპრის სამყარო", "ფრთოსანთა კლანი"],
      en: ["Fire Guardian", "Mythical Den", "Legend's Trail", "Magic Creature", "Fantastic Club", "Monsters League", "Fairytale World", "Winged Clan"],
      fr: ["Gardien du Feu", "Antre Mythique", "Piste Légende", "Créature Magique", "Club Fantastique", "Ligue Monstres", "Monde Féerique", "Clan Ailé"],
      de: ["Feuerwächter", "Mythische Höhle", "Legendenpfad", "Magisches Wesen", "Fantastik-Club", "Monster-Liga", "Märchenwelt", "Geflügelter Clan"],
      es: ["Guardián Fuego", "Guarida Mítica", "Senda Leyenda", "Criatura Mágica", "Club Fantástico", "Liga Monstruos", "Mundo Cuentos", "Clan Alado"],
      it: ["Guardiano Fuoco", "Tana Mitica", "Sentiero Leggenda", "Creatura Magica", "Club Fantastico", "Lega Mostri", "Mondo Fiabe", "Clan Alato"],
      pt: ["Guardião do Fogo", "Covil Mítico", "Trilha Lenda", "Criatura Mágica", "Clube Fantástico", "Liga Monstros", "Mundo Contos", "Clã Alado"],
    },
    iconKeywords: ['dragon', 'phoenix', 'unicorn', 'griffin', 'pegasus']
  },
  animal: {
    names: {
      ka: ["მტაცებლის ხროვა", "ბუნაგის მეფე", "მფრინავი მხედარი", "ველური კლანი", "ბუნების ძალა", "თათების ლიგა", "ფოლადის კლანჭა", "სწრაფი ნადირი"],
      en: ["Predator Pack", "Den King", "Flying Rider", "Wild Clan", "Nature's Power", "Paws League", "Steel Claw", "Swift Hunter"],
      fr: ["Meute Prédateur", "Roi du Repaire", "Cavalier Volant", "Clan Sauvage", "Force Nature", "Ligue Pattes", "Griffe d'Acier", "Chasseur Rapide"],
      de: ["Raubtier-Rudel", "König der Höhle", "Fliegende Reiter", "Wilder Clan", "Naturgewalt", "Pfoten-Liga", "Stahlklaue", "Flinker Jäger"],
      es: ["Manada Depredador", "Rey Guarida", "Jinete Volador", "Clan Salvaje", "Fuerza Natural", "Liga de Patas", "Garra de Acero", "Cazador Veloz"],
      it: ["Branco Predatore", "Re della Tana", "Cavaliere Volante", "Clan Selvaggio", "Forza Natura", "Lega Zampe", "Artiglio d'Acciaio", "Cacciatore Veloce"],
      pt: ["Alcateia Predador", "Rei da Toca", "Cavaleiro Voador", "Clã Selvagem", "Força da Natureza", "Liga das Patas", "Garra de Aço", "Caçador Veloz"],
    },
    iconKeywords: ['lion', 'wolf', 'eagle', 'bear', 'tiger', 'shark', 'panther']
  },
  battle: {
    names: {
      ka: ["ჯავშნის რინგი", "კლინკის ჟღერა", "მეომრის ბილიკი", "ფარების კედელი", "გლადიატორები", "რაინდთა კლანი", "ბრძოლის მოედანი", "ფოლადის გუნდი"],
      en: ["Armor Ring", "Blade Clang", "Warrior's Path", "Shield Wall", "Gladiators", "Knights Clan", "Battle Arena", "Steel Team"],
      fr: ["Ring d'Armure", "Choc des Lames", "Voie Guerrier", "Mur Boucliers", "Gladiateurs", "Clan Chevaliers", "Arène Combat", "Équipe d'Acier"],
      de: ["Rüstungsring", "Klingenklang", "Kriegerpfad", "Schildwall", "Gladiatoren", "Ritter-Clan", "Kampfarena", "Stahlteam"],
      es: ["Ring Armadura", "Choque Espadas", "Senda Guerrero", "Muro Escudos", "Gladiadores", "Clan Caballeros", "Arena Batalla", "Equipo Acero"],
      it: ["Ring Armatura", "Fragore Lame", "Via Guerriero", "Muro Scudi", "Gladiatori", "Clan Cavalieri", "Arena Battaglia", "Squadra Acciaio"],
      pt: ["Ring Armadura", "Choque Lâminas", "Via Guerreiro", "Muro Escudos", "Gladiadores", "Clã Cavaleiros", "Arena Batalha", "Equipe Aço"],
    },
    iconKeywords: ['sword', 'shield', 'boxing', 'knight', 'armor', 'battle']
  },
  magic: {
    names: {
      ka: ["ჯადოქართა სახლი", "კრისტალის კოშკი", "მოჯადოე კლანი", "შელოცვის წრე", "მაგიური ბროლი", "ალქიმიკოსები", "ჯადოს სკოლა", "მისტიკის კლუბი"],
      en: ["Wizards House", "Crystal Tower", "Enchanted Clan", "Spell Circle", "Magic Orb", "Alchemists", "Magic School", "Mystic Club"],
      fr: ["Maison Sorciers", "Tour Cristal", "Clan Enchanté", "Cercle Sorts", "Orbe Magique", "Alchimistes", "École Magie", "Club Mystique"],
      de: ["Zaubererhaus", "Kristallturm", "Verzauberter Clan", "Zauberkreis", "Magiekugel", "Alchemisten", "Magieschule", "Mystik-Club"],
      es: ["Casa Magos", "Torre Cristal", "Clan Encantado", "Círculo Hechizos", "Orbe Mágico", "Alquimistas", "Escuela Magia", "Club Místico"],
      it: ["Casa Maghi", "Torre Cristallo", "Clan Incantato", "Cerchio Incanti", "Sfera Magica", "Alchimisti", "Scuola Magia", "Club Mistico"],
      pt: ["Casa Magos", "Torre Cristal", "Clã Encantado", "Círculo Feitiços", "Orbe Mágico", "Alquimistas", "Escola Magia", "Clube Místico"],
    },
    iconKeywords: ['wizard', 'wand', 'crystal', 'magic', 'potion', 'hat']
  },
  party: {
    names: {
      ka: ["ზეიმის მოედანი", "ფეიერვერკი", "სახალისო ბუდე", "წვეულების კლუბი", "ბალონების ომი", "კონფეტის წვიმა", "დღესასწაული", "ფესტივალი"],
      en: ["Celebration Plaza", "Fireworks", "Fun Nest", "Party Club", "Balloon War", "Confetti Rain", "Holiday", "Festival"],
      fr: ["Place de Fête", "Feux d'Artifice", "Nid Amusant", "Club Fête", "Guerre Ballons", "Pluie Confettis", "Fête", "Festival"],
      de: ["Festplatz", "Feuerwerk", "Spaßnest", "Party-Club", "Ballonkrieg", "Konfettiregen", "Feiertag", "Festival"],
      es: ["Plaza Fiesta", "Fuegos Artificiales", "Nido Diversión", "Club Fiesta", "Guerra Globos", "Lluvia Confeti", "Celebración", "Festival"],
      it: ["Piazza Festa", "Fuochi d'Artificio", "Nido Divertente", "Club Festa", "Guerra Palloncini", "Pioggia Coriandoli", "Festa", "Festival"],
      pt: ["Praça Festa", "Fogos Artifício", "Ninho Diversão", "Clube Festa", "Guerra Balões", "Chuva Confete", "Celebração", "Festival"],
    },
    iconKeywords: ['balloon', 'confetti', 'cake', 'party', 'gift', 'fireworks']
  },
  nature: {
    names: {
      ka: ["მწვერვალის ჯგუფი", "მზის ხეობა", "ტყის კლანი", "მთის მგლები", "ბუნების ძალა", "მწვანე ლიგა", "ხეობის მცველი", "კლდის არწივები"],
      en: ["Summit Group", "Sun Valley", "Forest Clan", "Mountain Wolves", "Nature's Force", "Green League", "Valley Guardian", "Rock Eagles"],
      fr: ["Groupe Sommet", "Vallée du Soleil", "Clan Forêt", "Loups Montagne", "Force Nature", "Ligue Verte", "Gardien Vallée", "Aigles du Roc"],
      de: ["Gipfelgruppe", "Sonnental", "Wald-Clan", "Bergwölfe", "Naturkraft", "Grüne Liga", "Talwächter", "Felsadler"],
      es: ["Grupo Cumbre", "Valle del Sol", "Clan Bosque", "Lobos Montaña", "Fuerza Natura", "Liga Verde", "Guardián Valle", "Águilas Roca"],
      it: ["Gruppo Vetta", "Valle del Sole", "Clan Foresta", "Lupi Montagna", "Forza Natura", "Lega Verde", "Guardiano Valle", "Aquile Roccia"],
      pt: ["Grupo Cume", "Vale do Sol", "Clã Floresta", "Lobos Montanha", "Força Natura", "Liga Verde", "Guardião do Vale", "Águias Rocha"],
    },
    iconKeywords: ['tree', 'mountain', 'sun', 'leaf', 'forest', 'flower']
  },
  tech: {
    names: {
      ka: ["კიბერ არენა", "პიქსელების ომი", "დიჯიტალ გვარდია", "კოდის მეომრები", "ტექნო კლანი", "რობოტების ლიგა", "ჩიპის ჯგუფი", "მატრიცის რინგი"],
      en: ["Cyber Arena", "Pixel War", "Digital Guard", "Code Warriors", "Techno Clan", "Robots League", "Chip Squad", "Matrix Ring"],
      fr: ["Arène Cyber", "Guerre Pixels", "Garde Digitale", "Guerriers Code", "Clan Techno", "Ligue Robots", "Escouade Puce", "Ring Matrice"],
      de: ["Cyber-Arena", "Pixelkrieg", "Digitalgarde", "Code-Krieger", "Techno-Clan", "Roboter-Liga", "Chip-Trupp", "Matrix-Ring"],
      es: ["Arena Ciber", "Guerra Píxeles", "Guardia Digital", "Guerreros Código", "Clan Tecno", "Liga Robots", "Escuadrón Chip", "Ring Matrix"],
      it: ["Arena Cyber", "Guerra Pixel", "Guardia Digitale", "Guerrieri Codice", "Clan Tecno", "Lega Robot", "Squadra Chip", "Ring Matrice"],
      pt: ["Arena Ciber", "Guerra Pixels", "Guarda Digital", "Guerreiros Código", "Clã Tecno", "Liga Robôs", "Esquadrão Chip", "Ring Matrix"],
    },
    iconKeywords: ['robot', 'chip', 'gamepad', 'laptop', 'console', 'controller']
  },
  music: {
    names: {
      ka: ["რიტმის კლუბი", "ნოტების ბრძოლა", "ჰარმონია", "მელოდიის კლანი", "კონცერტის ზონა", "ბითების არენა", "როკის ბუნაგი", "ჯაზის კლუბი"],
      en: ["Rhythm Club", "Notes Battle", "Harmony", "Melody Clan", "Concert Zone", "Beats Arena", "Rock Den", "Jazz Club"],
      fr: ["Club Rythme", "Bataille Notes", "Harmonie", "Clan Mélodie", "Zone Concert", "Arène Beats", "Antre Rock", "Club Jazz"],
      de: ["Rhythmus-Club", "Notenkampf", "Harmonie", "Melodie-Clan", "Konzertzone", "Beats-Arena", "Rock-Höhle", "Jazz-Club"],
      es: ["Club Ritmo", "Batalla Notas", "Armonía", "Clan Melodía", "Zona Concierto", "Arena Beats", "Guarida Rock", "Club Jazz"],
      it: ["Club Ritmo", "Battaglia Note", "Armonia", "Clan Melodia", "Zona Concerto", "Arena Beats", "Tana Rock", "Club Jazz"],
      pt: ["Clube Ritmo", "Batalha Notas", "Harmonia", "Clã Melodia", "Zona Concerto", "Arena Beats", "Covil Rock", "Clube Jazz"],
    },
    iconKeywords: ['guitar', 'piano', 'headphones', 'microphone', 'music', 'drum']
  },
  mystery: {
    names: {
      ka: ["საიდუმლო კლუბი", "გამოცანის სახლი", "დეტექტივები", "შერლოკის კლანი", "მისტერიის ზონა", "გასაღების მფლობელი", "ნიღბის უკან", "საიდუმლო საზოგადო"],
      en: ["Secret Club", "Riddle House", "Detectives", "Sherlock Clan", "Mystery Zone", "Key Holder", "Behind the Mask", "Secret Society"],
      fr: ["Club Secret", "Maison Énigmes", "Détectives", "Clan Sherlock", "Zone Mystère", "Gardien Clés", "Derrière le Masque", "Société Secrète"],
      de: ["Geheimclub", "Rätselhaus", "Detektive", "Sherlock-Clan", "Mysteryzone", "Schlüsselhalter", "Hinter der Maske", "Geheimgesellschaft"],
      es: ["Club Secreto", "Casa Enigmas", "Detectives", "Clan Sherlock", "Zona Misterio", "Guardián Llaves", "Tras la Máscara", "Sociedad Secreta"],
      it: ["Club Segreto", "Casa Enigmi", "Detective", "Clan Sherlock", "Zona Mistero", "Custode Chiavi", "Dietro la Maschera", "Società Segreta"],
      pt: ["Clube Secreto", "Casa Enigmas", "Detetives", "Clã Sherlock", "Zona Mistério", "Guardião Chaves", "Atrás da Máscara", "Sociedade Secreta"],
    },
    iconKeywords: ['detective', 'mask', 'key', 'magnifier', 'mystery', 'spy']
  },
  speed: {
    names: {
      ka: ["მეხის სიჩქარე", "ელვის გუნდი", "თავგადასავალი", "რბოლის კლუბი", "ტურბო არენა", "სწრაფი და ფოლადი", "ნიტროს რინგი", "სიჩქარის ეშმაკი"],
      en: ["Thunder Speed", "Lightning Team", "Thrill", "Racing Club", "Turbo Arena", "Fast & Steel", "Nitro Ring", "Speed Demon"],
      fr: ["Vitesse Tonnerre", "Équipe Éclair", "Frisson", "Club Course", "Arène Turbo", "Rapide et Acier", "Ring Nitro", "Démon Vitesse"],
      de: ["Donnergeschwindigkeit", "Blitz-Team", "Nervenkitzel", "Renn-Club", "Turbo-Arena", "Schnell & Stahl", "Nitro-Ring", "Tempo-Dämon"],
      es: ["Velocidad Trueno", "Equipo Rayo", "Emoción", "Club Carreras", "Arena Turbo", "Rápido y Acero", "Ring Nitro", "Demonio Veloz"],
      it: ["Velocità Tuono", "Squadra Lampo", "Brivido", "Club Corse", "Arena Turbo", "Veloce e Acciaio", "Ring Nitro", "Demone Velocità"],
      pt: ["Velocidade Trovão", "Equipe Relâmpago", "Emoção", "Clube Corrida", "Arena Turbo", "Rápido e Aço", "Ring Nitro", "Demônio Veloz"],
    },
    iconKeywords: ['racing', 'lightning', 'flame', 'car', 'motorcycle', 'bolt']
  },
  ocean: {
    names: {
      ka: ["ზღვის მგლები", "ოკეანის კლანი", "ტალღის მხედარი", "მეკობრეები", "წყალქვეშა ლიგა", "ზვიგენის კბილი", "ნავთსადგური", "კაპიტნის ხიდი"],
      en: ["Sea Wolves", "Ocean Clan", "Wave Rider", "Pirates", "Underwater League", "Shark Tooth", "Harbor", "Captain's Bridge"],
      fr: ["Loups de Mer", "Clan Océan", "Cavalier Vagues", "Pirates", "Ligue Sous-Marine", "Dent de Requin", "Port", "Pont Capitaine"],
      de: ["Seewölfe", "Ozean-Clan", "Wellenreiter", "Piraten", "Unterwasser-Liga", "Haifischzahn", "Hafen", "Kapitänsbrücke"],
      es: ["Lobos de Mar", "Clan Océano", "Jinete de Olas", "Piratas", "Liga Submarina", "Diente Tiburón", "Puerto", "Puente Capitán"],
      it: ["Lupi di Mare", "Clan Oceano", "Cavaliere Onde", "Pirati", "Lega Sottomarina", "Dente Squalo", "Porto", "Ponte Capitano"],
      pt: ["Lobos do Mar", "Clã Oceano", "Cavaleiro Ondas", "Piratas", "Liga Submarina", "Dente Tubarão", "Porto", "Ponte Capitão"],
    },
    iconKeywords: ['shark', 'anchor', 'wave', 'ship', 'pirate', 'whale', 'octopus']
  },
  food: {
    names: {
      ka: ["გემოვნების ბრძოლა", "შეფთა დუელი", "გურმანთა კლუბი", "რეცეპტის საიდუმლო", "სამზარეულოს ომი", "დეგუსტაცია", "ფლეივერის ზონა", "გასტრო არენა"],
      en: ["Taste Battle", "Chefs Duel", "Gourmets Club", "Recipe Secret", "Kitchen War", "Tasting", "Flavor Zone", "Gastro Arena"],
      fr: ["Bataille Goûts", "Duel Chefs", "Club Gourmets", "Secret Recette", "Guerre Cuisine", "Dégustation", "Zone Saveur", "Arène Gastro"],
      de: ["Geschmackskampf", "Chefkoch-Duell", "Gourmet-Club", "Rezeptgeheimnis", "Küchenkrieg", "Verkostung", "Geschmackszone", "Gastro-Arena"],
      es: ["Batalla Sabores", "Duelo Chefs", "Club Gourmets", "Secreto Receta", "Guerra Cocina", "Degustación", "Zona Sabor", "Arena Gastro"],
      it: ["Battaglia Gusti", "Duello Chef", "Club Gourmet", "Segreto Ricetta", "Guerra Cucina", "Degustazione", "Zona Sapore", "Arena Gastro"],
      pt: ["Batalha Sabores", "Duelo Chefs", "Clube Gourmets", "Segredo Receita", "Guerra Cozinha", "Degustação", "Zona Sabor", "Arena Gastro"],
    },
    iconKeywords: ['pizza', 'burger', 'chef', 'cooking', 'cake', 'food']
  },
  space: {
    names: {
      ka: ["გალაქტიკის რინგი", "ვარსკვლავთა ჯგუფი", "კოსმიური კლანი", "ასტრონავტები", "ორბიტის მცველი", "პლანეტების ლიგა", "მეტეორის გზა", "კოსმოსის კაპიტანი"],
      en: ["Galaxy Ring", "Stars Group", "Cosmic Clan", "Astronauts", "Orbit Guardian", "Planets League", "Meteor Path", "Space Captain"],
      fr: ["Ring Galaxie", "Groupe Étoiles", "Clan Cosmique", "Astronautes", "Gardien Orbite", "Ligue Planètes", "Voie Météore", "Capitaine Espace"],
      de: ["Galaxie-Ring", "Sternengruppe", "Kosmischer Clan", "Astronauten", "Orbitwächter", "Planeten-Liga", "Meteorpfad", "Weltraumkapitän"],
      es: ["Ring Galaxia", "Grupo Estrellas", "Clan Cósmico", "Astronautas", "Guardián Órbita", "Liga Planetas", "Ruta Meteoro", "Capitán Espacial"],
      it: ["Ring Galassia", "Gruppo Stelle", "Clan Cosmico", "Astronauti", "Guardiano Orbita", "Lega Pianeti", "Via Meteora", "Capitano Spazio"],
      pt: ["Ring Galáxia", "Grupo Estrelas", "Clã Cósmico", "Astronautas", "Guardião Órbita", "Liga Planetas", "Rota Meteoro", "Capitão Espacial"],
    },
    iconKeywords: ['astronaut', 'planet', 'star', 'moon', 'satellite', 'ufo']
  }
};

// Icon library row type
interface IconRow {
  slug: string;
  icon_url: string | null;
  title?: string;
  tags?: string[];
}

function normalizeLang(lang: string | null | undefined): LangCode {
  if (!lang) return 'ka';
  const l = lang.toLowerCase().trim();
  if (['ka', 'en', 'fr', 'de', 'es', 'it', 'pt'].includes(l)) return l as LangCode;
  // Fallback: non-KA unknown languages get EN
  return 'en';
}

// Generate themed room name and icon keyword
function generateThemedRoomName(language: LangCode): { name: string, iconKeyword: string } {
  const themes = Object.keys(THEMED_ROOM_NAMES);
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  const themeData = THEMED_ROOM_NAMES[randomTheme];
  
  const names = themeData.names[language] || themeData.names['en'];
  const randomName = names[Math.floor(Math.random() * names.length)];
  const randomKeyword = themeData.iconKeywords[Math.floor(Math.random() * themeData.iconKeywords.length)];
  
  console.log(`Generated themed name: "${randomName}" (lang=${language}) from theme "${randomTheme}" with keyword "${randomKeyword}"`);
  
  return { name: randomName, iconKeyword: randomKeyword };
}

// Validate and clean generated name
function validateName(name: string, language: LangCode): boolean {
  const maxLen = language === 'ka' ? MAX_NAME_LENGTH_KA : MAX_NAME_LENGTH_LATIN;
  if (!name || name.length > maxLen) return false;
  
  // Only check banned words for Georgian
  if (language === 'ka') {
    const containsBanned = BANNED_WORDS.some(word => 
      name.toLowerCase().includes(word.toLowerCase())
    );
    return !containsBanned;
  }
  
  return true;
}

// Search for icons matching keywords - prioritizes exact matches
async function searchIconByKeyword(
  supabase: SupabaseClient,
  keyword: string
): Promise<string | null> {
  const normalizedKeyword = keyword.toLowerCase().trim();
  
  const { data: exactMatches, error: exactError } = await supabase
    .from('icon_library')
    .select('slug, icon_url, title')
    .not('icon_url', 'is', null)
    .ilike('title', normalizedKeyword)
    .limit(5);
  
  if (!exactError && exactMatches && exactMatches.length > 0) {
    const matches = exactMatches as IconRow[];
    const randomMatch = matches[Math.floor(Math.random() * matches.length)];
    console.log(`Found icon by exact title: "${randomMatch.slug}" for keyword "${keyword}"`);
    return randomMatch.icon_url;
  }
  
  const { data: prefixMatches, error: prefixError } = await supabase
    .from('icon_library')
    .select('slug, icon_url, title')
    .not('icon_url', 'is', null)
    .ilike('title', `${normalizedKeyword}%`)
    .limit(10);
  
  if (!prefixError && prefixMatches && prefixMatches.length > 0) {
    const matches = prefixMatches as IconRow[];
    const randomMatch = matches[Math.floor(Math.random() * matches.length)];
    console.log(`Found icon by prefix: "${randomMatch.slug}" for keyword "${keyword}"`);
    return randomMatch.icon_url;
  }
  
  const { data: titleMatches, error: titleError } = await supabase
    .from('icon_library')
    .select('slug, icon_url, title')
    .not('icon_url', 'is', null)
    .ilike('title', `%${normalizedKeyword}%`)
    .limit(10);
  
  if (!titleError && titleMatches && titleMatches.length > 0) {
    const matches = titleMatches as IconRow[];
    const randomMatch = matches[Math.floor(Math.random() * matches.length)];
    console.log(`Found icon by title: "${randomMatch.slug}" for keyword "${keyword}"`);
    return randomMatch.icon_url;
  }
  
  const { data: tagMatches, error: tagError } = await supabase
    .from('icon_library')
    .select('slug, icon_url, tags')
    .not('icon_url', 'is', null)
    .contains('tags', [normalizedKeyword])
    .limit(10);
  
  if (!tagError && tagMatches && tagMatches.length > 0) {
    const matches = tagMatches as IconRow[];
    const randomMatch = matches[Math.floor(Math.random() * matches.length)];
    console.log(`Found icon by tag: "${randomMatch.slug}" for keyword "${keyword}"`);
    return randomMatch.icon_url;
  }
  
  console.log(`No icon found for keyword "${keyword}"`);
  return null;
}

// Get random icon as ultimate fallback
async function getRandomIcon(supabase: SupabaseClient): Promise<string | null> {
  const { data: randomIcon, error } = await supabase
    .from('icon_library')
    .select('slug, icon_url')
    .not('icon_url', 'is', null)
    .order('random()')
    .limit(1);
  
  if (!error && randomIcon && randomIcon.length > 0) {
    const icons = randomIcon as IconRow[];
    console.log(`Using random fallback icon: ${icons[0].slug}`);
    return icons[0].icon_url;
  }
  
  return null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for optional parameters
    let iconSlug: string | null = null;
    let language: LangCode = 'ka';
    try {
      const body = await req.json();
      iconSlug = body?.iconSlug || null;
      language = normalizeLang(body?.language);
    } catch {
      // No body or invalid JSON, use defaults
    }

    let selectedIconUrl: string | null = null;

    // If specific icon requested, find it by slug and return with themed name
    if (iconSlug) {
      const { data: specificIcon, error: specificError } = await supabase
        .from('icon_library')
        .select('slug, title, icon_url')
        .eq('slug', iconSlug)
        .single();
      
      if (!specificError && specificIcon?.icon_url) {
        selectedIconUrl = specificIcon.icon_url;
        console.log(`Using requested icon: ${iconSlug}`);
        
        const { name } = generateThemedRoomName(language);
        return new Response(
          JSON.stringify({ name, icon_url: selectedIconUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate themed name and matching icon
    const { name, iconKeyword } = generateThemedRoomName(language);
    
    // Validate name
    if (!validateName(name, language)) {
      console.error(`Invalid generated name: ${name}`);
      const fallback = generateThemedRoomName(language);
      selectedIconUrl = await searchIconByKeyword(supabase, fallback.iconKeyword);
      if (!selectedIconUrl) {
        selectedIconUrl = await getRandomIcon(supabase);
      }
      return new Response(
        JSON.stringify({ name: fallback.name, icon_url: selectedIconUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search for matching icon based on keyword
    selectedIconUrl = await searchIconByKeyword(supabase, iconKeyword);
    
    if (!selectedIconUrl) {
      selectedIconUrl = await getRandomIcon(supabase);
    }

    console.log(`Final result: name="${name}", icon_url="${selectedIconUrl?.substring(0, 50)}..."`);

    return new Response(
      JSON.stringify({ name, icon_url: selectedIconUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating room name:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate room name', name: 'Fun Squad' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
