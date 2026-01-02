// Mapping from quiz category names (Georgian) to icon library categories
export const QUIZ_TO_ICON_CATEGORY: Record<string, string[]> = {
  // Classic categories
  'სპორტი': ['Sports'],
  'კინო': ['Entertainment & Leisure'],
  'მუსიკა': ['Entertainment & Leisure'],
  'გეოგრაფია': ['Places & Structures', 'Countries'],
  'ისტორია': ['History & Culture', 'Historical Figures'],
  'მეცნიერება': ['Space & Science'],
  'ლიტერატურა': ['History & Culture'],
  'ხელოვნება': ['Fashion & Style'],
  'ტექნოლოგია': ['Space & Science'],
  'საჭმელი': ['Food & Cooking'],
  
  // Educational categories
  'ბიოლოგია': ['Animals', 'Space & Science'],
  'ქიმია': ['Space & Science'],
  'მათემატიკა': ['Space & Science'],
  'ფიზიკა': ['Space & Science'],
  'ასტროლოგია': ['Space & Science'],
  'ეკოლოგია': ['Animals', 'Space & Science'],
  'ეკონომიკა': ['Business & Money'],
  'ფსიქოლოგია': ['Space & Science'],
  'მედიცინა': ['Space & Science'],
  'არქეოლოგია': ['History & Culture'],
  'რობოტიკა და AI': ['Space & Science'],
  'თანამედროვე ტექნოლოგიები': ['Space & Science'],
  
  // Fun categories
  'მემები': ['Entertainment & Leisure'],
  'სახალისო ფაქტები': ['Entertainment & Leisure'],
  'მითი თუ რეალობა': ['Entertainment & Leisure'],
  'სერიალები': ['Entertainment & Leisure'],
  'ანიმე': ['Entertainment & Leisure'],
  'სოციალური მედია': ['Entertainment & Leisure'],
  'პაპარაცი': ['Entertainment & Leisure'],
  'მოდა': ['Fashion & Style'],
  'რელიგია': ['History & Culture'],
  'ცხოველები': ['Animals'],
  'ბუნება': ['Animals', 'Places & Structures'],
  'ფერწერა': ['Fashion & Style'],
  'არქიტექტურა': ['Places & Structures'],
  'სამხედრო ისტორია': ['History & Culture', 'Historical Figures'],
  'გეო-ისტორია': ['History & Culture', 'Countries'],
  
  // English fallbacks (in case category names are in English)
  'sports': ['Sports'],
  'cinema': ['Entertainment & Leisure'],
  'movies': ['Entertainment & Leisure'],
  'music': ['Entertainment & Leisure'],
  'geography': ['Places & Structures', 'Countries'],
  'history': ['History & Culture', 'Historical Figures'],
  'science': ['Space & Science'],
  'literature': ['History & Culture'],
  'art': ['Fashion & Style'],
  'technology': ['Space & Science'],
  'food': ['Food & Cooking'],
  'animals': ['Animals'],
  'nature': ['Animals', 'Places & Structures'],
};

// Get icon library categories for a quiz category
export function getIconCategoriesForQuiz(categoryName: string): string[] {
  const normalized = categoryName.toLowerCase().trim();
  
  // Direct match
  if (QUIZ_TO_ICON_CATEGORY[categoryName]) {
    return QUIZ_TO_ICON_CATEGORY[categoryName];
  }
  
  // Lowercase match
  if (QUIZ_TO_ICON_CATEGORY[normalized]) {
    return QUIZ_TO_ICON_CATEGORY[normalized];
  }
  
  // Partial match
  for (const [key, value] of Object.entries(QUIZ_TO_ICON_CATEGORY)) {
    if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
      return value;
    }
  }
  
  // Default fallback
  return ['Entertainment & Leisure'];
}
