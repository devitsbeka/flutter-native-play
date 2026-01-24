// Complete Edge Functions Documentation
// Documents ALL 48 Supabase Edge Functions

import { EdgeFunctionDoc, EdgeFunctionParam } from './edgeFunctions';

// ============= ICON MANAGEMENT (Additional) =============

export const FUNC_BATCH_ASSIGN_ICONS: EdgeFunctionDoc = {
  name: 'batch-assign-icons',
  category: 'Icon Management',
  categoryKa: 'ხატულების მართვა',
  description: 'Bulk assigns icons to multiple questions at once. Processes in batches for efficiency.',
  descriptionKa: 'მასობრივად ანიჭებს ხატულებს მრავალ კითხვას ერთდროულად. დამუშავება პარტიებით ეფექტურობისთვის.',
  method: 'POST',
  params: [
    { name: 'questionIds', type: 'string[]', required: true, description: 'Questions to process', descriptionKa: 'დასამუშავებელი კითხვები' },
    { name: 'dryRun', type: 'boolean', required: false, description: 'Preview without saving', descriptionKa: 'გადახედვა შენახვის გარეშე' },
  ],
  returns: '{ processed: number, assigned: number, skipped: number }',
  returnsKa: '{ processed: number, assigned: number, skipped: number }',
  requiresAuth: true,
  usedBy: ['IconAssignment', 'AdminBatchActions'],
  externalServices: ['Lovable AI']
};

export const FUNC_BATCH_ASSIGN_ICONS_CATEGORY: EdgeFunctionDoc = {
  name: 'batch-assign-icons-category',
  category: 'Icon Management',
  categoryKa: 'ხატულების მართვა',
  description: 'Assigns icons to all questions in a specific category.',
  descriptionKa: 'ანიჭებს ხატულებს კონკრეტული კატეგორიის ყველა კითხვას.',
  method: 'POST',
  params: [
    { name: 'categoryId', type: 'string', required: true, description: 'Category to process', descriptionKa: 'დასამუშავებელი კატეგორია' },
    { name: 'level', type: 'number', required: false, description: 'Specific level', descriptionKa: 'კონკრეტული დონე' },
    { name: 'onlyMissing', type: 'boolean', required: false, description: 'Only questions without icons', descriptionKa: 'მხოლოდ კითხვები ხატულების გარეშე' },
  ],
  returns: '{ total: number, processed: number, assigned: number }',
  returnsKa: '{ total: number, processed: number, assigned: number }',
  requiresAuth: true,
  usedBy: ['CategoryIconAssignment'],
  externalServices: ['Lovable AI']
};

export const FUNC_SMART_ICON_SEARCH: EdgeFunctionDoc = {
  name: 'smart-icon-search',
  category: 'Icon Management',
  categoryKa: 'ხატულების მართვა',
  description: 'Semantic search for icons using AI to understand query intent.',
  descriptionKa: 'სემანტიკური ძიება ხატულებისთვის AI-ის გამოყენებით მოთხოვნის მიზნის გასაგებად.',
  method: 'POST',
  params: [
    { name: 'query', type: 'string', required: true, description: 'Search query', descriptionKa: 'საძიებო მოთხოვნა' },
    { name: 'category', type: 'string', required: false, description: 'Filter by category', descriptionKa: 'ფილტრაცია კატეგორიით' },
    { name: 'limit', type: 'number', required: false, description: 'Max results', descriptionKa: 'მაქსიმალური შედეგები' },
  ],
  returns: '{ results: IconResult[], total: number }',
  returnsKa: '{ results: IconResult[], total: number }',
  requiresAuth: true,
  usedBy: ['IconPicker', 'IconSearch'],
  externalServices: ['Lovable AI']
};

export const FUNC_PROPAGATE_ICONS: EdgeFunctionDoc = {
  name: 'propagate-icons',
  category: 'Icon Management',
  categoryKa: 'ხატულების მართვა',
  description: 'Spreads an icon from one question to semantically similar questions.',
  descriptionKa: 'ავრცელებს ხატულას ერთი კითხვიდან სემანტიკურად მსგავს კითხვებზე.',
  method: 'POST',
  params: [
    { name: 'sourceQuestionId', type: 'string', required: true, description: 'Source question with icon', descriptionKa: 'წყაროს კითხვა ხატულით' },
    { name: 'iconSlug', type: 'string', required: true, description: 'Icon to propagate', descriptionKa: 'გასავრცელებელი ხატულა' },
    { name: 'targetQuestionIds', type: 'string[]', required: true, description: 'Target questions', descriptionKa: 'სამიზნე კითხვები' },
    { name: 'threshold', type: 'number', required: false, description: 'Similarity threshold', descriptionKa: 'მსგავსების ბარიერი' },
  ],
  returns: '{ propagated: number, skipped: number }',
  returnsKa: '{ propagated: number, skipped: number }',
  requiresAuth: true,
  usedBy: ['useSimilarQuestions'],
  externalServices: []
};

export const FUNC_FIND_SIMILAR_QUESTIONS: EdgeFunctionDoc = {
  name: 'find-similar-questions',
  category: 'Icon Management',
  categoryKa: 'ხატულების მართვა',
  description: 'Finds semantically similar questions for icon propagation or duplicate detection.',
  descriptionKa: 'პოულობს სემანტიკურად მსგავს კითხვებს ხატულების გავრცელებისთვის ან დუბლიკატების აღმოჩენისთვის.',
  method: 'POST',
  params: [
    { name: 'questionId', type: 'string', required: true, description: 'Source question', descriptionKa: 'წყაროს კითხვა' },
    { name: 'questionText', type: 'string', required: true, description: 'Question text', descriptionKa: 'კითხვის ტექსტი' },
    { name: 'threshold', type: 'number', required: false, description: 'Similarity threshold (0-1)', descriptionKa: 'მსგავსების ბარიერი (0-1)' },
    { name: 'limit', type: 'number', required: false, description: 'Max results', descriptionKa: 'მაქსიმალური შედეგები' },
  ],
  returns: '{ similar: SimilarQuestion[] }',
  returnsKa: '{ similar: SimilarQuestion[] }',
  requiresAuth: true,
  usedBy: ['useSimilarQuestions', 'DuplicateDetection'],
  externalServices: ['Lovable AI']
};

export const FUNC_FIX_BROKEN_ICON_REFERENCES: EdgeFunctionDoc = {
  name: 'fix-broken-icon-references',
  category: 'Icon Management',
  categoryKa: 'ხატულების მართვა',
  description: 'Automatically fixes broken icon references by finding replacement icons.',
  descriptionKa: 'ავტომატურად ასწორებს გატეხილ ხატულების რეფერენსებს ჩანაცვლების ხატულების პოვნით.',
  method: 'POST',
  params: [
    { name: 'limit', type: 'number', required: false, description: 'Max to fix', descriptionKa: 'მაქსიმუმი გასასწორებლად' },
  ],
  returns: '{ fixed: number, notFound: number }',
  returnsKa: '{ fixed: number, notFound: number }',
  requiresAuth: true,
  usedBy: ['useIconVerification'],
  externalServices: []
};

export const FUNC_REPLACE_ICON: EdgeFunctionDoc = {
  name: 'replace-icon',
  category: 'Icon Management',
  categoryKa: 'ხატულების მართვა',
  description: 'Uploads a replacement icon for a broken or missing icon.',
  descriptionKa: 'ატვირთავს ჩანაცვლების ხატულას გატეხილი ან დაკარგული ხატულისთვის.',
  method: 'POST',
  params: [
    { name: 'iconSlug', type: 'string', required: true, description: 'Icon slug to replace', descriptionKa: 'შესაცვლელი ხატულას slug' },
    { name: 'imageUrl', type: 'string', required: true, description: 'New image URL', descriptionKa: 'ახალი სურათის URL' },
  ],
  returns: '{ success: boolean, newUrl: string }',
  returnsKa: '{ success: boolean, newUrl: string }',
  requiresAuth: true,
  usedBy: ['ReplaceIconModal'],
  externalServices: []
};

export const FUNC_EXTRACT_ICONS: EdgeFunctionDoc = {
  name: 'extract-icons',
  category: 'Icon Management',
  categoryKa: 'ხატულების მართვა',
  description: 'Extracts icons from a ZIP file and uploads to storage.',
  descriptionKa: 'ამოიღებს ხატულებს ZIP ფაილიდან და ატვირთავს საცავში.',
  method: 'POST',
  params: [
    { name: 'zipUrl', type: 'string', required: true, description: 'URL of ZIP file', descriptionKa: 'ZIP ფაილის URL' },
    { name: 'category', type: 'string', required: false, description: 'Icon category', descriptionKa: 'ხატულას კატეგორია' },
  ],
  returns: '{ extracted: number, failed: number }',
  returnsKa: '{ extracted: number, failed: number }',
  requiresAuth: true,
  usedBy: ['AdminIconUpload'],
  externalServices: []
};

export const FUNC_EXTRACT_MISSING_ICONS: EdgeFunctionDoc = {
  name: 'extract-missing-icons',
  category: 'Icon Management',
  categoryKa: 'ხატულების მართვა',
  description: 'Finds icons that exist in database but not in storage.',
  descriptionKa: 'პოულობს ხატულებს, რომლებიც არსებობს მონაცემთა ბაზაში, მაგრამ არა საცავში.',
  method: 'POST',
  params: [],
  returns: '{ missing: string[] }',
  returnsKa: '{ missing: string[] }',
  requiresAuth: true,
  usedBy: ['IconMaintenance'],
  externalServices: []
};

export const FUNC_EXPORT_ICON_LIBRARY: EdgeFunctionDoc = {
  name: 'export-icon-library',
  category: 'Icon Management',
  categoryKa: 'ხატულების მართვა',
  description: 'Exports icon library metadata as JSON for backup or transfer.',
  descriptionKa: 'ექსპორტირებს ხატულების ბიბლიოთეკის მეტადატას JSON-ად სარეზერვო ასლისთვის ან გადაცემისთვის.',
  method: 'GET',
  params: [
    { name: 'category', type: 'string', required: false, description: 'Filter by category', descriptionKa: 'ფილტრაცია კატეგორიით' },
  ],
  returns: '{ icons: IconMetadata[] }',
  returnsKa: '{ icons: IconMetadata[] }',
  requiresAuth: true,
  usedBy: ['AdminBackup'],
  externalServices: []
};

export const FUNC_ANALYZE_QUESTION_ICON: EdgeFunctionDoc = {
  name: 'analyze-question-icon',
  category: 'Icon Management',
  categoryKa: 'ხატულების მართვა',
  description: 'AI analyzes if an icon is relevant and appropriate for a question.',
  descriptionKa: 'AI აანალიზებს არის თუ არა ხატულა რელევანტური და შესაფერისი კითხვისთვის.',
  method: 'POST',
  params: [
    { name: 'questionText', type: 'string', required: true, description: 'Question text', descriptionKa: 'კითხვის ტექსტი' },
    { name: 'correctAnswer', type: 'string', required: true, description: 'Correct answer', descriptionKa: 'სწორი პასუხი' },
    { name: 'iconSlug', type: 'string', required: true, description: 'Icon to analyze', descriptionKa: 'გასაანალიზებელი ხატულა' },
  ],
  returns: '{ isRelevant: boolean, isSpoiler: boolean, score: number, reason: string }',
  returnsKa: '{ isRelevant: boolean, isSpoiler: boolean, score: number, reason: string }',
  requiresAuth: true,
  usedBy: ['IconReviewQueue'],
  externalServices: ['Lovable AI']
};

// ============= QUIZ GENERATION (Additional) =============

export const FUNC_GENERATE_COUNTRY_TRIVIA: EdgeFunctionDoc = {
  name: 'generate-country-trivia',
  category: 'Quiz Generation',
  categoryKa: 'ქვიზის გენერაცია',
  description: 'Generates trivia questions about a specific country for geography mode.',
  descriptionKa: 'ქმნის ტრივია კითხვებს კონკრეტული ქვეყნის შესახებ გეოგრაფიის რეჟიმისთვის.',
  method: 'POST',
  params: [
    { name: 'countryCode', type: 'string', required: true, description: '2-letter ISO code', descriptionKa: '2-ასოიანი ISO კოდი' },
    { name: 'count', type: 'number', required: false, description: 'Number of questions', descriptionKa: 'კითხვების რაოდენობა' },
    { name: 'language', type: 'string', required: false, description: 'Output language', descriptionKa: 'გამოსავლის ენა' },
  ],
  returns: '{ questions: Question[], country: CountryInfo }',
  returnsKa: '{ questions: Question[], country: CountryInfo }',
  requiresAuth: true,
  usedBy: ['WorldMapPage', 'CountryQuiz'],
  externalServices: ['Lovable AI']
};

export const FUNC_GENERATE_MULTILANG_TRIVIA: EdgeFunctionDoc = {
  name: 'generate-multilang-trivia',
  category: 'Quiz Generation',
  categoryKa: 'ქვიზის გენერაცია',
  description: 'Generates trivia in multiple languages simultaneously for localization.',
  descriptionKa: 'ქმნის ტრივიას მრავალ ენაზე ერთდროულად ლოკალიზაციისთვის.',
  method: 'POST',
  params: [
    { name: 'topic', type: 'string', required: true, description: 'Topic to generate', descriptionKa: 'თემა გენერაციისთვის' },
    { name: 'languages', type: 'string[]', required: true, description: 'Target languages', descriptionKa: 'სამიზნე ენები' },
    { name: 'count', type: 'number', required: false, description: 'Questions per language', descriptionKa: 'კითხვები თითოეულ ენაზე' },
  ],
  returns: '{ questions: Record<string, Question[]> }',
  returnsKa: '{ questions: Record<string, Question[]> }',
  requiresAuth: true,
  usedBy: ['AdminLocalization'],
  externalServices: ['Lovable AI']
};

export const FUNC_GENERATE_SINGLE_QUESTION: EdgeFunctionDoc = {
  name: 'generate-single-question',
  category: 'Quiz Generation',
  categoryKa: 'ქვიზის გენერაცია',
  description: 'Generates a single high-quality trivia question on a specific topic.',
  descriptionKa: 'ქმნის ერთ მაღალი ხარისხის ტრივია კითხვას კონკრეტულ თემაზე.',
  method: 'POST',
  params: [
    { name: 'topic', type: 'string', required: true, description: 'Specific topic', descriptionKa: 'კონკრეტული თემა' },
    { name: 'difficulty', type: 'string', required: false, description: 'easy, medium, hard', descriptionKa: 'easy, medium, hard' },
    { name: 'language', type: 'string', required: false, description: 'Output language', descriptionKa: 'გამოსავლის ენა' },
  ],
  returns: '{ question: Question }',
  returnsKa: '{ question: Question }',
  requiresAuth: true,
  usedBy: ['CreateTriviaWizard'],
  externalServices: ['Lovable AI']
};

export const FUNC_PARSE_TEXT_CONTENT: EdgeFunctionDoc = {
  name: 'parse-text-content',
  category: 'Quiz Generation',
  categoryKa: 'ქვიზის გენერაცია',
  description: 'Parses raw text content into structured quiz questions.',
  descriptionKa: 'აანალიზებს ნედლ ტექსტურ კონტენტს სტრუქტურირებულ ქვიზის კითხვებად.',
  method: 'POST',
  params: [
    { name: 'text', type: 'string', required: true, description: 'Text content', descriptionKa: 'ტექსტური კონტენტი' },
    { name: 'questionCount', type: 'number', required: false, description: 'Target question count', descriptionKa: 'სამიზნე კითხვების რაოდენობა' },
  ],
  returns: '{ questions: Question[], summary: string }',
  returnsKa: '{ questions: Question[], summary: string }',
  requiresAuth: true,
  usedBy: ['CreateTriviaWizard'],
  externalServices: ['Lovable AI']
};

export const FUNC_RUN_GENERATION_JOB: EdgeFunctionDoc = {
  name: 'run-generation-job',
  category: 'Quiz Generation',
  categoryKa: 'ქვიზის გენერაცია',
  description: 'Background job runner for long-running generation tasks.',
  descriptionKa: 'ფონური სამუშაოს მიმწოდებელი ხანგრძლივი გენერაციის ამოცანებისთვის.',
  method: 'POST',
  params: [
    { name: 'jobId', type: 'string', required: true, description: 'Job to run', descriptionKa: 'გასაშვები სამუშაო' },
  ],
  returns: '{ status: string, progress: number }',
  returnsKa: '{ status: string, progress: number }',
  requiresAuth: true,
  usedBy: ['GenerationQueue'],
  externalServices: ['Lovable AI']
};

// ============= AI GENERATION (Additional) =============

export const FUNC_EXPAND_AVATAR: EdgeFunctionDoc = {
  name: 'expand-avatar',
  category: 'AI Generation',
  categoryKa: 'AI გენერაცია',
  description: 'Expands/outpaints an avatar to create a larger frame or banner version.',
  descriptionKa: 'აფართოებს/outpaint-ს ავატარს უფრო დიდი ჩარჩოს ან ბანერის ვერსიის შესაქმნელად.',
  method: 'POST',
  params: [
    { name: 'avatarUrl', type: 'string', required: true, description: 'Source avatar', descriptionKa: 'წყაროს ავატარი' },
    { name: 'targetAspect', type: 'string', required: false, description: 'Target aspect ratio', descriptionKa: 'სამიზნე ასპექტის თანაფარდობა' },
  ],
  returns: '{ expandedUrl: string }',
  returnsKa: '{ expandedUrl: string }',
  requiresAuth: true,
  usedBy: ['ProfileBanner'],
  externalServices: ['Lovable AI']
};

export const FUNC_BATCH_ANIMATE_AVATARS: EdgeFunctionDoc = {
  name: 'batch-animate-avatars',
  category: 'AI Generation',
  categoryKa: 'AI გენერაცია',
  description: 'Animates multiple avatars in batch for efficiency.',
  descriptionKa: 'ანიმაცირებს მრავალ ავატარს პარტიაში ეფექტურობისთვის.',
  method: 'POST',
  params: [
    { name: 'avatarIds', type: 'string[]', required: true, description: 'Avatars to animate', descriptionKa: 'ანიმაციისთვის ავატარები' },
  ],
  returns: '{ processed: number, animated: number }',
  returnsKa: '{ processed: number, animated: number }',
  requiresAuth: true,
  usedBy: ['AdminBatchActions'],
  externalServices: ['Lovable AI']
};

export const FUNC_PROCESS_EXISTING_AVATARS: EdgeFunctionDoc = {
  name: 'process-existing-avatars',
  category: 'AI Generation',
  categoryKa: 'AI გენერაცია',
  description: 'Processes existing avatars to add animation or other enhancements.',
  descriptionKa: 'დამუშავებს არსებულ ავატარებს ანიმაციის ან სხვა გაუმჯობესებების დასამატებლად.',
  method: 'POST',
  params: [
    { name: 'limit', type: 'number', required: false, description: 'Max to process', descriptionKa: 'მაქსიმუმი დასამუშავებლად' },
    { name: 'onlyMissing', type: 'boolean', required: false, description: 'Only avatars without animation', descriptionKa: 'მხოლოდ ავატარები ანიმაციის გარეშე' },
  ],
  returns: '{ processed: number }',
  returnsKa: '{ processed: number }',
  requiresAuth: true,
  usedBy: ['AdminMaintenance'],
  externalServices: ['Lovable AI']
};

export const FUNC_GENERATE_ROOM_COVERS: EdgeFunctionDoc = {
  name: 'generate-room-covers',
  category: 'AI Generation',
  categoryKa: 'AI გენერაცია',
  description: 'Auto-generates cover images for game rooms based on room theme.',
  descriptionKa: 'ავტომატურად ქმნის ფარდის სურათებს თამაშის ოთახებისთვის ოთახის თემის მიხედვით.',
  method: 'POST',
  params: [
    { name: 'roomId', type: 'string', required: true, description: 'Room to generate for', descriptionKa: 'ოთახი გენერაციისთვის' },
    { name: 'theme', type: 'string', required: false, description: 'Room theme/category', descriptionKa: 'ოთახის თემა/კატეგორია' },
  ],
  returns: '{ coverUrl: string }',
  returnsKa: '{ coverUrl: string }',
  requiresAuth: true,
  usedBy: ['CreateRoomScreen'],
  externalServices: ['Lovable AI']
};

export const FUNC_GENERATE_QUESTION_IMAGE: EdgeFunctionDoc = {
  name: 'generate-question-image',
  category: 'AI Generation',
  categoryKa: 'AI გენერაცია',
  description: 'Generates a custom illustration for a trivia question.',
  descriptionKa: 'ქმნის მორგებულ ილუსტრაციას ტრივია კითხვისთვის.',
  method: 'POST',
  params: [
    { name: 'questionText', type: 'string', required: true, description: 'Question to illustrate', descriptionKa: 'კითხვა საილუსტრაციოდ' },
    { name: 'style', type: 'string', required: false, description: 'Image style', descriptionKa: 'სურათის სტილი' },
  ],
  returns: '{ imageUrl: string }',
  returnsKa: '{ imageUrl: string }',
  requiresAuth: true,
  usedBy: ['AdminQuestionEditor'],
  externalServices: ['Lovable AI']
};

export const FUNC_SEARCH_QUESTION_IMAGE: EdgeFunctionDoc = {
  name: 'search-question-image',
  category: 'AI Generation',
  categoryKa: 'AI გენერაცია',
  description: 'Searches for appropriate stock images for a question.',
  descriptionKa: 'ეძებს შესაფერის stock სურათებს კითხვისთვის.',
  method: 'POST',
  params: [
    { name: 'questionText', type: 'string', required: true, description: 'Question to find image for', descriptionKa: 'კითხვა სურათის საპოვნელად' },
    { name: 'correctAnswer', type: 'string', required: true, description: 'Correct answer', descriptionKa: 'სწორი პასუხი' },
  ],
  returns: '{ images: ImageResult[] }',
  returnsKa: '{ images: ImageResult[] }',
  requiresAuth: true,
  usedBy: ['AdminQuestionEditor'],
  externalServices: []
};

// ============= QUESTION QUALITY (Additional) =============

export const FUNC_SHORTEN_ANSWERS: EdgeFunctionDoc = {
  name: 'shorten-answers',
  category: 'Question Quality',
  categoryKa: 'კითხვის ხარისხი',
  description: 'AI rewrites long answer options to fit mobile display constraints.',
  descriptionKa: 'AI ხელახლა წერს გრძელ პასუხების ოფციებს მობილურის ეკრანის შეზღუდვებში მოსათავსებლად.',
  method: 'POST',
  params: [
    { name: 'questionIds', type: 'string[]', required: true, description: 'Questions with long answers', descriptionKa: 'კითხვები გრძელი პასუხებით' },
    { name: 'maxLength', type: 'number', required: false, description: 'Max answer length', descriptionKa: 'მაქსიმალური პასუხის სიგრძე' },
  ],
  returns: '{ shortened: number, results: ShortenResult[] }',
  returnsKa: '{ shortened: number, results: ShortenResult[] }',
  requiresAuth: true,
  usedBy: ['QuestionTools'],
  externalServices: ['Lovable AI']
};

export const FUNC_VERIFY_GEORGIAN_GRAMMAR: EdgeFunctionDoc = {
  name: 'verify-georgian-grammar',
  category: 'Question Quality',
  categoryKa: 'კითხვის ხარისხი',
  description: 'AI checks Georgian text for grammar and spelling errors.',
  descriptionKa: 'AI ამოწმებს ქართულ ტექსტს გრამატიკისა და მართლწერის შეცდომებზე.',
  method: 'POST',
  params: [
    { name: 'questionIds', type: 'string[]', required: true, description: 'Questions to check', descriptionKa: 'კითხვები შესამოწმებლად' },
    { name: 'autoFix', type: 'boolean', required: false, description: 'Auto-fix simple errors', descriptionKa: 'მარტივი შეცდომების ავტომატური გასწორება' },
  ],
  returns: '{ checked: number, issues: GrammarIssue[] }',
  returnsKa: '{ checked: number, issues: GrammarIssue[] }',
  requiresAuth: true,
  usedBy: ['QualityReview'],
  externalServices: ['Lovable AI']
};

// ============= UTILITY FUNCTIONS =============

export const FUNC_FETCH_URL_METADATA: EdgeFunctionDoc = {
  name: 'fetch-url-metadata',
  category: 'Utility',
  categoryKa: 'უტილიტა',
  description: 'Fetches metadata (title, description, image) from any URL.',
  descriptionKa: 'იღებს მეტადატას (სათაური, აღწერა, სურათი) ნებისმიერი URL-დან.',
  method: 'POST',
  params: [
    { name: 'url', type: 'string', required: true, description: 'URL to fetch', descriptionKa: 'გასატანი URL' },
  ],
  returns: '{ title: string, description: string, image: string, content: string }',
  returnsKa: '{ title: string, description: string, image: string, content: string }',
  requiresAuth: true,
  usedBy: ['CreateTriviaWizard', 'URLPreview'],
  externalServices: []
};

export const FUNC_VALIDATE_COVER_IMAGE: EdgeFunctionDoc = {
  name: 'validate-cover-image',
  category: 'Utility',
  categoryKa: 'უტილიტა',
  description: 'AI validates that a cover image is appropriate and not NSFW.',
  descriptionKa: 'AI ამოწმებს რომ ფარდის სურათი შესაფერისია და არ არის NSFW.',
  method: 'POST',
  params: [
    { name: 'imageUrl', type: 'string', required: true, description: 'Image to validate', descriptionKa: 'შესამოწმებელი სურათი' },
  ],
  returns: '{ isValid: boolean, reason: string }',
  returnsKa: '{ isValid: boolean, reason: string }',
  requiresAuth: true,
  usedBy: ['ImageUpload'],
  externalServices: ['Lovable AI']
};

export const FUNC_NOTIFY_NEW_LEVELS: EdgeFunctionDoc = {
  name: 'notify-new-levels',
  category: 'Utility',
  categoryKa: 'უტილიტა',
  description: 'Sends push notifications when new levels are added to categories.',
  descriptionKa: 'აგზავნის push შეტყობინებებს როცა ახალი დონეები ემატება კატეგორიებს.',
  method: 'POST',
  params: [
    { name: 'categoryId', type: 'string', required: true, description: 'Category with new levels', descriptionKa: 'კატეგორია ახალი დონეებით' },
    { name: 'newLevelCount', type: 'number', required: true, description: 'Number of new levels', descriptionKa: 'ახალი დონეების რაოდენობა' },
  ],
  returns: '{ notified: number }',
  returnsKa: '{ notified: number }',
  requiresAuth: true,
  usedBy: ['AdminLevelManager'],
  externalServices: ['Firebase Cloud Messaging']
};

// Export all additional edge functions
export const ALL_EDGE_FUNCTIONS_COMPLETE = [
  FUNC_BATCH_ASSIGN_ICONS,
  FUNC_BATCH_ASSIGN_ICONS_CATEGORY,
  FUNC_SMART_ICON_SEARCH,
  FUNC_PROPAGATE_ICONS,
  FUNC_FIND_SIMILAR_QUESTIONS,
  FUNC_FIX_BROKEN_ICON_REFERENCES,
  FUNC_REPLACE_ICON,
  FUNC_EXTRACT_ICONS,
  FUNC_EXTRACT_MISSING_ICONS,
  FUNC_EXPORT_ICON_LIBRARY,
  FUNC_ANALYZE_QUESTION_ICON,
  FUNC_GENERATE_COUNTRY_TRIVIA,
  FUNC_GENERATE_MULTILANG_TRIVIA,
  FUNC_GENERATE_SINGLE_QUESTION,
  FUNC_PARSE_TEXT_CONTENT,
  FUNC_RUN_GENERATION_JOB,
  FUNC_EXPAND_AVATAR,
  FUNC_BATCH_ANIMATE_AVATARS,
  FUNC_PROCESS_EXISTING_AVATARS,
  FUNC_GENERATE_ROOM_COVERS,
  FUNC_GENERATE_QUESTION_IMAGE,
  FUNC_SEARCH_QUESTION_IMAGE,
  FUNC_SHORTEN_ANSWERS,
  FUNC_VERIFY_GEORGIAN_GRAMMAR,
  FUNC_FETCH_URL_METADATA,
  FUNC_VALIDATE_COVER_IMAGE,
  FUNC_NOTIFY_NEW_LEVELS,
];

// Edge function categories (complete)
export const EDGE_FUNCTION_CATEGORIES_COMPLETE = [
  { id: 'ai-generation', name: 'AI Generation', nameKa: 'AI გენერაცია', count: 10 },
  { id: 'quiz-generation', name: 'Quiz Generation', nameKa: 'ქვიზის გენერაცია', count: 8 },
  { id: 'icon-management', name: 'Icon Management', nameKa: 'ხატულების მართვა', count: 14 },
  { id: 'question-quality', name: 'Question Quality', nameKa: 'კითხვის ხარისხი', count: 5 },
  { id: 'payments', name: 'Payments', nameKa: 'გადახდები', count: 3 },
  { id: 'user-functions', name: 'User Functions', nameKa: 'მომხმარებლის ფუნქციები', count: 4 },
  { id: 'utility', name: 'Utility', nameKa: 'უტილიტა', count: 4 },
];
