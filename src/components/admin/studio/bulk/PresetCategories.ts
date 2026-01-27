export interface PresetCategory {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
}

export type ThemeType = 'people' | 'cities' | 'countries' | 'companies' | 'landmarks' | 'animals' | 'sports' | 'generic';

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

const themeKeywords: Record<ThemeType, string[]> = {
  people: ['ადამიან', 'person', 'people', 'ცნობილ', 'famous', 'მეცნიერ', 'scientist', 'მსახიობ', 'actor', 'მომღერ', 'singer', 'მხატვ', 'artist', 'პოლიტიკოს', 'politician', 'მწერალ', 'writer'],
  cities: ['ქალაქ', 'city', 'cities', 'urban', 'დედაქალაქ', 'capital'],
  countries: ['ქვეყან', 'country', 'countries', 'nation', 'დროშ', 'flag', 'სახელმწიფო', 'state'],
  companies: ['კომპანი', 'company', 'companies', 'brand', 'ბრენდ', 'ლოგო', 'logo', 'ბიზნეს', 'business'],
  landmarks: ['ღირსშესანიშნაობ', 'landmark', 'monument', 'ძეგლ', 'არქიტექტურ', 'architecture', 'შენობ', 'building'],
  animals: ['ცხოველ', 'animal', 'ფრინველ', 'bird', 'თევზ', 'fish', 'ძუძუმწოვარ', 'mammal'],
  sports: ['სპორტ', 'sport', 'sports', 'ფეხბურთ', 'football', 'soccer', 'კალათბურთ', 'basketball', 'ტენის', 'tennis', 'ათლეტ', 'athlete', 'მოთამაშე', 'player', 'ჩემპიონ', 'champion'],
  generic: []
};

export function detectThemeFromCategoryName(categoryName: string): ThemeType {
  const name = categoryName.toLowerCase();
  
  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (theme === 'generic') continue;
    if (keywords.some(kw => name.includes(kw))) {
      return theme as ThemeType;
    }
  }
  
  return 'generic';
}

export function getQuestionText(theme: ThemeType, questionType: 'text' | 'image'): string {
  const templates: Record<ThemeType, Record<'text' | 'image', string>> = {
    people: { image: 'ვინ არის ეს?', text: 'ვინ არის?' },
    cities: { image: 'რომელი ქალაქია?', text: 'რომელი ქალაქია?' },
    countries: { image: 'რომელი ქვეყანაა?', text: 'რომელი ქვეყანაა?' },
    companies: { image: 'რომელი კომპანიაა?', text: 'რომელი კომპანიაა?' },
    landmarks: { image: 'რომელი ღირსშესანიშნაობაა?', text: 'რომელი ადგილია?' },
    animals: { image: 'რომელი ცხოველია?', text: 'რომელი ცხოველია?' },
    sports: { image: 'ვინ არის ეს სპორტსმენი?', text: 'ვინ არის ეს სპორტსმენი?' },
    generic: { image: 'რა არის ეს?', text: 'დაასახელეთ:' }
  };
  
  return templates[theme][questionType];
}

export function getSuggestionsForCategory(categoryName: string): string[] {
  const theme = detectThemeFromCategoryName(categoryName);
  
  // Only return suggestions if we have a matching theme
  if (theme === 'generic') {
    return []; // No suggestions for unknown categories
  }
  
  const preset = PRESET_CATEGORIES.find(c => c.id === theme);
  
  if (preset) {
    const shuffled = [...preset.keywords].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }
  
  return [];
}
