// Complete Edge Functions Documentation - ALL 49 functions
// Documents every Supabase Edge Function

export interface EdgeFunctionDocFull {
  name: string;
  path: string;
  description: string;
  category: string;
  method: "POST" | "GET" | "PUT" | "DELETE";
  auth: "required" | "optional" | "none" | "admin";
  params?: EdgeFunctionParam[];
  returns: string;
  usedBy: string[];
}

export interface EdgeFunctionParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export const ALL_EDGE_FUNCTIONS_FULL: EdgeFunctionDocFull[] = [
  // ============= AVATAR GENERATION =============
  {
    name: "generate-avatar",
    path: "supabase/functions/generate-avatar",
    description: "Generates AI avatar from user photo using AI gateway.",
    category: "Avatar",
    method: "POST",
    auth: "required",
    params: [
      { name: "imageUrl", type: "string", required: true, description: "Source image URL" },
      { name: "style", type: "string", required: false, description: "Avatar style preset" },
    ],
    returns: "{ avatarUrl: string, id: string }",
    usedBy: ["AvatarUpload", "Profile"]
  },
  {
    name: "animate-avatar",
    path: "supabase/functions/animate-avatar",
    description: "Creates animated video from static avatar image.",
    category: "Avatar",
    method: "POST",
    auth: "required",
    params: [
      { name: "avatarUrl", type: "string", required: true, description: "Static avatar URL" },
    ],
    returns: "{ videoUrl: string }",
    usedBy: ["AnimatedAvatar"]
  },
  {
    name: "batch-animate-avatars",
    path: "supabase/functions/batch-animate-avatars",
    description: "Bulk animates multiple avatars.",
    category: "Avatar",
    method: "POST",
    auth: "admin",
    params: [
      { name: "avatarIds", type: "string[]", required: true, description: "Avatar IDs to animate" },
    ],
    returns: "{ processed: number, failed: number }",
    usedBy: ["Admin"]
  },
  {
    name: "expand-avatar",
    path: "supabase/functions/expand-avatar",
    description: "Outpaints avatar for larger frame sizes.",
    category: "Avatar",
    method: "POST",
    auth: "required",
    params: [
      { name: "avatarUrl", type: "string", required: true, description: "Original avatar URL" },
      { name: "targetSize", type: "number", required: false, description: "Target size in pixels" },
    ],
    returns: "{ expandedUrl: string }",
    usedBy: ["FramePreview"]
  },
  {
    name: "process-existing-avatars",
    path: "supabase/functions/process-existing-avatars",
    description: "Reprocesses existing avatars with new settings.",
    category: "Avatar",
    method: "POST",
    auth: "admin",
    params: [],
    returns: "{ processed: number }",
    usedBy: ["Admin maintenance"]
  },

  // ============= COVER/IMAGE GENERATION =============
  {
    name: "generate-cover-image",
    path: "supabase/functions/generate-cover-image",
    description: "Generates AI cover image for user quizzes.",
    category: "Image",
    method: "POST",
    auth: "required",
    params: [
      { name: "title", type: "string", required: true, description: "Quiz title" },
      { name: "category", type: "string", required: false, description: "Quiz category" },
    ],
    returns: "{ coverUrl: string }",
    usedBy: ["TriviaCreator"]
  },
  {
    name: "generate-room-covers",
    path: "supabase/functions/generate-room-covers",
    description: "Auto-generates covers for multiplayer rooms.",
    category: "Image",
    method: "POST",
    auth: "admin",
    params: [],
    returns: "{ generated: number }",
    usedBy: ["Admin"]
  },
  {
    name: "generate-question-image",
    path: "supabase/functions/generate-question-image",
    description: "Generates illustration for a question.",
    category: "Image",
    method: "POST",
    auth: "admin",
    params: [
      { name: "questionText", type: "string", required: true, description: "Question text" },
      { name: "answer", type: "string", required: true, description: "Correct answer" },
    ],
    returns: "{ imageUrl: string }",
    usedBy: ["QuestionEditor"]
  },
  {
    name: "search-question-image",
    path: "supabase/functions/search-question-image",
    description: "Searches stock images for question.",
    category: "Image",
    method: "POST",
    auth: "admin",
    params: [
      { name: "query", type: "string", required: true, description: "Search query" },
    ],
    returns: "{ images: ImageResult[] }",
    usedBy: ["QuestionEditor"]
  },
  {
    name: "validate-cover-image",
    path: "supabase/functions/validate-cover-image",
    description: "AI validation of cover image quality.",
    category: "Image",
    method: "POST",
    auth: "required",
    params: [
      { name: "imageUrl", type: "string", required: true, description: "Image to validate" },
    ],
    returns: "{ valid: boolean, issues: string[] }",
    usedBy: ["TriviaCreator"]
  },

  // ============= TRIVIA GENERATION =============
  {
    name: "generate-category-trivia",
    path: "supabase/functions/generate-category-trivia",
    description: "Generates questions for a category/level.",
    category: "Trivia",
    method: "POST",
    auth: "admin",
    params: [
      { name: "categoryId", type: "string", required: true, description: "Category ID" },
      { name: "level", type: "number", required: true, description: "Level number" },
      { name: "count", type: "number", required: false, description: "Questions to generate" },
    ],
    returns: "{ questions: Question[], generated: number }",
    usedBy: ["AdminGenerate"]
  },
  {
    name: "generate-country-trivia",
    path: "supabase/functions/generate-country-trivia",
    description: "Generates country-specific trivia questions.",
    category: "Trivia",
    method: "POST",
    auth: "admin",
    params: [
      { name: "countryCode", type: "string", required: true, description: "Country code" },
      { name: "count", type: "number", required: false, description: "Questions to generate" },
    ],
    returns: "{ questions: Question[] }",
    usedBy: ["AdminGenerate"]
  },
  {
    name: "generate-custom-quiz",
    path: "supabase/functions/generate-custom-quiz",
    description: "Generates quiz from URL or custom text.",
    category: "Trivia",
    method: "POST",
    auth: "required",
    params: [
      { name: "source", type: "string", required: true, description: "URL or text content" },
      { name: "count", type: "number", required: false, description: "Questions to generate" },
    ],
    returns: "{ questions: Question[] }",
    usedBy: ["TriviaCreator"]
  },
  {
    name: "generate-multilang-trivia",
    path: "supabase/functions/generate-multilang-trivia",
    description: "Generates questions in multiple languages.",
    category: "Trivia",
    method: "POST",
    auth: "admin",
    params: [
      { name: "topic", type: "string", required: true, description: "Topic for questions" },
      { name: "languages", type: "string[]", required: true, description: "Target languages" },
    ],
    returns: "{ questions: Record<string, Question[]> }",
    usedBy: ["AdminGenerate"]
  },
  {
    name: "generate-single-question",
    path: "supabase/functions/generate-single-question",
    description: "Generates a single question on demand.",
    category: "Trivia",
    method: "POST",
    auth: "admin",
    params: [
      { name: "topic", type: "string", required: true, description: "Question topic" },
      { name: "difficulty", type: "string", required: false, description: "easy/medium/hard" },
    ],
    returns: "{ question: Question }",
    usedBy: ["QuestionEditor"]
  },
  {
    name: "generate-room-name",
    path: "supabase/functions/generate-room-name",
    description: "Generates fun Georgian room names.",
    category: "Trivia",
    method: "POST",
    auth: "required",
    params: [],
    returns: "{ name: string }",
    usedBy: ["CreateRoomModal"]
  },
  {
    name: "parse-quiz-url",
    path: "supabase/functions/parse-quiz-url",
    description: "Extracts questions from URL content.",
    category: "Trivia",
    method: "POST",
    auth: "required",
    params: [
      { name: "url", type: "string", required: true, description: "URL to parse" },
    ],
    returns: "{ questions: Question[], source: string }",
    usedBy: ["TriviaCreator"]
  },
  {
    name: "parse-text-content",
    path: "supabase/functions/parse-text-content",
    description: "Parses pasted text into questions.",
    category: "Trivia",
    method: "POST",
    auth: "required",
    params: [
      { name: "text", type: "string", required: true, description: "Text to parse" },
    ],
    returns: "{ questions: Question[] }",
    usedBy: ["TriviaCreator"]
  },
  {
    name: "run-generation-job",
    path: "supabase/functions/run-generation-job",
    description: "Runs background generation job.",
    category: "Trivia",
    method: "POST",
    auth: "admin",
    params: [
      { name: "jobId", type: "string", required: true, description: "Job ID to run" },
    ],
    returns: "{ status: string, generated: number }",
    usedBy: ["BackgroundGeneration"]
  },

  // ============= ICON MANAGEMENT =============
  {
    name: "suggest-icons",
    path: "supabase/functions/suggest-icons",
    description: "AI suggests icons for question.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [
      { name: "questionText", type: "string", required: true, description: "Question text" },
      { name: "answer", type: "string", required: true, description: "Correct answer" },
    ],
    returns: "{ suggestions: IconSuggestion[] }",
    usedBy: ["IconSuggestionsPanel"]
  },
  {
    name: "smart-assign-icons",
    path: "supabase/functions/smart-assign-icons",
    description: "Intelligently assigns icons to questions.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [
      { name: "questionIds", type: "string[]", required: true, description: "Questions to assign" },
    ],
    returns: "{ assigned: number, failed: number }",
    usedBy: ["BulkIconReassignment"]
  },
  {
    name: "smart-icon-search",
    path: "supabase/functions/smart-icon-search",
    description: "Semantic icon search.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [
      { name: "query", type: "string", required: true, description: "Search query" },
    ],
    returns: "{ icons: Icon[] }",
    usedBy: ["IconPicker"]
  },
  {
    name: "batch-assign-icons",
    path: "supabase/functions/batch-assign-icons",
    description: "Bulk icon assignment.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [
      { name: "assignments", type: "Assignment[]", required: true, description: "Icon assignments" },
    ],
    returns: "{ success: number, failed: number }",
    usedBy: ["AdminQuestions"]
  },
  {
    name: "batch-assign-icons-category",
    path: "supabase/functions/batch-assign-icons-category",
    description: "Assigns icons to all questions in category.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [
      { name: "categoryId", type: "string", required: true, description: "Category ID" },
    ],
    returns: "{ assigned: number }",
    usedBy: ["AdminCategories"]
  },
  {
    name: "propagate-icons",
    path: "supabase/functions/propagate-icons",
    description: "Spreads icons to similar questions.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [
      { name: "sourceQuestionId", type: "string", required: true, description: "Source question" },
      { name: "iconSlug", type: "string", required: true, description: "Icon to propagate" },
    ],
    returns: "{ propagated: number }",
    usedBy: ["QuestionEditor"]
  },
  {
    name: "find-similar-questions",
    path: "supabase/functions/find-similar-questions",
    description: "Finds semantically similar questions.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [
      { name: "questionId", type: "string", required: true, description: "Source question ID" },
      { name: "threshold", type: "number", required: false, description: "Similarity threshold" },
    ],
    returns: "{ similar: SimilarQuestion[] }",
    usedBy: ["QuestionEditor"]
  },
  {
    name: "verify-icons",
    path: "supabase/functions/verify-icons",
    description: "Checks icon URLs are valid.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [
      { name: "iconIds", type: "string[]", required: false, description: "Icons to verify" },
    ],
    returns: "{ valid: number, broken: number, results: VerifyResult[] }",
    usedBy: ["AdminIcons"]
  },
  {
    name: "fix-broken-icon-references",
    path: "supabase/functions/fix-broken-icon-references",
    description: "Auto-fixes broken icon references.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [],
    returns: "{ fixed: number }",
    usedBy: ["AdminIcons"]
  },
  {
    name: "replace-icon",
    path: "supabase/functions/replace-icon",
    description: "Uploads replacement icon.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [
      { name: "oldSlug", type: "string", required: true, description: "Icon to replace" },
      { name: "newImage", type: "File", required: true, description: "New icon file" },
    ],
    returns: "{ newSlug: string, url: string }",
    usedBy: ["IconReplacer"]
  },
  {
    name: "extract-icons",
    path: "supabase/functions/extract-icons",
    description: "Extracts icons from ZIP file.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [
      { name: "zipUrl", type: "string", required: true, description: "ZIP file URL" },
    ],
    returns: "{ extracted: number, icons: string[] }",
    usedBy: ["IconUploader"]
  },
  {
    name: "extract-missing-icons",
    path: "supabase/functions/extract-missing-icons",
    description: "Finds icons referenced but not in library.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [],
    returns: "{ missing: string[] }",
    usedBy: ["AdminIcons"]
  },
  {
    name: "import-icon-metadata",
    path: "supabase/functions/import-icon-metadata",
    description: "Bulk imports icon metadata.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [
      { name: "metadata", type: "IconMetadata[]", required: true, description: "Metadata to import" },
    ],
    returns: "{ imported: number }",
    usedBy: ["AdminIcons"]
  },
  {
    name: "sync-icon-library",
    path: "supabase/functions/sync-icon-library",
    description: "Syncs icon library with storage.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [],
    returns: "{ synced: number, added: number, removed: number }",
    usedBy: ["AdminIcons"]
  },
  {
    name: "export-icon-library",
    path: "supabase/functions/export-icon-library",
    description: "Exports icon library as JSON.",
    category: "Icons",
    method: "GET",
    auth: "admin",
    params: [],
    returns: "{ icons: Icon[] }",
    usedBy: ["AdminIcons"]
  },
  {
    name: "analyze-question-icon",
    path: "supabase/functions/analyze-question-icon",
    description: "AI analyzes icon relevance.",
    category: "Icons",
    method: "POST",
    auth: "admin",
    params: [
      { name: "questionId", type: "string", required: true, description: "Question to analyze" },
    ],
    returns: "{ score: number, analysis: string }",
    usedBy: ["IconReviewCard"]
  },

  // ============= QUESTION QUALITY =============
  {
    name: "scan-question-quality",
    path: "supabase/functions/scan-question-quality",
    description: "AI quality analysis of questions.",
    category: "Quality",
    method: "POST",
    auth: "admin",
    params: [
      { name: "questionIds", type: "string[]", required: false, description: "Questions to scan" },
    ],
    returns: "{ results: QualityResult[] }",
    usedBy: ["AdminQuestions"]
  },
  {
    name: "shorten-questions",
    path: "supabase/functions/shorten-questions",
    description: "AI shortens long questions.",
    category: "Quality",
    method: "POST",
    auth: "admin",
    params: [
      { name: "questionIds", type: "string[]", required: true, description: "Questions to shorten" },
    ],
    returns: "{ shortened: number, results: ShortenResult[] }",
    usedBy: ["CombinedShortener"]
  },
  {
    name: "shorten-answers",
    path: "supabase/functions/shorten-answers",
    description: "AI shortens long answers.",
    category: "Quality",
    method: "POST",
    auth: "admin",
    params: [
      { name: "questionIds", type: "string[]", required: true, description: "Questions with long answers" },
    ],
    returns: "{ shortened: number, results: ShortenResult[] }",
    usedBy: ["CombinedShortener"]
  },
  {
    name: "translate-questions",
    path: "supabase/functions/translate-questions",
    description: "Translates questions between languages.",
    category: "Quality",
    method: "POST",
    auth: "admin",
    params: [
      { name: "questionIds", type: "string[]", required: true, description: "Questions to translate" },
      { name: "targetLanguage", type: "string", required: true, description: "Target language" },
    ],
    returns: "{ translated: number }",
    usedBy: ["AdminQuestions"]
  },
  {
    name: "verify-georgian-grammar",
    path: "supabase/functions/verify-georgian-grammar",
    description: "Georgian grammar and spelling check.",
    category: "Quality",
    method: "POST",
    auth: "admin",
    params: [
      { name: "text", type: "string", required: true, description: "Text to check" },
    ],
    returns: "{ valid: boolean, issues: GrammarIssue[] }",
    usedBy: ["QuestionEditor"]
  },

  // ============= PAYMENTS =============
  {
    name: "create-gem-checkout",
    path: "supabase/functions/create-gem-checkout",
    description: "Creates Stripe checkout session for gems.",
    category: "Payments",
    method: "POST",
    auth: "required",
    params: [
      { name: "productId", type: "string", required: true, description: "Gem package ID" },
      { name: "successUrl", type: "string", required: true, description: "Success redirect URL" },
      { name: "cancelUrl", type: "string", required: true, description: "Cancel redirect URL" },
    ],
    returns: "{ checkoutUrl: string, sessionId: string }",
    usedBy: ["useGemPurchase"]
  },
  {
    name: "stripe-gem-webhook",
    path: "supabase/functions/stripe-gem-webhook",
    description: "Handles Stripe payment webhooks.",
    category: "Payments",
    method: "POST",
    auth: "none",
    params: [],
    returns: "{ received: boolean }",
    usedBy: ["Stripe webhook"]
  },
  {
    name: "verify-receipt",
    path: "supabase/functions/verify-receipt",
    description: "Verifies iOS/Android purchase receipts.",
    category: "Payments",
    method: "POST",
    auth: "required",
    params: [
      { name: "receipt", type: "string", required: true, description: "Purchase receipt" },
      { name: "platform", type: "string", required: true, description: "ios or android" },
    ],
    returns: "{ valid: boolean, productId: string }",
    usedBy: ["useInAppPurchases"]
  },

  // ============= USER MANAGEMENT =============
  {
    name: "export-user-data",
    path: "supabase/functions/export-user-data",
    description: "GDPR data export for user.",
    category: "User",
    method: "POST",
    auth: "required",
    params: [],
    returns: "{ downloadUrl: string }",
    usedBy: ["PrivacyModal"]
  },
  {
    name: "delete-user-account",
    path: "supabase/functions/delete-user-account",
    description: "Permanently deletes user account.",
    category: "User",
    method: "POST",
    auth: "required",
    params: [
      { name: "confirmation", type: "string", required: true, description: "Confirmation text" },
    ],
    returns: "{ deleted: boolean }",
    usedBy: ["PrivacyModal"]
  },
  {
    name: "send-push-notification",
    path: "supabase/functions/send-push-notification",
    description: "Sends push notification to user.",
    category: "User",
    method: "POST",
    auth: "admin",
    params: [
      { name: "userId", type: "string", required: true, description: "Target user ID" },
      { name: "title", type: "string", required: true, description: "Notification title" },
      { name: "body", type: "string", required: true, description: "Notification body" },
    ],
    returns: "{ sent: boolean }",
    usedBy: ["Admin", "Notifications"]
  },
  {
    name: "notify-new-levels",
    path: "supabase/functions/notify-new-levels",
    description: "Notifies users of new levels.",
    category: "User",
    method: "POST",
    auth: "admin",
    params: [
      { name: "categoryId", type: "string", required: true, description: "Category with new levels" },
    ],
    returns: "{ notified: number }",
    usedBy: ["Admin"]
  },

  // ============= UTILITY =============
  {
    name: "fetch-url-metadata",
    path: "supabase/functions/fetch-url-metadata",
    description: "Fetches metadata from URL (title, description, image).",
    category: "Utility",
    method: "POST",
    auth: "required",
    params: [
      { name: "url", type: "string", required: true, description: "URL to fetch" },
    ],
    returns: "{ title: string, description: string, image: string }",
    usedBy: ["TriviaCreator", "LinkPreview"]
  },
];

export const EDGE_FUNCTION_CATEGORIES = [
  { id: "avatar", name: "Avatar", count: 5 },
  { id: "image", name: "Image Generation", count: 5 },
  { id: "trivia", name: "Trivia Generation", count: 9 },
  { id: "icons", name: "Icon Management", count: 16 },
  { id: "quality", name: "Question Quality", count: 5 },
  { id: "payments", name: "Payments", count: 3 },
  { id: "user", name: "User Management", count: 4 },
  { id: "utility", name: "Utility", count: 1 },
];
