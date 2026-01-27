export interface PresetCategory {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
}

// Extended theme types for more specific question phrasing
export type ThemeType = 
  | 'people' | 'cities' | 'countries' | 'companies' | 'landmarks' | 'animals' | 'sports'
  | 'athletes' | 'footballers' | 'basketballers' | 'tennis_players'
  | 'painters' | 'paintings' | 'sculptors' | 'artworks'
  | 'scientists' | 'historical_figures'
  | 'musicians' | 'composers' | 'singers'
  | 'actors' | 'directors' | 'entertainers'
  | 'flags'
  | 'generic';

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: 'people',
    label: 'ადამიანები',
    icon: 'users',
    keywords: [
      'Albert Einstein', 'Isaac Newton', 'Marie Curie', 'Nikola Tesla', 'Galileo Galilei',
      'Charles Darwin', 'Stephen Hawking', 'Richard Feynman', 'Niels Bohr', 'Max Planck',
      'Elon Musk', 'Bill Gates', 'Steve Jobs', 'Jeff Bezos', 'Mark Zuckerberg',
      'Larry Page', 'Sergey Brin', 'Tim Cook', 'Satya Nadella', 'Jack Dorsey',
      'Leonardo da Vinci', 'Pablo Picasso', 'Vincent van Gogh', 'Michelangelo', 'Salvador Dalí',
      'Claude Monet', 'Rembrandt', 'Andy Warhol', 'Frida Kahlo', 'Jackson Pollock',
      'Wolfgang Amadeus Mozart', 'Ludwig van Beethoven', 'Michael Jackson', 'Freddie Mercury', 'Elvis Presley',
      'The Beatles', 'Bob Marley', 'David Bowie', 'Prince', 'Madonna',
      'Napoleon Bonaparte', 'Winston Churchill', 'Mahatma Gandhi', 'Nelson Mandela', 'Abraham Lincoln',
      'Martin Luther King Jr.', 'John F. Kennedy', 'Franklin D. Roosevelt', 'Theodore Roosevelt', 'George Washington',
      'Tom Hanks', 'Leonardo DiCaprio', 'Meryl Streep', 'Morgan Freeman', 'Robert De Niro',
      'Brad Pitt', 'Angelina Jolie', 'Johnny Depp', 'Scarlett Johansson', 'Denzel Washington',
    ],
  },
  {
    id: 'cities',
    label: 'ქალაქები',
    icon: 'building-2',
    keywords: [
      'Paris', 'London', 'Rome', 'Barcelona', 'Berlin', 'Amsterdam', 'Vienna', 'Prague',
      'Athens', 'Budapest', 'Lisbon', 'Dublin', 'Stockholm', 'Copenhagen', 'Warsaw',
      'New York City', 'Los Angeles', 'Chicago', 'San Francisco', 'Miami', 'Las Vegas',
      'Toronto', 'Vancouver', 'Mexico City', 'Rio de Janeiro', 'Buenos Aires', 'São Paulo',
      'Tokyo', 'Beijing', 'Shanghai', 'Hong Kong', 'Singapore', 'Seoul', 'Bangkok',
      'Mumbai', 'Delhi', 'Dubai', 'Istanbul', 'Kuala Lumpur', 'Jakarta', 'Manila',
      'Sydney', 'Melbourne', 'Auckland', 'Cape Town', 'Cairo', 'Marrakech',
    ],
  },
  {
    id: 'countries',
    label: 'ქვეყნები',
    icon: 'flag',
    keywords: [
      'France', 'Germany', 'Italy', 'Spain', 'United Kingdom', 'Netherlands', 'Belgium',
      'Switzerland', 'Austria', 'Poland', 'Portugal', 'Greece', 'Sweden', 'Norway', 'Denmark',
      'United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Colombia', 'Chile',
      'Japan', 'China', 'South Korea', 'India', 'Thailand', 'Vietnam', 'Indonesia',
      'Philippines', 'Malaysia', 'Singapore', 'United Arab Emirates', 'Saudi Arabia', 'Israel', 'Turkey',
      'Australia', 'New Zealand', 'South Africa', 'Egypt', 'Morocco', 'Nigeria', 'Kenya',
    ],
  },
  {
    id: 'companies',
    label: 'კომპანიები',
    icon: 'briefcase',
    keywords: [
      'Apple', 'Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix', 'Tesla', 'SpaceX',
      'Intel', 'IBM', 'Oracle', 'Adobe', 'Salesforce', 'Nvidia', 'Samsung',
      'Coca-Cola', 'Pepsi', 'McDonalds', 'Starbucks', 'Nike', 'Adidas', 'IKEA',
      'Mercedes-Benz', 'BMW', 'Toyota', 'Ferrari', 'Porsche', 'Lamborghini', 'Ford',
      'Visa', 'Mastercard', 'PayPal', 'JPMorgan Chase', 'Goldman Sachs',
      'Disney', 'Warner Bros', 'Sony', 'Nintendo', 'Spotify', 'YouTube',
    ],
  },
  {
    id: 'landmarks',
    label: 'ღირსშესანიშნაობები',
    icon: 'landmark',
    keywords: [
      'Eiffel Tower', 'Statue of Liberty', 'Colosseum', 'Taj Mahal', 'Great Wall of China',
      'Machu Picchu', 'Petra', 'Christ the Redeemer', 'Pyramids of Giza', 'Stonehenge',
      'Big Ben', 'Sydney Opera House', 'Burj Khalifa', 'Leaning Tower of Pisa', 'Acropolis',
      'Hagia Sophia', 'Notre-Dame de Paris', 'Angkor Wat', 'Mount Rushmore', 'Golden Gate Bridge',
      'Empire State Building', 'Tower Bridge', 'Brandenburg Gate', 'Arc de Triomphe', 'Sagrada Familia',
      'Great Sphinx of Giza', 'Neuschwanstein Castle', 'Chichen Itza', 'Alhambra', 'St Peters Basilica',
    ],
  },
  {
    id: 'animals',
    label: 'ცხოველები',
    icon: 'paw-print',
    keywords: [
      'Lion', 'Tiger', 'Elephant', 'Giraffe', 'Zebra', 'Gorilla', 'Chimpanzee',
      'Panda', 'Polar Bear', 'Wolf', 'Fox', 'Dolphin', 'Whale', 'Kangaroo', 'Koala',
      'Eagle', 'Owl', 'Penguin', 'Flamingo', 'Peacock', 'Parrot', 'Hummingbird',
      'Crocodile', 'Snake', 'Turtle', 'Shark', 'Octopus', 'Jellyfish', 'Butterfly',
    ],
  },
  {
    id: 'sports',
    label: 'სპორტი',
    icon: 'trophy',
    keywords: [
      'Lionel Messi', 'Cristiano Ronaldo', 'Michael Jordan', 'Muhammad Ali', 'Usain Bolt',
      'Serena Williams', 'Roger Federer', 'Tiger Woods', 'LeBron James', 'Kobe Bryant',
      'Neymar', 'Kylian Mbappé', 'Rafael Nadal', 'Novak Djokovic', 'Tom Brady',
      'Michael Phelps', 'Simone Biles', 'Lewis Hamilton', 'Max Verstappen', 'Wayne Gretzky',
      'Diego Maradona', 'Pelé', 'Zinedine Zidane', 'Ronaldinho', 'David Beckham',
      'Mike Tyson', 'Floyd Mayweather', 'Conor McGregor', 'Shaquille ONeal', 'Stephen Curry',
    ],
  },
];

// Theme detection keywords (supports Georgian and English)
const themeKeywords: Record<ThemeType, string[]> = {
  // Original themes
  people: ['ადამიან', 'person', 'people', 'ცნობილ', 'famous'],
  cities: ['ქალაქ', 'city', 'cities', 'urban', 'დედაქალაქ', 'capital'],
  countries: ['ქვეყან', 'country', 'countries', 'nation', 'სახელმწიფო', 'state'],
  companies: ['კომპანი', 'company', 'companies', 'brand', 'ბრენდ', 'ლოგო', 'logo', 'ბიზნეს', 'business'],
  landmarks: ['ღირსშესანიშნაობ', 'landmark', 'monument', 'ძეგლ', 'არქიტექტურ', 'architecture', 'შენობ', 'building'],
  animals: ['ცხოველ', 'animal', 'ფრინველ', 'bird', 'თევზ', 'fish', 'ძუძუმწოვარ', 'mammal'],
  sports: ['სპორტ', 'sport', 'sports'],
  
  // Extended athlete themes
  athletes: ['ათლეტ', 'athlete', 'სპორტსმენ', 'sportsman', 'sportspeople'],
  footballers: ['ფეხბურთ', 'football', 'soccer', 'footballer'],
  basketballers: ['კალათბურთ', 'basketball', 'basketballer'],
  tennis_players: ['ტენის', 'tennis'],
  
  // Art themes
  painters: ['მხატვ', 'painter', 'artist'],
  paintings: ['ნახატ', 'painting', 'artwork'],
  sculptors: ['მოქანდაკე', 'sculptor'],
  artworks: ['ხელოვნება', 'art', 'museum', 'gallery', 'მუზეუმ'],
  
  // Other themes
  scientists: ['მეცნიერ', 'scientist', 'physics', 'chemistry', 'ფიზიკ', 'ქიმია'],
  historical_figures: ['ისტორი', 'history', 'historical'],
  musicians: ['მუსიკ', 'music', 'მომღერ', 'singer'],
  composers: ['კომპოზიტორ', 'composer'],
  singers: ['მომღერალ', 'vocalist'],
  actors: ['მსახიობ', 'actor', 'actress'],
  directors: ['რეჟისორ', 'director'],
  entertainers: ['კინო', 'cinema', 'movie', 'film', 'ფილმ', 'hollywood'],
  flags: ['დროშ', 'flag', 'flags'],
  
  generic: []
};

export function detectThemeFromCategoryName(categoryName: string): ThemeType {
  const name = categoryName.toLowerCase();
  
  // Check extended themes first (more specific)
  const extendedThemes: ThemeType[] = [
    'footballers', 'basketballers', 'tennis_players', 'athletes',
    'painters', 'paintings', 'sculptors', 'artworks',
    'scientists', 'historical_figures',
    'musicians', 'composers', 'singers',
    'actors', 'directors', 'entertainers',
    'flags'
  ];
  
  for (const theme of extendedThemes) {
    if (themeKeywords[theme].some(kw => name.includes(kw))) {
      return theme;
    }
  }
  
  // Check original themes
  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (theme === 'generic') continue;
    if (keywords.some(kw => name.includes(kw))) {
      return theme as ThemeType;
    }
  }
  
  return 'generic';
}

// Extended question templates for all theme types
const questionTemplates: Record<ThemeType, Record<'text' | 'image', string>> = {
  // Original themes
  people: { image: 'ვინ არის ეს?', text: 'ვინ არის?' },
  cities: { image: 'რომელი ქალაქია?', text: 'რომელი ქალაქია?' },
  countries: { image: 'რომელი ქვეყანაა?', text: 'რომელი ქვეყანაა?' },
  companies: { image: 'რომელი კომპანიაა?', text: 'რომელი კომპანიაა?' },
  landmarks: { image: 'რომელი ღირსშესანიშნაობაა?', text: 'რომელი ადგილია?' },
  animals: { image: 'რომელი ცხოველია?', text: 'რომელი ცხოველია?' },
  sports: { image: 'ვინ არის ეს სპორტსმენი?', text: 'ვინ არის ეს სპორტსმენი?' },
  
  // Extended athlete themes
  athletes: { image: 'ვინ არის ეს სპორტსმენი?', text: 'ვინ არის ეს სპორტსმენი?' },
  footballers: { image: 'ვინ არის ეს ფეხბურთელი?', text: 'ვინ არის ეს ფეხბურთელი?' },
  basketballers: { image: 'ვინ არის ეს კალათბურთელი?', text: 'ვინ არის ეს კალათბურთელი?' },
  tennis_players: { image: 'ვინ არის ეს ტენისისტი?', text: 'ვინ არის ეს ტენისისტი?' },
  
  // Art themes
  painters: { image: 'ვინ არის ეს მხატვარი?', text: 'ვინ არის ეს მხატვარი?' },
  paintings: { image: 'ვინ დახატა ეს ნახატი?', text: 'ვინ დახატა?' },
  sculptors: { image: 'ვინ არის ეს მოქანდაკე?', text: 'ვინ არის ეს მოქანდაკე?' },
  artworks: { image: 'ვინ შექმნა ეს ნაწარმოები?', text: 'ვინ შექმნა?' },
  
  // Other themes
  scientists: { image: 'ვინ არის ეს მეცნიერი?', text: 'ვინ არის ეს მეცნიერი?' },
  historical_figures: { image: 'ვინ არის ეს ისტორიული პიროვნება?', text: 'ვინ არის?' },
  musicians: { image: 'ვინ არის ეს მუსიკოსი?', text: 'ვინ არის ეს მუსიკოსი?' },
  composers: { image: 'ვინ არის ეს კომპოზიტორი?', text: 'ვინ არის ეს კომპოზიტორი?' },
  singers: { image: 'ვინ არის ეს მომღერალი?', text: 'ვინ არის ეს მომღერალი?' },
  actors: { image: 'ვინ არის ეს მსახიობი?', text: 'ვინ არის ეს მსახიობი?' },
  directors: { image: 'ვინ არის ეს რეჟისორი?', text: 'ვინ არის ეს რეჟისორი?' },
  entertainers: { image: 'ვინ არის ეს?', text: 'ვინ არის?' },
  flags: { image: 'რომელი ქვეყნის დროშაა?', text: 'რომელი ქვეყნის დროშაა?' },
  
  generic: { image: 'რა არის ეს?', text: 'დაასახელეთ:' }
};

export function getQuestionText(theme: ThemeType, questionType: 'text' | 'image'): string {
  return questionTemplates[theme]?.[questionType] || questionTemplates.generic[questionType];
}

export function getSuggestionsForCategory(categoryName: string): string[] {
  const theme = detectThemeFromCategoryName(categoryName);
  
  // Only return suggestions if we have a matching theme
  if (theme === 'generic') {
    return []; // No suggestions for unknown categories
  }
  
  // Map extended themes back to preset categories
  const themeToPreset: Record<ThemeType, string> = {
    people: 'people',
    cities: 'cities',
    countries: 'countries',
    companies: 'companies',
    landmarks: 'landmarks',
    animals: 'animals',
    sports: 'sports',
    athletes: 'sports',
    footballers: 'sports',
    basketballers: 'sports',
    tennis_players: 'sports',
    painters: 'people',
    paintings: 'people',
    sculptors: 'people',
    artworks: 'people',
    scientists: 'people',
    historical_figures: 'people',
    musicians: 'people',
    composers: 'people',
    singers: 'people',
    actors: 'people',
    directors: 'people',
    entertainers: 'people',
    flags: 'countries',
    generic: 'people'
  };
  
  const presetId = themeToPreset[theme];
  const preset = PRESET_CATEGORIES.find(c => c.id === presetId);
  
  if (preset) {
    const shuffled = [...preset.keywords].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }
  
  return [];
}
