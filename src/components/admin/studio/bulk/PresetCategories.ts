export interface PresetCategory {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: 'people',
    label: 'ადამიანები',
    icon: 'users',
    keywords: [
      // Scientists
      "Albert Einstein", "Isaac Newton", "Marie Curie", "Nikola Tesla", "Galileo Galilei",
      "Charles Darwin", "Stephen Hawking", "Richard Feynman", "Carl Sagan", "Neil deGrasse Tyson",
      // Tech Leaders
      "Elon Musk", "Bill Gates", "Steve Jobs", "Jeff Bezos", "Mark Zuckerberg",
      "Sundar Pichai", "Tim Cook", "Satya Nadella", "Jack Dorsey", "Larry Page",
      // Artists
      "Leonardo da Vinci", "Pablo Picasso", "Vincent van Gogh", "Michelangelo", "Claude Monet",
      "Salvador Dalí", "Frida Kahlo", "Andy Warhol", "Rembrandt", "Johannes Vermeer",
      // Musicians
      "Wolfgang Amadeus Mozart", "Ludwig van Beethoven", "Johann Sebastian Bach",
      "Michael Jackson", "Freddie Mercury", "Elvis Presley", "The Beatles",
      "Madonna", "Prince", "Whitney Houston",
      // Leaders
      "Napoleon Bonaparte", "Winston Churchill", "Mahatma Gandhi", "Nelson Mandela",
      "Martin Luther King Jr.", "Abraham Lincoln", "George Washington", "Cleopatra",
      "Julius Caesar", "Alexander the Great",
      // Athletes
      "Lionel Messi", "Cristiano Ronaldo", "Michael Jordan", "Muhammad Ali",
      "Serena Williams", "Roger Federer", "Usain Bolt", "LeBron James",
      "Pelé", "Diego Maradona",
      // Actors
      "Leonardo DiCaprio", "Tom Hanks", "Meryl Streep", "Morgan Freeman",
      "Scarlett Johansson", "Robert Downey Jr.", "Brad Pitt", "Angelina Jolie",
      "Denzel Washington", "Johnny Depp"
    ]
  },
  {
    id: 'cities',
    label: 'ქალაქები',
    icon: 'building-2',
    keywords: [
      // Europe
      "Paris", "London", "Rome", "Barcelona", "Amsterdam", "Berlin", "Vienna",
      "Prague", "Venice", "Florence", "Athens", "Lisbon", "Madrid", "Dublin",
      "Budapest", "Stockholm", "Copenhagen", "Oslo", "Helsinki", "Warsaw",
      // Americas
      "New York City", "Los Angeles", "Chicago", "Miami", "San Francisco",
      "Toronto", "Vancouver", "Mexico City", "Buenos Aires", "Rio de Janeiro",
      "São Paulo", "Lima", "Bogotá", "Santiago",
      // Asia
      "Tokyo", "Beijing", "Shanghai", "Hong Kong", "Singapore", "Seoul",
      "Bangkok", "Mumbai", "Delhi", "Dubai", "Istanbul", "Jerusalem",
      "Kyoto", "Osaka", "Taipei",
      // Oceania & Africa
      "Sydney", "Melbourne", "Auckland", "Cape Town", "Cairo", "Marrakech",
      "Nairobi", "Lagos", "Casablanca"
    ]
  },
  {
    id: 'countries',
    label: 'ქვეყნები',
    icon: 'flag',
    keywords: [
      // Europe
      "France", "Germany", "Italy", "Spain", "United Kingdom", "Netherlands",
      "Belgium", "Switzerland", "Austria", "Portugal", "Greece", "Sweden",
      "Norway", "Denmark", "Finland", "Poland", "Czech Republic", "Ireland",
      "Hungary", "Romania", "Ukraine", "Croatia", "Iceland",
      // Americas
      "United States", "Canada", "Mexico", "Brazil", "Argentina", "Chile",
      "Colombia", "Peru", "Venezuela", "Cuba", "Jamaica",
      // Asia
      "Japan", "China", "India", "South Korea", "Thailand", "Vietnam",
      "Indonesia", "Philippines", "Malaysia", "Singapore", "Turkey",
      "Israel", "United Arab Emirates", "Saudi Arabia", "Iran",
      // Oceania
      "Australia", "New Zealand", "Fiji",
      // Africa
      "Egypt", "South Africa", "Morocco", "Kenya", "Nigeria", "Ethiopia",
      "Tanzania", "Ghana"
    ]
  },
  {
    id: 'companies',
    label: 'კომპანიები',
    icon: 'briefcase',
    keywords: [
      // Tech
      "Apple", "Google", "Microsoft", "Amazon", "Meta", "Netflix",
      "Tesla", "NVIDIA", "Intel", "IBM", "Oracle", "Salesforce",
      "Adobe", "Spotify", "Uber", "Airbnb", "Twitter", "LinkedIn",
      // Automotive
      "Mercedes-Benz", "BMW", "Audi", "Volkswagen", "Toyota", "Honda",
      "Ford", "General Motors", "Ferrari", "Lamborghini", "Porsche", "Tesla",
      // Consumer
      "Coca-Cola", "PepsiCo", "McDonald's", "Starbucks", "Nike", "Adidas",
      "Louis Vuitton", "Gucci", "Chanel", "Rolex", "IKEA", "H&M",
      // Finance
      "JPMorgan Chase", "Goldman Sachs", "Visa", "Mastercard", "PayPal",
      // Misc
      "Disney", "Warner Bros", "Sony", "Samsung", "LG", "Huawei"
    ]
  },
  {
    id: 'landmarks',
    label: 'ღირსშესანიშნაობები',
    icon: 'landmark',
    keywords: [
      // Wonders
      "Eiffel Tower", "Statue of Liberty", "Colosseum", "Taj Mahal",
      "Great Wall of China", "Machu Picchu", "Petra", "Christ the Redeemer",
      "Great Pyramid of Giza", "Stonehenge",
      // Towers & Buildings
      "Big Ben", "Empire State Building", "Burj Khalifa", "CN Tower",
      "Sydney Opera House", "Leaning Tower of Pisa", "Space Needle",
      "One World Trade Center", "Shanghai Tower", "Tokyo Skytree",
      // Natural
      "Grand Canyon", "Niagara Falls", "Mount Everest", "Victoria Falls",
      "Great Barrier Reef", "Amazon Rainforest", "Northern Lights",
      // Religious
      "Notre-Dame Cathedral", "St. Peter's Basilica", "Hagia Sophia",
      "Angkor Wat", "Golden Gate Bridge", "Tower Bridge",
      // Palaces
      "Buckingham Palace", "Versailles Palace", "Forbidden City",
      "Neuschwanstein Castle", "Alhambra", "Kremlin"
    ]
  },
  {
    id: 'animals',
    label: 'ცხოველები',
    icon: 'paw-print',
    keywords: [
      // Mammals
      "Lion", "Tiger", "Elephant", "Giraffe", "Zebra", "Gorilla",
      "Chimpanzee", "Kangaroo", "Koala", "Panda", "Polar Bear", "Wolf",
      "Fox", "Deer", "Moose", "Rhinoceros", "Hippopotamus", "Leopard",
      // Birds
      "Eagle", "Owl", "Penguin", "Flamingo", "Peacock", "Parrot",
      "Toucan", "Hummingbird", "Swan", "Pelican",
      // Marine
      "Dolphin", "Whale", "Shark", "Octopus", "Jellyfish", "Sea Turtle",
      "Seahorse", "Starfish", "Orca",
      // Reptiles
      "Crocodile", "Alligator", "Komodo Dragon", "Chameleon", "Iguana",
      "Python", "Cobra", "Turtle", "Tortoise"
    ]
  }
];

export function getCategoryById(id: string): PresetCategory | undefined {
  return PRESET_CATEGORIES.find(c => c.id === id);
}
