// Edge Functions Documentation
// Documents all 48 Supabase Edge Functions

export interface EdgeFunctionParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
  descriptionKa: string;
}

export interface EdgeFunctionDoc {
  name: string;
  category: string;
  categoryKa: string;
  description: string;
  descriptionKa: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: EdgeFunctionParam[];
  returns: string;
  returnsKa: string;
  requiresAuth: boolean;
  usedBy?: string[];
  externalServices?: string[];
}

// ============= AI GENERATION FUNCTIONS =============

export const FUNC_GENERATE_AVATAR: EdgeFunctionDoc = {
  name: 'generate-avatar',
  category: 'AI Generation',
  categoryKa: 'AI გენერაცია',
  description: 'Generates a custom AI avatar using Lovable AI image generation. Takes a text prompt or source image and creates a stylized avatar.',
  descriptionKa: 'ქმნის მორგებულ AI ავატარს Lovable AI სურათის გენერაციის გამოყენებით. იღებს ტექსტურ პრომფტს ან წყაროს სურათს და ქმნის სტილიზებულ ავატარს.',
  method: 'POST',
  params: [
    { name: 'prompt', type: 'string', required: false, description: 'Text description of desired avatar', descriptionKa: 'სასურველი ავატარის ტექსტური აღწერა' },
    { name: 'sourceImageUrl', type: 'string', required: false, description: 'URL of source image to stylize', descriptionKa: 'სტილიზებული წყაროს სურათის URL' },
    { name: 'style', type: 'string', required: false, description: 'Avatar style preset', descriptionKa: 'ავატარის სტილის პრესეტი' },
  ],
  returns: '{ avatarUrl: string, generationId: string }',
  returnsKa: '{ avatarUrl: string, generationId: string }',
  requiresAuth: true,
  usedBy: ['useAvatarGeneration', 'ProfilePage'],
  externalServices: ['Lovable AI']
};

export const FUNC_ANIMATE_AVATAR: EdgeFunctionDoc = {
  name: 'animate-avatar',
  category: 'AI Generation',
  categoryKa: 'AI გენერაცია',
  description: 'Creates an animated video version of a static avatar using AI video generation.',
  descriptionKa: 'ქმნის სტატიკური ავატარის ანიმაციურ ვიდეო ვერსიას AI ვიდეოს გენერაციის გამოყენებით.',
  method: 'POST',
  params: [
    { name: 'avatarUrl', type: 'string', required: true, description: 'URL of avatar to animate', descriptionKa: 'ანიმაციისთვის ავატარის URL' },
    { name: 'motion', type: 'string', required: false, description: 'Animation style', descriptionKa: 'ანიმაციის სტილი' },
  ],
  returns: '{ videoUrl: string }',
  returnsKa: '{ videoUrl: string }',
  requiresAuth: true,
  usedBy: ['useAvatarGeneration'],
  externalServices: ['Lovable AI']
};

export const FUNC_GENERATE_COVER_IMAGE: EdgeFunctionDoc = {
  name: 'generate-cover-image',
  category: 'AI Generation',
  categoryKa: 'AI გენერაცია',
  description: 'Generates cover images for user-created quizzes based on quiz title and description.',
  descriptionKa: 'ქმნის ფარდის სურათებს მომხმარებლის მიერ შექმნილი ქვიზებისთვის ქვიზის სათაურისა და აღწერის მიხედვით.',
  method: 'POST',
  params: [
    { name: 'title', type: 'string', required: true, description: 'Quiz title', descriptionKa: 'ქვიზის სათაური' },
    { name: 'subject', type: 'string', required: false, description: 'Quiz subject/topic', descriptionKa: 'ქვიზის საგანი/თემა' },
    { name: 'roundId', type: 'string', required: false, description: 'Associated round ID', descriptionKa: 'დაკავშირებული რაუნდის ID' },
  ],
  returns: '{ imageUrl: string }',
  returnsKa: '{ imageUrl: string }',
  requiresAuth: true,
  usedBy: ['CreateTriviaWizard'],
  externalServices: ['Lovable AI']
};

export const FUNC_GENERATE_ROOM_NAME: EdgeFunctionDoc = {
  name: 'generate-room-name',
  category: 'AI Generation',
  categoryKa: 'AI გენერაცია',
  description: 'Generates creative Georgian room names using AI. Used when creating new game rooms.',
  descriptionKa: 'ქმნის კრეატიულ ქართულ ოთახის სახელებს AI-ის გამოყენებით. გამოიყენება ახალი თამაშის ოთახების შექმნისას.',
  method: 'POST',
  params: [
    { name: 'theme', type: 'string', required: false, description: 'Optional theme hint', descriptionKa: 'არასავალდებულო თემის მინიშნება' },
  ],
  returns: '{ name: string }',
  returnsKa: '{ name: string }',
  requiresAuth: true,
  usedBy: ['CreateRoomScreen'],
  externalServices: ['Lovable AI']
};

// ============= QUIZ GENERATION FUNCTIONS =============

export const FUNC_GENERATE_CATEGORY_TRIVIA: EdgeFunctionDoc = {
  name: 'generate-category-trivia',
  category: 'Quiz Generation',
  categoryKa: 'ქვიზის გენერაცია',
  description: 'Bulk generates trivia questions for a specific category using AI. Used by admin for content creation.',
  descriptionKa: 'მასობრივად ქმნის ტრივია კითხვებს კონკრეტული კატეგორიისთვის AI-ის გამოყენებით. გამოიყენება ადმინის მიერ კონტენტის შესაქმნელად.',
  method: 'POST',
  params: [
    { name: 'categoryId', type: 'string', required: true, description: 'Target category', descriptionKa: 'სამიზნე კატეგორია' },
    { name: 'count', type: 'number', required: true, description: 'Number of questions', descriptionKa: 'კითხვების რაოდენობა' },
    { name: 'difficulty', type: 'string', required: false, description: 'easy, medium, hard', descriptionKa: 'easy, medium, hard' },
    { name: 'language', type: 'string', required: false, description: 'Target language', descriptionKa: 'სამიზნე ენა' },
  ],
  returns: '{ questions: Question[], generated: number }',
  returnsKa: '{ questions: Question[], generated: number }',
  requiresAuth: true,
  usedBy: ['AdminAIGenerations'],
  externalServices: ['Lovable AI']
};

export const FUNC_GENERATE_CUSTOM_QUIZ: EdgeFunctionDoc = {
  name: 'generate-custom-quiz',
  category: 'Quiz Generation',
  categoryKa: 'ქვიზის გენერაცია',
  description: 'Generates a quiz from custom content (URL, text, or topic). Used for user-generated content.',
  descriptionKa: 'ქმნის ქვიზს მორგებული კონტენტიდან (URL, ტექსტი ან თემა). გამოიყენება მომხმარებლის მიერ შექმნილი კონტენტისთვის.',
  method: 'POST',
  params: [
    { name: 'url', type: 'string', required: false, description: 'Source URL to parse', descriptionKa: 'გასაანალიზებელი წყაროს URL' },
    { name: 'text', type: 'string', required: false, description: 'Source text content', descriptionKa: 'წყაროს ტექსტური კონტენტი' },
    { name: 'topic', type: 'string', required: false, description: 'Topic to generate about', descriptionKa: 'თემა გენერაციისთვის' },
    { name: 'questionCount', type: 'number', required: false, description: 'Number of questions', descriptionKa: 'კითხვების რაოდენობა' },
  ],
  returns: '{ questions: Question[], title: string, description: string }',
  returnsKa: '{ questions: Question[], title: string, description: string }',
  requiresAuth: true,
  usedBy: ['CreateTriviaWizard'],
  externalServices: ['Lovable AI']
};

export const FUNC_PARSE_QUIZ_URL: EdgeFunctionDoc = {
  name: 'parse-quiz-url',
  category: 'Quiz Generation',
  categoryKa: 'ქვიზის გენერაცია',
  description: 'Fetches and parses content from a URL to extract quiz-worthy information.',
  descriptionKa: 'იღებს და აანალიზებს კონტენტს URL-დან ქვიზისთვის ღირებული ინფორმაციის ამოსაღებად.',
  method: 'POST',
  params: [
    { name: 'url', type: 'string', required: true, description: 'URL to parse', descriptionKa: 'გასაანალიზებელი URL' },
  ],
  returns: '{ title: string, content: string, metadata: object }',
  returnsKa: '{ title: string, content: string, metadata: object }',
  requiresAuth: true,
  usedBy: ['CreateTriviaWizard'],
  externalServices: []
};

// ============= ICON MANAGEMENT FUNCTIONS =============

export const FUNC_SUGGEST_ICONS: EdgeFunctionDoc = {
  name: 'suggest-icons',
  category: 'Icon Management',
  categoryKa: 'ხატულების მართვა',
  description: 'AI-powered icon suggestions for questions based on content analysis.',
  descriptionKa: 'AI-ით მართული ხატულების შემოთავაზებები კითხვებისთვის კონტენტის ანალიზის საფუძველზე.',
  method: 'POST',
  params: [
    { name: 'questionText', type: 'string', required: true, description: 'Question to analyze', descriptionKa: 'გასაანალიზებელი კითხვა' },
    { name: 'correctAnswer', type: 'string', required: true, description: 'Correct answer', descriptionKa: 'სწორი პასუხი' },
    { name: 'category', type: 'string', required: false, description: 'Question category', descriptionKa: 'კითხვის კატეგორია' },
  ],
  returns: '{ suggestions: IconSuggestion[] }',
  returnsKa: '{ suggestions: IconSuggestion[] }',
  requiresAuth: true,
  usedBy: ['IconAssignment', 'smart-assign-icons'],
  externalServices: ['Lovable AI']
};

export const FUNC_SMART_ASSIGN_ICONS: EdgeFunctionDoc = {
  name: 'smart-assign-icons',
  category: 'Icon Management',
  categoryKa: 'ხატულების მართვა',
  description: 'Automatically assigns icons to questions using semantic matching and AI analysis.',
  descriptionKa: 'ავტომატურად ანიჭებს ხატულებს კითხვებს სემანტიკური შესაბამისობისა და AI ანალიზის გამოყენებით.',
  method: 'POST',
  params: [
    { name: 'questionIds', type: 'string[]', required: false, description: 'Specific questions to process', descriptionKa: 'კონკრეტული კითხვები დასამუშავებლად' },
    { name: 'categoryId', type: 'string', required: false, description: 'Process entire category', descriptionKa: 'დაამუშავე მთელი კატეგორია' },
    { name: 'dryRun', type: 'boolean', required: false, description: 'Preview without saving', descriptionKa: 'გადახედვა შენახვის გარეშე' },
  ],
  returns: '{ assigned: number, skipped: number, results: AssignmentResult[] }',
  returnsKa: '{ assigned: number, skipped: number, results: AssignmentResult[] }',
  requiresAuth: true,
  usedBy: ['IconAssignment'],
  externalServices: ['Lovable AI']
};

export const FUNC_VERIFY_ICONS: EdgeFunctionDoc = {
  name: 'verify-icons',
  category: 'Icon Management',
  categoryKa: 'ხატულების მართვა',
  description: 'Checks icon URLs for validity and accessibility. Identifies broken icons.',
  descriptionKa: 'ამოწმებს ხატულების URL-ებს ვალიდურობისა და ხელმისაწვდომობისთვის. ადგენს გაფუჭებულ ხატულებს.',
  method: 'POST',
  params: [
    { name: 'limit', type: 'number', required: false, description: 'Max icons to check', descriptionKa: 'შესამოწმებელი ხატულების მაქსიმუმი' },
  ],
  returns: '{ verified: number, broken: number, results: VerificationResult[] }',
  returnsKa: '{ verified: number, broken: number, results: VerificationResult[] }',
  requiresAuth: true,
  usedBy: ['useIconVerification', 'FixIcons']
};

// ============= QUESTION QUALITY FUNCTIONS =============

export const FUNC_SCAN_QUESTION_QUALITY: EdgeFunctionDoc = {
  name: 'scan-question-quality',
  category: 'Question Quality',
  categoryKa: 'კითხვის ხარისხი',
  description: 'AI-powered quality analysis of questions. Checks grammar, accuracy, and clarity.',
  descriptionKa: 'AI-ით მართული კითხვების ხარისხის ანალიზი. ამოწმებს გრამატიკას, სიზუსტეს და სიცხადეს.',
  method: 'POST',
  params: [
    { name: 'questionIds', type: 'string[]', required: false, description: 'Specific questions to scan', descriptionKa: 'კონკრეტული კითხვები სკანირებისთვის' },
    { name: 'categoryId', type: 'string', required: false, description: 'Scan entire category', descriptionKa: 'სკანირება მთელი კატეგორიისთვის' },
  ],
  returns: '{ scanned: number, issues: QualityIssue[] }',
  returnsKa: '{ scanned: number, issues: QualityIssue[] }',
  requiresAuth: true,
  usedBy: ['QuestionTools'],
  externalServices: ['Lovable AI']
};

export const FUNC_SHORTEN_QUESTIONS: EdgeFunctionDoc = {
  name: 'shorten-questions',
  category: 'Question Quality',
  categoryKa: 'კითხვის ხარისხი',
  description: 'AI rewrites questions to be shorter while preserving meaning. Targets questions over character limit.',
  descriptionKa: 'AI ხელახლა წერს კითხვებს უფრო მოკლედ მნიშვნელობის შენარჩუნებით. მიზნად ისახავს კითხვებს სიმბოლოების ლიმიტზე მეტით.',
  method: 'POST',
  params: [
    { name: 'questionIds', type: 'string[]', required: true, description: 'Questions to shorten', descriptionKa: 'კითხვები შესამოკლებლად' },
    { name: 'maxLength', type: 'number', required: false, description: 'Target max length', descriptionKa: 'სამიზნე მაქსიმალური სიგრძე' },
  ],
  returns: '{ shortened: number, results: ShortenResult[] }',
  returnsKa: '{ shortened: number, results: ShortenResult[] }',
  requiresAuth: true,
  usedBy: ['QuestionTools'],
  externalServices: ['Lovable AI']
};

export const FUNC_TRANSLATE_QUESTIONS: EdgeFunctionDoc = {
  name: 'translate-questions',
  category: 'Question Quality',
  categoryKa: 'კითხვის ხარისხი',
  description: 'Translates questions between Georgian and English while maintaining quiz format.',
  descriptionKa: 'თარგმნის კითხვებს ქართულსა და ინგლისურს შორის ქვიზის ფორმატის შენარჩუნებით.',
  method: 'POST',
  params: [
    { name: 'questionIds', type: 'string[]', required: true, description: 'Questions to translate', descriptionKa: 'კითხვები სათარგმნად' },
    { name: 'targetLanguage', type: 'string', required: true, description: 'ka or en', descriptionKa: 'ka ან en' },
  ],
  returns: '{ translated: number, results: TranslationResult[] }',
  returnsKa: '{ translated: number, results: TranslationResult[] }',
  requiresAuth: true,
  usedBy: ['QuestionTools'],
  externalServices: ['Lovable AI']
};

// ============= PAYMENT FUNCTIONS =============

export const FUNC_CREATE_GEM_CHECKOUT: EdgeFunctionDoc = {
  name: 'create-gem-checkout',
  category: 'Payments',
  categoryKa: 'გადახდები',
  description: 'Creates a Stripe checkout session for gem purchases. Returns URL to redirect user.',
  descriptionKa: 'ქმნის Stripe checkout სესიას ლალების შესაძენად. აბრუნებს URL-ს მომხმარებლის გადამისამართებისთვის.',
  method: 'POST',
  params: [
    { name: 'productId', type: 'string', required: true, description: 'Gem package ID', descriptionKa: 'ლალების პაკეტის ID' },
    { name: 'successUrl', type: 'string', required: false, description: 'Redirect on success', descriptionKa: 'გადამისამართება წარმატებისას' },
    { name: 'cancelUrl', type: 'string', required: false, description: 'Redirect on cancel', descriptionKa: 'გადამისამართება გაუქმებისას' },
  ],
  returns: '{ sessionId: string, url: string }',
  returnsKa: '{ sessionId: string, url: string }',
  requiresAuth: true,
  usedBy: ['useGemPurchase', 'GemShop'],
  externalServices: ['Stripe']
};

export const FUNC_STRIPE_GEM_WEBHOOK: EdgeFunctionDoc = {
  name: 'stripe-gem-webhook',
  category: 'Payments',
  categoryKa: 'გადახდები',
  description: 'Stripe webhook handler for gem purchase completion. Updates user gems on successful payment.',
  descriptionKa: 'Stripe webhook handler ლალების შესყიდვის დასრულებისთვის. განაახლებს მომხმარებლის ლალებს წარმატებული გადახდისას.',
  method: 'POST',
  params: [
    { name: 'stripe-signature', type: 'header', required: true, description: 'Stripe signature for verification', descriptionKa: 'Stripe ხელმოწერა ვერიფიკაციისთვის' },
  ],
  returns: '{ received: true }',
  returnsKa: '{ received: true }',
  requiresAuth: false,
  usedBy: [],
  externalServices: ['Stripe']
};

export const FUNC_VERIFY_RECEIPT: EdgeFunctionDoc = {
  name: 'verify-receipt',
  category: 'Payments',
  categoryKa: 'გადახდები',
  description: 'Verifies iOS/Android purchase receipts for mobile IAP transactions.',
  descriptionKa: 'ამოწმებს iOS/Android შესყიდვის ქვითრებს მობილური IAP ტრანზაქციებისთვის.',
  method: 'POST',
  params: [
    { name: 'receipt', type: 'string', required: true, description: 'Purchase receipt data', descriptionKa: 'შესყიდვის ქვითრის მონაცემები' },
    { name: 'platform', type: 'string', required: true, description: 'ios or android', descriptionKa: 'ios ან android' },
    { name: 'productId', type: 'string', required: true, description: 'Product identifier', descriptionKa: 'პროდუქტის იდენტიფიკატორი' },
  ],
  returns: '{ valid: boolean, transactionId: string }',
  returnsKa: '{ valid: boolean, transactionId: string }',
  requiresAuth: true,
  usedBy: ['useRevenueCat'],
  externalServices: ['Apple StoreKit', 'Google Play Billing']
};

// ============= USER FUNCTIONS =============

export const FUNC_SEND_PUSH_NOTIFICATION: EdgeFunctionDoc = {
  name: 'send-push-notification',
  category: 'User Functions',
  categoryKa: 'მომხმარებლის ფუნქციები',
  description: 'Sends push notification to user via Firebase Cloud Messaging.',
  descriptionKa: 'აგზავნის push შეტყობინებას მომხმარებელს Firebase Cloud Messaging-ით.',
  method: 'POST',
  params: [
    { name: 'userId', type: 'string', required: true, description: 'Target user', descriptionKa: 'სამიზნე მომხმარებელი' },
    { name: 'title', type: 'string', required: true, description: 'Notification title', descriptionKa: 'შეტყობინების სათაური' },
    { name: 'body', type: 'string', required: true, description: 'Notification body', descriptionKa: 'შეტყობინების ტექსტი' },
    { name: 'data', type: 'object', required: false, description: 'Additional payload', descriptionKa: 'დამატებითი payload' },
  ],
  returns: '{ sent: boolean, messageId: string }',
  returnsKa: '{ sent: boolean, messageId: string }',
  requiresAuth: true,
  usedBy: ['AdminPushNotifications'],
  externalServices: ['Firebase Cloud Messaging']
};

export const FUNC_EXPORT_USER_DATA: EdgeFunctionDoc = {
  name: 'export-user-data',
  category: 'User Functions',
  categoryKa: 'მომხმარებლის ფუნქციები',
  description: 'GDPR data export. Compiles all user data into downloadable format.',
  descriptionKa: 'GDPR მონაცემების ექსპორტი. აკომპილირებს მომხმარებლის ყველა მონაცემს ჩამოსატვირთ ფორმატში.',
  method: 'POST',
  params: [],
  returns: '{ downloadUrl: string }',
  returnsKa: '{ downloadUrl: string }',
  requiresAuth: true,
  usedBy: ['SettingsPrivacy']
};

export const FUNC_DELETE_USER_ACCOUNT: EdgeFunctionDoc = {
  name: 'delete-user-account',
  category: 'User Functions',
  categoryKa: 'მომხმარებლის ფუნქციები',
  description: 'Permanently deletes user account and all associated data. GDPR right to erasure.',
  descriptionKa: 'სამუდამოდ შლის მომხმარებლის ანგარიშს და ყველა დაკავშირებულ მონაცემს. GDPR წაშლის უფლება.',
  method: 'POST',
  params: [
    { name: 'confirmation', type: 'string', required: true, description: 'User email for confirmation', descriptionKa: 'მომხმარებლის ელფოსტა დასადასტურებლად' },
  ],
  returns: '{ deleted: true }',
  returnsKa: '{ deleted: true }',
  requiresAuth: true,
  usedBy: ['SettingsPrivacy']
};

// Export all edge functions
export const ALL_EDGE_FUNCTIONS: EdgeFunctionDoc[] = [
  FUNC_GENERATE_AVATAR,
  FUNC_ANIMATE_AVATAR,
  FUNC_GENERATE_COVER_IMAGE,
  FUNC_GENERATE_ROOM_NAME,
  FUNC_GENERATE_CATEGORY_TRIVIA,
  FUNC_GENERATE_CUSTOM_QUIZ,
  FUNC_PARSE_QUIZ_URL,
  FUNC_SUGGEST_ICONS,
  FUNC_SMART_ASSIGN_ICONS,
  FUNC_VERIFY_ICONS,
  FUNC_SCAN_QUESTION_QUALITY,
  FUNC_SHORTEN_QUESTIONS,
  FUNC_TRANSLATE_QUESTIONS,
  FUNC_CREATE_GEM_CHECKOUT,
  FUNC_STRIPE_GEM_WEBHOOK,
  FUNC_VERIFY_RECEIPT,
  FUNC_SEND_PUSH_NOTIFICATION,
  FUNC_EXPORT_USER_DATA,
  FUNC_DELETE_USER_ACCOUNT,
];

// Edge function categories for navigation
export const EDGE_FUNCTION_CATEGORIES = [
  { id: 'ai-generation', name: 'AI Generation', nameKa: 'AI გენერაცია' },
  { id: 'quiz-generation', name: 'Quiz Generation', nameKa: 'ქვიზის გენერაცია' },
  { id: 'icon-management', name: 'Icon Management', nameKa: 'ხატულების მართვა' },
  { id: 'question-quality', name: 'Question Quality', nameKa: 'კითხვის ხარისხი' },
  { id: 'payments', name: 'Payments', nameKa: 'გადახდები' },
  { id: 'user-functions', name: 'User Functions', nameKa: 'მომხმარებლის ფუნქციები' },
];
