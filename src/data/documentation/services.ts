// Services Documentation
// Documents all service files that handle business logic

export interface ServiceMethod {
  name: string;
  description: string;
  descriptionKa: string;
  params?: string;
  returns: string;
}

export interface ServiceDoc {
  name: string;
  category: string;
  categoryKa: string;
  description: string;
  descriptionKa: string;
  filePath: string;
  methods: ServiceMethod[];
  dependencies?: string[];
}

// ============= CORE SERVICES =============

export const SERVICE_QUESTION: ServiceDoc = {
  name: 'questionService',
  category: 'Core',
  categoryKa: 'მთავარი',
  description: 'The Golden Standard for question fetching. Unified pipeline used by all game modes to fetch trivia questions with proper filtering, validation, and seen tracking.',
  descriptionKa: 'ოქროს სტანდარტი კითხვების მისაღებად. ერთიანი პაიპლაინი, რომელსაც იყენებს ყველა თამაშის რეჟიმი ტრივია კითხვების მისაღებად სწორი ფილტრაციით, ვალიდაციით და ნანახების თვალყურის დევნებით.',
  filePath: 'src/services/questionService.ts',
  methods: [
    {
      name: 'getQuestionsForGame',
      description: 'Fetches questions for a game session with all filters applied',
      descriptionKa: 'იღებს კითხვებს თამაშის სესიისთვის ყველა ფილტრით',
      params: '{ categoryId, count, language, levelNumber?, excludeIds? }',
      returns: 'Promise<Question[]>'
    },
    {
      name: 'getQuestionsForCategory',
      description: 'Fetches questions for a specific category mode level',
      descriptionKa: 'იღებს კითხვებს კონკრეტული კატეგორიის რეჟიმის დონისთვის',
      params: '{ categoryId, levelNumber, count, language }',
      returns: 'Promise<Question[]>'
    },
    {
      name: 'getRandomQuestions',
      description: 'Fetches random questions across all categories',
      descriptionKa: 'იღებს რანდომ კითხვებს ყველა კატეგორიიდან',
      params: '{ count, language, excludeIds? }',
      returns: 'Promise<Question[]>'
    },
    {
      name: 'validateQuestionLength',
      description: 'Checks if question/answers meet length requirements',
      descriptionKa: 'ამოწმებს აკმაყოფილებს თუ არა კითხვა/პასუხები სიგრძის მოთხოვნებს',
      params: 'question: Question',
      returns: 'boolean'
    }
  ],
  dependencies: ['@supabase/supabase-js', 'questionTracker']
};

export const SERVICE_QUESTION_TRACKER: ServiceDoc = {
  name: 'questionTracker',
  category: 'Core',
  categoryKa: 'მთავარი',
  description: 'LocalStorage-based tracking of seen questions. Prevents repeating questions within a session and detects when question pool is exhausted.',
  descriptionKa: 'LocalStorage-ზე დაფუძნებული ნანახი კითხვების თვალყურის დევნება. ხელს უშლის კითხვების გამეორებას სესიის ფარგლებში და აღმოაჩენს როცა კითხვების პული ამოწურულია.',
  filePath: 'src/services/questionTracker.ts',
  methods: [
    {
      name: 'markQuestionsAsSeen',
      description: 'Marks question IDs as seen for a category/level',
      descriptionKa: 'მონიშნავს კითხვის ID-ებს როგორც ნანახს კატეგორიისთვის/დონისთვის',
      params: 'categoryId: string, levelNumber: number, questionIds: string[]',
      returns: 'void'
    },
    {
      name: 'getSeenQuestionIds',
      description: 'Gets all seen question IDs for a category/level',
      descriptionKa: 'იღებს ყველა ნანახ კითხვის ID-ს კატეგორიისთვის/დონისთვის',
      params: 'categoryId: string, levelNumber: number',
      returns: 'string[]'
    },
    {
      name: 'isExhausted',
      description: 'Checks if all questions have been seen',
      descriptionKa: 'ამოწმებს ნანახია თუ არა ყველა კითხვა',
      params: 'categoryId: string, levelNumber: number, totalQuestions: number',
      returns: 'boolean'
    },
    {
      name: 'resetCategory',
      description: 'Clears seen tracking for a category',
      descriptionKa: 'ასუფთავებს ნანახების თვალყურის დევნებას კატეგორიისთვის',
      params: 'categoryId: string',
      returns: 'void'
    }
  ]
};

export const SERVICE_MISSION_TRACKER: ServiceDoc = {
  name: 'missionTracker',
  category: 'Core',
  categoryKa: 'მთავარი',
  description: 'Tracks progress towards daily and weekly missions. Increments counters for various user actions.',
  descriptionKa: 'თვალყურს ადევნებს პროგრესს ყოველდღიური და ყოველკვირეული მისიებისკენ. ზრდის მთვლელებს სხვადასხვა მომხმარებლის მოქმედებებისთვის.',
  filePath: 'src/services/missionTracker.ts',
  methods: [
    {
      name: 'trackQuestionAnswered',
      description: 'Tracks a question being answered',
      descriptionKa: 'თვალყურს ადევნებს კითხვაზე პასუხს',
      params: 'isCorrect: boolean, categoryId?: string',
      returns: 'Promise<void>'
    },
    {
      name: 'trackGamePlayed',
      description: 'Tracks a game completion',
      descriptionKa: 'თვალყურს ადევნებს თამაშის დასრულებას',
      params: 'won: boolean, categoryId?: string',
      returns: 'Promise<void>'
    },
    {
      name: 'trackPowerUpUsed',
      description: 'Tracks power-up usage',
      descriptionKa: 'თვალყურს ადევნებს power-up-ის გამოყენებას',
      params: 'powerUpType: string',
      returns: 'Promise<void>'
    },
    {
      name: 'getMissionProgress',
      description: 'Gets current mission progress',
      descriptionKa: 'იღებს მისიის მიმდინარე პროგრესს',
      params: 'missionId: string',
      returns: 'Promise<MissionProgress>'
    }
  ],
  dependencies: ['@supabase/supabase-js', 'useAuth']
};

export const SERVICE_TRACKING: ServiceDoc = {
  name: 'trackingService',
  category: 'Analytics',
  categoryKa: 'ანალიტიკა',
  description: 'Analytics event tracking service. Tracks user actions for analytics and debugging.',
  descriptionKa: 'ანალიტიკის ივენთების თვალყურის დევნების სერვისი. თვალყურს ადევნებს მომხმარებლის მოქმედებებს ანალიტიკისა და დებაგინგისთვის.',
  filePath: 'src/services/trackingService.ts',
  methods: [
    {
      name: 'trackEvent',
      description: 'Tracks a generic event',
      descriptionKa: 'თვალყურს ადევნებს ზოგად ივენთს',
      params: 'eventName: string, properties?: object',
      returns: 'void'
    },
    {
      name: 'trackPageView',
      description: 'Tracks a page view',
      descriptionKa: 'თვალყურს ადევნებს გვერდის ნახვას',
      params: 'pageName: string',
      returns: 'void'
    },
    {
      name: 'trackGameStart',
      description: 'Tracks game start event',
      descriptionKa: 'თვალყურს ადევნებს თამაშის დაწყების ივენთს',
      params: 'gameType: string, categoryId?: string',
      returns: 'void'
    },
    {
      name: 'trackPurchase',
      description: 'Tracks purchase event',
      descriptionKa: 'თვალყურს ადევნებს შესყიდვის ივენთს',
      params: 'productId: string, amount: number',
      returns: 'void'
    }
  ]
};

export const SERVICE_AD: ServiceDoc = {
  name: 'adService',
  category: 'Monetization',
  categoryKa: 'მონეტიზაცია',
  description: 'AdMob integration for rewarded video ads. Shows ads in exchange for coins or extra plays.',
  descriptionKa: 'AdMob ინტეგრაცია ჯილდოიანი ვიდეო რეკლამებისთვის. აჩვენებს რეკლამებს მონეტების ან დამატებითი თამაშების სანაცვლოდ.',
  filePath: 'src/services/adService.ts',
  methods: [
    {
      name: 'initialize',
      description: 'Initializes AdMob SDK',
      descriptionKa: 'ინიციალიზებს AdMob SDK-ს',
      params: '',
      returns: 'Promise<void>'
    },
    {
      name: 'showRewardedAd',
      description: 'Shows a rewarded video ad',
      descriptionKa: 'აჩვენებს ჯილდოიან ვიდეო რეკლამას',
      params: 'rewardType: string',
      returns: 'Promise<{ rewarded: boolean, amount: number }>'
    },
    {
      name: 'isAdReady',
      description: 'Checks if an ad is loaded and ready',
      descriptionKa: 'ამოწმებს ჩატვირთულია თუ არა რეკლამა და მზადაა',
      params: '',
      returns: 'boolean'
    },
    {
      name: 'preloadAd',
      description: 'Preloads an ad for faster display',
      descriptionKa: 'წინასწარ ტვირთავს რეკლამას უფრო სწრაფი ჩვენებისთვის',
      params: '',
      returns: 'Promise<void>'
    }
  ],
  dependencies: ['@capacitor-community/admob']
};

// Export all services
export const ALL_SERVICES: ServiceDoc[] = [
  SERVICE_QUESTION,
  SERVICE_QUESTION_TRACKER,
  SERVICE_MISSION_TRACKER,
  SERVICE_TRACKING,
  SERVICE_AD,
];

// Service categories for navigation
export const SERVICE_CATEGORIES = [
  { id: 'core', name: 'Core', nameKa: 'მთავარი' },
  { id: 'analytics', name: 'Analytics', nameKa: 'ანალიტიკა' },
  { id: 'monetization', name: 'Monetization', nameKa: 'მონეტიზაცია' },
];
