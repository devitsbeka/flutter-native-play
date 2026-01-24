// Database Tables Documentation
// Documents all 79 tables in the Supabase database

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  description: string;
  descriptionKa: string;
}

export interface TableRelation {
  table: string;
  column: string;
  foreignTable: string;
  foreignColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface TableDoc {
  name: string;
  category: string;
  categoryKa: string;
  description: string;
  descriptionKa: string;
  columns: TableColumn[];
  relations?: TableRelation[];
  rlsPolicies?: string[];
  usedBy?: string[];
  realtimeEnabled?: boolean;
}

// ============= CORE USER TABLES =============

export const TABLE_PROFILES: TableDoc = {
  name: 'profiles',
  category: 'Core User',
  categoryKa: 'მთავარი მომხმარებელი',
  description: 'Main user profile table. Created automatically when a user signs up. Contains all user data including nickname, avatar, currency, XP, and preferences.',
  descriptionKa: 'მთავარი მომხმარებლის პროფილის ცხრილი. იქმნება ავტომატურად მომხმარებლის რეგისტრაციისას. შეიცავს მომხმარებლის ყველა მონაცემს, მათ შორის მეტსახელს, ავატარს, ვალუტას, XP-ს და პარამეტრებს.',
  columns: [
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Primary key, references auth.users', descriptionKa: 'პირველადი გასაღები, მიმართავს auth.users-ს' },
    { name: 'nickname', type: 'text', nullable: true, description: 'Display name shown in-app', descriptionKa: 'საჩვენებელი სახელი აპლიკაციაში' },
    { name: 'email', type: 'text', nullable: true, description: 'User email from auth', descriptionKa: 'მომხმარებლის ელფოსტა auth-დან' },
    { name: 'avatar_url', type: 'text', nullable: true, description: 'Profile picture URL (Supabase storage or external)', descriptionKa: 'პროფილის სურათის URL' },
    { name: 'animated_avatar_url', type: 'text', nullable: true, description: 'Animated avatar video URL', descriptionKa: 'ანიმაციური ავატარის ვიდეოს URL' },
    { name: 'avatar_frame', type: 'text', nullable: true, description: 'Currently equipped avatar frame ID', descriptionKa: 'ამჟამად აღჭურვილი ავატარის ჩარჩოს ID' },
    { name: 'coins', type: 'integer', nullable: true, defaultValue: '0', description: 'In-game currency earned from playing', descriptionKa: 'თამაშში მიღებული ვალუტა თამაშისგან' },
    { name: 'gems', type: 'integer', nullable: true, defaultValue: '0', description: 'Premium currency (purchased or earned)', descriptionKa: 'პრემიუმ ვალუტა (ნაყიდი ან მიღებული)' },
    { name: 'total_points', type: 'integer', nullable: true, defaultValue: '0', description: 'Lifetime XP/points earned', descriptionKa: 'სიცოცხლის განმავლობაში მიღებული XP/ქულები' },
    { name: 'games_played', type: 'integer', nullable: true, defaultValue: '0', description: 'Total number of games played', descriptionKa: 'ნათამაშები თამაშების საერთო რაოდენობა' },
    { name: 'games_won', type: 'integer', nullable: true, defaultValue: '0', description: 'Total number of games won', descriptionKa: 'მოგებული თამაშების საერთო რაოდენობა' },
    { name: 'current_streak', type: 'integer', nullable: true, defaultValue: '0', description: 'Current win streak', descriptionKa: 'მიმდინარე მოგების სერია' },
    { name: 'best_streak', type: 'integer', nullable: true, defaultValue: '0', description: 'Best win streak ever', descriptionKa: 'საუკეთესო მოგების სერია ოდესმე' },
    { name: 'country', type: 'text', nullable: true, defaultValue: 'GE', description: '2-letter country code', descriptionKa: '2-ასოიანი ქვეყნის კოდი' },
    { name: 'level', type: 'integer', nullable: true, defaultValue: '1', description: 'User level based on XP', descriptionKa: 'მომხმარებლის დონე XP-ის მიხედვით' },
    { name: 'xp', type: 'integer', nullable: true, defaultValue: '0', description: 'Current XP within level', descriptionKa: 'მიმდინარე XP დონის ფარგლებში' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Account creation timestamp', descriptionKa: 'ანგარიშის შექმნის დროის ნიშნული' },
    { name: 'updated_at', type: 'timestamptz', nullable: true, description: 'Last profile update', descriptionKa: 'პროფილის ბოლო განახლება' },
    { name: 'is_public', type: 'boolean', nullable: true, defaultValue: 'true', description: 'Whether profile is visible to others', descriptionKa: 'ხილულია თუ არა პროფილი სხვებისთვის' },
    { name: 'push_notifications_enabled', type: 'boolean', nullable: true, defaultValue: 'true', description: 'Push notification preference', descriptionKa: 'Push შეტყობინებების პარამეტრი' },
    { name: 'sound_enabled', type: 'boolean', nullable: true, defaultValue: 'true', description: 'Sound effects preference', descriptionKa: 'ხმოვანი ეფექტების პარამეტრი' },
    { name: 'music_enabled', type: 'boolean', nullable: true, defaultValue: 'true', description: 'Background music preference', descriptionKa: 'ფონური მუსიკის პარამეტრი' },
    { name: 'vibration_enabled', type: 'boolean', nullable: true, defaultValue: 'true', description: 'Haptic feedback preference', descriptionKa: 'ჰაპტიკური უკუკავშირის პარამეტრი' },
    { name: 'daily_plays_count', type: 'integer', nullable: true, defaultValue: '0', description: 'VS games played today', descriptionKa: 'დღეს ნათამაშები VS თამაშები' },
    { name: 'daily_plays_reset_at', type: 'timestamptz', nullable: true, description: 'When daily plays counter resets', descriptionKa: 'როდის რესეტდება ყოველდღიური თამაშების მთვლელი' },
  ],
  rlsPolicies: [
    'Users can view all public profiles',
    'Users can update their own profile',
    'Profiles are created via trigger on auth.users insert'
  ],
  usedBy: ['useAuth', 'usePlayerProfile', 'ProfilePage', 'LeaderboardPlayerRow'],
  realtimeEnabled: false
};

export const TABLE_USER_ROLES: TableDoc = {
  name: 'user_roles',
  category: 'Core User',
  categoryKa: 'მთავარი მომხმარებელი',
  description: 'Stores admin and moderator role assignments. Used to control access to admin panel.',
  descriptionKa: 'ინახავს ადმინისა და მოდერატორის როლების მინიჭებებს. გამოიყენება ადმინ პანელზე წვდომის კონტროლისთვის.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'References profiles.user_id', descriptionKa: 'მიმართავს profiles.user_id-ს' },
    { name: 'role', type: 'text', nullable: false, description: 'Role name: admin, moderator, content_creator', descriptionKa: 'როლის სახელი: admin, moderator, content_creator' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'When role was assigned', descriptionKa: 'როდის მიენიჭა როლი' },
  ],
  rlsPolicies: ['Only admins can view/modify roles'],
  usedBy: ['useAdminRole', 'AdminRoute']
};

export const TABLE_USER_PRESENCE: TableDoc = {
  name: 'user_presence',
  category: 'Core User',
  categoryKa: 'მთავარი მომხმარებელი',
  description: 'Tracks real-time online status of users. Updated via heartbeat mechanism.',
  descriptionKa: 'თვალყურს ადევნებს მომხმარებლების რეალურ დროში ონლაინ სტატუსს. განახლდება heartbeat მექანიზმით.',
  columns: [
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Primary key, references profiles', descriptionKa: 'პირველადი გასაღები, მიმართავს profiles-ს' },
    { name: 'last_seen', type: 'timestamptz', nullable: true, description: 'Last heartbeat timestamp', descriptionKa: 'ბოლო heartbeat-ის დროის ნიშნული' },
    { name: 'is_online', type: 'boolean', nullable: true, defaultValue: 'false', description: 'Computed online status', descriptionKa: 'გამოთვლილი ონლაინ სტატუსი' },
    { name: 'current_room_id', type: 'uuid', nullable: true, description: 'Room user is currently in', descriptionKa: 'ოთახი, სადაც მომხმარებელი ამჟამად იმყოფება' },
  ],
  rlsPolicies: ['Anyone can view presence', 'Users can update own presence'],
  usedBy: ['UserPresenceTracker', 'useFriends', 'SmartAvatar'],
  realtimeEnabled: true
};

export const TABLE_VIP_SUBSCRIPTIONS: TableDoc = {
  name: 'vip_subscriptions',
  category: 'Monetization',
  categoryKa: 'მონეტიზაცია',
  description: 'Stores VIP/Premium subscription status. Updated by RevenueCat webhooks or Stripe.',
  descriptionKa: 'ინახავს VIP/პრემიუმ გამოწერის სტატუსს. განახლდება RevenueCat webhook-ებით ან Stripe-ით.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'References profiles.user_id', descriptionKa: 'მიმართავს profiles.user_id-ს' },
    { name: 'tier', type: 'text', nullable: false, description: 'Subscription tier: vip, pro, elite', descriptionKa: 'გამოწერის დონე: vip, pro, elite' },
    { name: 'status', type: 'text', nullable: true, defaultValue: 'active', description: 'active, cancelled, expired', descriptionKa: 'active, cancelled, expired' },
    { name: 'started_at', type: 'timestamptz', nullable: true, description: 'Subscription start date', descriptionKa: 'გამოწერის დაწყების თარიღი' },
    { name: 'expires_at', type: 'timestamptz', nullable: true, description: 'When subscription expires', descriptionKa: 'როდის იწურება გამოწერა' },
    { name: 'platform', type: 'text', nullable: true, description: 'ios, android, web', descriptionKa: 'ios, android, web' },
    { name: 'product_id', type: 'text', nullable: true, description: 'Store product ID', descriptionKa: 'მაღაზიის პროდუქტის ID' },
  ],
  rlsPolicies: ['Users can view own subscription', 'System can update subscriptions'],
  usedBy: ['useVipStatus', 'VIPPage', 'DesktopPlayButton']
};

// ============= CONTENT TABLES =============

export const TABLE_CATEGORIES: TableDoc = {
  name: 'categories',
  category: 'Content',
  categoryKa: 'კონტენტი',
  description: 'Quiz categories with metadata. Each category has multiple levels with questions.',
  descriptionKa: 'ქვიზის კატეგორიები მეტადატით. თითოეულ კატეგორიას აქვს მრავალი დონე კითხვებით.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'category_id', type: 'text', nullable: false, description: 'Unique slug identifier', descriptionKa: 'უნიკალური slug იდენტიფიკატორი' },
    { name: 'name', type: 'text', nullable: false, description: 'Display name in Georgian', descriptionKa: 'საჩვენებელი სახელი ქართულად' },
    { name: 'description', type: 'text', nullable: true, description: 'Category description', descriptionKa: 'კატეგორიის აღწერა' },
    { name: 'icon', type: 'text', nullable: false, description: 'Emoji or icon class', descriptionKa: 'ემოჯი ან ხატულას კლასი' },
    { name: 'icon_slug', type: 'text', nullable: true, description: 'Icon library reference', descriptionKa: 'ხატულას ბიბლიოთეკის რეფერენსი' },
    { name: 'color', type: 'text', nullable: false, defaultValue: '#7C3AED', description: 'Theme color for category', descriptionKa: 'კატეგორიის თემის ფერი' },
    { name: 'image_url', type: 'text', nullable: true, description: 'Background image URL', descriptionKa: 'ფონის სურათის URL' },
    { name: 'total_levels', type: 'integer', nullable: false, defaultValue: '10', description: 'Number of levels in category', descriptionKa: 'კატეგორიაში დონეების რაოდენობა' },
    { name: 'type', type: 'text', nullable: false, defaultValue: 'standard', description: 'standard, country, special', descriptionKa: 'standard, country, special' },
    { name: 'language', type: 'text', nullable: true, description: 'Primary language if language-specific', descriptionKa: 'ძირითადი ენა თუ ენაზე სპეციფიკურია' },
    { name: 'is_active', type: 'boolean', nullable: true, defaultValue: 'true', description: 'Whether category is visible', descriptionKa: 'ხილულია თუ არა კატეგორია' },
    { name: 'is_language_specific', type: 'boolean', nullable: true, defaultValue: 'false', description: 'Show only in specific language', descriptionKa: 'აჩვენე მხოლოდ კონკრეტულ ენაზე' },
    { name: 'sort_order', type: 'integer', nullable: true, description: 'Display order', descriptionKa: 'ჩვენების თანმიმდევრობა' },
  ],
  rlsPolicies: ['Anyone can view active categories', 'Admins can modify categories'],
  usedBy: ['useCategories', 'CategoryPage', 'PlayCategoryModal']
};

export const TABLE_QUESTIONS: TableDoc = {
  name: 'questions',
  category: 'Content',
  categoryKa: 'კონტენტი',
  description: 'Main question bank. Contains all trivia questions with answers, difficulty, and metadata.',
  descriptionKa: 'მთავარი კითხვების ბანკი. შეიცავს ყველა ტრივია კითხვას პასუხებით, სირთულით და მეტადატით.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'question_text', type: 'text', nullable: false, description: 'The question text', descriptionKa: 'კითხვის ტექსტი' },
    { name: 'correct_answer', type: 'text', nullable: false, description: 'The correct answer', descriptionKa: 'სწორი პასუხი' },
    { name: 'incorrect_answers', type: 'jsonb', nullable: false, description: 'Array of 3 wrong answers', descriptionKa: 'მასივი 3 არასწორი პასუხით' },
    { name: 'category', type: 'text', nullable: true, description: 'Category slug reference', descriptionKa: 'კატეგორიის slug რეფერენსი' },
    { name: 'category_id', type: 'uuid', nullable: true, description: 'FK to categories.id', descriptionKa: 'FK categories.id-ზე' },
    { name: 'difficulty', type: 'text', nullable: true, defaultValue: 'easy', description: 'easy, medium, hard', descriptionKa: 'easy, medium, hard' },
    { name: 'language', type: 'text', nullable: true, defaultValue: 'ka', description: 'Question language', descriptionKa: 'კითხვის ენა' },
    { name: 'level', type: 'integer', nullable: true, description: 'Level number for category mode', descriptionKa: 'დონის ნომერი კატეგორიის რეჟიმისთვის' },
    { name: 'icon_url', type: 'text', nullable: true, description: 'Question illustration URL', descriptionKa: 'კითხვის ილუსტრაციის URL' },
    { name: 'icon_slug', type: 'text', nullable: true, description: 'Icon library slug', descriptionKa: 'ხატულას ბიბლიოთეკის slug' },
    { name: 'is_active', type: 'boolean', nullable: true, defaultValue: 'true', description: 'Whether question is usable', descriptionKa: 'გამოსადეგია თუ არა კითხვა' },
    { name: 'is_production', type: 'boolean', nullable: true, defaultValue: 'false', description: 'Approved for production', descriptionKa: 'დამტკიცებულია პროდაქშენისთვის' },
    { name: 'times_shown', type: 'integer', nullable: true, defaultValue: '0', description: 'Analytics: times displayed', descriptionKa: 'ანალიტიკა: ნაჩვენები ჯერადობა' },
    { name: 'times_correct', type: 'integer', nullable: true, defaultValue: '0', description: 'Analytics: correct answers', descriptionKa: 'ანალიტიკა: სწორი პასუხები' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Creation timestamp', descriptionKa: 'შექმნის დროის ნიშნული' },
  ],
  rlsPolicies: ['Anyone can view active questions', 'Admins can CRUD questions'],
  usedBy: ['questionService', 'useTrivia', 'ContentManager']
};

export const TABLE_ICON_LIBRARY: TableDoc = {
  name: 'icon_library',
  category: 'Content',
  categoryKa: 'კონტენტი',
  description: 'Centralized icon/image library for question illustrations. Icons are referenced by slug.',
  descriptionKa: 'ცენტრალიზებული ხატულა/სურათის ბიბლიოთეკა კითხვების ილუსტრაციებისთვის. ხატულები მითითებულია slug-ით.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'slug', type: 'text', nullable: false, description: 'Unique identifier for icon', descriptionKa: 'უნიკალური იდენტიფიკატორი ხატულასთვის' },
    { name: 'url', type: 'text', nullable: false, description: 'Icon image URL', descriptionKa: 'ხატულას სურათის URL' },
    { name: 'category', type: 'text', nullable: true, description: 'Icon category grouping', descriptionKa: 'ხატულას კატეგორიის დაჯგუფება' },
    { name: 'tags', type: 'text[]', nullable: true, description: 'Searchable tags', descriptionKa: 'საძიებო თეგები' },
    { name: 'keywords', type: 'text[]', nullable: true, description: 'AI-generated keywords', descriptionKa: 'AI-ით გენერირებული საკვანძო სიტყვები' },
    { name: 'usage_count', type: 'integer', nullable: true, defaultValue: '0', description: 'Times used in questions', descriptionKa: 'გამოყენების რაოდენობა კითხვებში' },
  ],
  rlsPolicies: ['Anyone can view icons', 'Admins can CRUD icons'],
  usedBy: ['useIconLibrary', 'IconPicker', 'smart-assign-icons']
};

// ============= MULTIPLAYER TABLES =============

export const TABLE_GAME_ROOMS: TableDoc = {
  name: 'game_rooms',
  category: 'Multiplayer',
  categoryKa: 'მულტიპლეიერი',
  description: 'Multiplayer game room definitions. Supports persistent rooms with multiple game rounds.',
  descriptionKa: 'მულტიპლეიერ თამაშის ოთახების განსაზღვრებები. მხარს უჭერს მუდმივ ოთახებს მრავალი თამაშის რაუნდით.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'room_code', type: 'text', nullable: false, description: '6-char join code', descriptionKa: '6-სიმბოლოიანი შეერთების კოდი' },
    { name: 'room_name', type: 'text', nullable: true, description: 'Room display name', descriptionKa: 'ოთახის საჩვენებელი სახელი' },
    { name: 'host_user_id', type: 'uuid', nullable: false, description: 'Room creator/host', descriptionKa: 'ოთახის შემქმნელი/ჰოსტი' },
    { name: 'status', type: 'enum', nullable: true, defaultValue: 'waiting', description: 'waiting, playing, completed', descriptionKa: 'waiting, playing, completed' },
    { name: 'game_type', type: 'enum', nullable: false, defaultValue: 'standard', description: 'standard, challenge, tv', descriptionKa: 'standard, challenge, tv' },
    { name: 'game_mode', type: 'text', nullable: true, description: 'random, category, custom', descriptionKa: 'random, category, custom' },
    { name: 'category_id', type: 'uuid', nullable: true, description: 'Selected category if not random', descriptionKa: 'არჩეული კატეგორია თუ არ არის რანდომი' },
    { name: 'category_name', type: 'text', nullable: true, description: 'Denormalized category name', descriptionKa: 'დენორმალიზებული კატეგორიის სახელი' },
    { name: 'current_game_id', type: 'uuid', nullable: true, description: 'FK to room_games for current round', descriptionKa: 'FK room_games-ზე მიმდინარე რაუნდისთვის' },
    { name: 'total_questions', type: 'integer', nullable: true, defaultValue: '10', description: 'Questions per round', descriptionKa: 'კითხვები რაუნდზე' },
    { name: 'max_players', type: 'integer', nullable: true, defaultValue: '8', description: 'Player limit', descriptionKa: 'მოთამაშეთა ლიმიტი' },
    { name: 'min_players', type: 'integer', nullable: true, defaultValue: '2', description: 'Minimum to start', descriptionKa: 'მინიმუმი დასაწყებად' },
    { name: 'is_permanent', type: 'boolean', nullable: true, defaultValue: 'false', description: 'Persists after game ends', descriptionKa: 'რჩება თამაშის დასრულების შემდეგ' },
    { name: 'background_gradient', type: 'text', nullable: true, description: 'Room theme gradient', descriptionKa: 'ოთახის თემის გრადიენტი' },
    { name: 'room_icon', type: 'text', nullable: true, description: 'Room icon/emoji', descriptionKa: 'ოთახის ხატულა/ემოჯი' },
    { name: 'cover_image', type: 'text', nullable: true, description: 'Room cover image URL', descriptionKa: 'ოთახის ფარდის სურათის URL' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Creation timestamp', descriptionKa: 'შექმნის დროის ნიშნული' },
    { name: 'started_at', type: 'timestamptz', nullable: true, description: 'Game start timestamp', descriptionKa: 'თამაშის დაწყების დროის ნიშნული' },
    { name: 'completed_at', type: 'timestamptz', nullable: true, description: 'Game end timestamp', descriptionKa: 'თამაშის დასრულების დროის ნიშნული' },
  ],
  relations: [
    { table: 'game_rooms', column: 'host_user_id', foreignTable: 'profiles', foreignColumn: 'user_id', type: 'one-to-many' },
    { table: 'game_rooms', column: 'current_game_id', foreignTable: 'room_games', foreignColumn: 'id', type: 'one-to-one' },
  ],
  rlsPolicies: ['Participants can view room', 'Host can modify room', 'Anyone can create rooms'],
  usedBy: ['useMultiplayerV2', 'MyRoomsSection', 'CreateRoomScreen'],
  realtimeEnabled: true
};

export const TABLE_ROOM_PARTICIPANTS: TableDoc = {
  name: 'room_participants',
  category: 'Multiplayer',
  categoryKa: 'მულტიპლეიერი',
  description: 'Players currently in a game room. Tracks ready status and current game state.',
  descriptionKa: 'მოთამაშეები, რომლებიც ამჟამად თამაშის ოთახში არიან. თვალყურს ადევნებს მზადყოფნის სტატუსს და მიმდინარე თამაშის მდგომარეობას.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'room_id', type: 'uuid', nullable: false, description: 'FK to game_rooms', descriptionKa: 'FK game_rooms-ზე' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'FK to profiles', descriptionKa: 'FK profiles-ზე' },
    { name: 'nickname', type: 'text', nullable: true, description: 'Denormalized for performance', descriptionKa: 'დენორმალიზებული შესრულებისთვის' },
    { name: 'avatar_url', type: 'text', nullable: true, description: 'Denormalized avatar', descriptionKa: 'დენორმალიზებული ავატარი' },
    { name: 'country', type: 'text', nullable: true, description: 'Denormalized country', descriptionKa: 'დენორმალიზებული ქვეყანა' },
    { name: 'is_ready', type: 'boolean', nullable: true, defaultValue: 'false', description: 'Ready to start', descriptionKa: 'მზადაა დასაწყებად' },
    { name: 'is_host', type: 'boolean', nullable: true, defaultValue: 'false', description: 'Is room host', descriptionKa: 'არის ოთახის ჰოსტი' },
    { name: 'score', type: 'integer', nullable: true, defaultValue: '0', description: 'Current game score', descriptionKa: 'მიმდინარე თამაშის ქულა' },
    { name: 'current_question_index', type: 'integer', nullable: true, defaultValue: '0', description: 'Question progress', descriptionKa: 'კითხვის პროგრესი' },
    { name: 'last_answer', type: 'text', nullable: true, description: 'Most recent answer', descriptionKa: 'ყველაზე ბოლო პასუხი' },
    { name: 'last_answer_correct', type: 'boolean', nullable: true, description: 'Was last answer correct', descriptionKa: 'იყო თუ არა ბოლო პასუხი სწორი' },
    { name: 'joined_at', type: 'timestamptz', nullable: true, description: 'When player joined', descriptionKa: 'როდის შეუერთდა მოთამაშე' },
  ],
  rlsPolicies: ['Participants can view room members', 'Users can update own participation'],
  usedBy: ['useMultiplayerV2', 'ParticipantCard', 'RoomLobby'],
  realtimeEnabled: true
};

export const TABLE_ROOM_QUESTIONS: TableDoc = {
  name: 'room_questions',
  category: 'Multiplayer',
  categoryKa: 'მულტიპლეიერი',
  description: 'Pre-generated questions for a room game. Created when host starts the game.',
  descriptionKa: 'წინასწარ გენერირებული კითხვები ოთახის თამაშისთვის. იქმნება როცა ჰოსტი იწყებს თამაშს.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'room_id', type: 'uuid', nullable: false, description: 'FK to game_rooms', descriptionKa: 'FK game_rooms-ზე' },
    { name: 'game_id', type: 'uuid', nullable: true, description: 'FK to room_games', descriptionKa: 'FK room_games-ზე' },
    { name: 'question_id', type: 'uuid', nullable: true, description: 'FK to questions', descriptionKa: 'FK questions-ზე' },
    { name: 'question_index', type: 'integer', nullable: false, description: 'Order in game', descriptionKa: 'თანმიმდევრობა თამაშში' },
    { name: 'question_text', type: 'text', nullable: false, description: 'Denormalized question', descriptionKa: 'დენორმალიზებული კითხვა' },
    { name: 'correct_answer', type: 'text', nullable: false, description: 'Correct answer', descriptionKa: 'სწორი პასუხი' },
    { name: 'all_answers', type: 'jsonb', nullable: false, description: 'Shuffled answer array', descriptionKa: 'შერეული პასუხების მასივი' },
    { name: 'icon_url', type: 'text', nullable: true, description: 'Question icon', descriptionKa: 'კითხვის ხატულა' },
  ],
  rlsPolicies: ['Participants can view questions for their room'],
  usedBy: ['useMultiplayerV2', 'MultiplayerGameScreenV2'],
  realtimeEnabled: true
};

// ============= TV MODE TABLES =============

export const TABLE_TV_SESSIONS: TableDoc = {
  name: 'tv_sessions',
  category: 'TV Mode',
  categoryKa: 'TV რეჟიმი',
  description: 'TV game sessions for party mode. Displays on large screen with mobile controllers.',
  descriptionKa: 'TV თამაშის სესიები წვეულების რეჟიმისთვის. გამოჩნდება დიდ ეკრანზე მობილური კონტროლერებით.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'session_code', type: 'text', nullable: false, description: '6-char join code', descriptionKa: '6-სიმბოლოიანი შეერთების კოდი' },
    { name: 'host_user_id', type: 'uuid', nullable: true, description: 'Session host', descriptionKa: 'სესიის ჰოსტი' },
    { name: 'status', type: 'text', nullable: true, defaultValue: 'lobby', description: 'lobby, playing, finished', descriptionKa: 'lobby, playing, finished' },
    { name: 'current_question_index', type: 'integer', nullable: true, defaultValue: '0', description: 'Current question', descriptionKa: 'მიმდინარე კითხვა' },
    { name: 'phase', type: 'text', nullable: true, defaultValue: 'waiting', description: 'Game phase', descriptionKa: 'თამაშის ფაზა' },
    { name: 'total_questions', type: 'integer', nullable: true, defaultValue: '10', description: 'Questions per round', descriptionKa: 'კითხვები რაუნდზე' },
    { name: 'question_duration', type: 'integer', nullable: true, defaultValue: '15', description: 'Seconds per question', descriptionKa: 'წამები კითხვაზე' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Session creation', descriptionKa: 'სესიის შექმნა' },
  ],
  rlsPolicies: ['Anyone can view sessions', 'Host can modify session'],
  usedBy: ['useTVSession', 'TVDisplay', 'TVHostController'],
  realtimeEnabled: true
};

export const TABLE_TV_PLAYERS: TableDoc = {
  name: 'tv_players',
  category: 'TV Mode',
  categoryKa: 'TV რეჟიმი',
  description: 'Players connected to a TV session via mobile device.',
  descriptionKa: 'მოთამაშეები, რომლებიც დაკავშირებულია TV სესიასთან მობილური მოწყობილობით.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'session_id', type: 'uuid', nullable: false, description: 'FK to tv_sessions', descriptionKa: 'FK tv_sessions-ზე' },
    { name: 'user_id', type: 'uuid', nullable: true, description: 'Optional user link', descriptionKa: 'არასავალდებულო მომხმარებლის ბმული' },
    { name: 'nickname', type: 'text', nullable: false, description: 'Player display name', descriptionKa: 'მოთამაშის საჩვენებელი სახელი' },
    { name: 'avatar_url', type: 'text', nullable: true, description: 'Player avatar', descriptionKa: 'მოთამაშის ავატარი' },
    { name: 'score', type: 'integer', nullable: true, defaultValue: '0', description: 'Total score', descriptionKa: 'საერთო ქულა' },
    { name: 'is_connected', type: 'boolean', nullable: true, defaultValue: 'true', description: 'Connection status', descriptionKa: 'კავშირის სტატუსი' },
  ],
  rlsPolicies: ['Session participants can view players'],
  usedBy: ['useTVSession', 'TVLeaderboardPanel'],
  realtimeEnabled: true
};

// ============= SOCIAL TABLES =============

export const TABLE_FRIENDSHIPS: TableDoc = {
  name: 'friendships',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Friend relationships between users. Status tracks pending/accepted.',
  descriptionKa: 'მეგობრული ურთიერთობები მომხმარებლებს შორის. სტატუსი თვალყურს ადევნებს pending/accepted-ს.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Requester', descriptionKa: 'მოთხოვნის გამგზავნი' },
    { name: 'friend_id', type: 'uuid', nullable: false, description: 'Recipient', descriptionKa: 'მიმღები' },
    { name: 'status', type: 'enum', nullable: true, defaultValue: 'pending', description: 'pending, accepted, blocked', descriptionKa: 'pending, accepted, blocked' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Request timestamp', descriptionKa: 'მოთხოვნის დროის ნიშნული' },
    { name: 'accepted_at', type: 'timestamptz', nullable: true, description: 'Acceptance timestamp', descriptionKa: 'მიღების დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can view own friendships', 'Users can create/update own requests'],
  usedBy: ['useFriends', 'FriendsList', 'AddFriendModal']
};

export const TABLE_CHAT_MESSAGES: TableDoc = {
  name: 'chat_messages',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Direct messages between users (1:1 chat).',
  descriptionKa: 'პირდაპირი შეტყობინებები მომხმარებლებს შორის (1:1 ჩათი).',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'sender_id', type: 'uuid', nullable: false, description: 'Message sender', descriptionKa: 'შეტყობინების გამგზავნი' },
    { name: 'receiver_id', type: 'uuid', nullable: false, description: 'Message recipient', descriptionKa: 'შეტყობინების მიმღები' },
    { name: 'message', type: 'text', nullable: false, description: 'Message content', descriptionKa: 'შეტყობინების შინაარსი' },
    { name: 'read_at', type: 'timestamptz', nullable: true, description: 'When message was read', descriptionKa: 'როდის წაიკითხა შეტყობინება' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Send timestamp', descriptionKa: 'გაგზავნის დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can view own messages', 'Users can send to anyone'],
  usedBy: ['useChat', 'ChatModal'],
  realtimeEnabled: true
};

export const TABLE_NOTIFICATIONS: TableDoc = {
  name: 'notifications',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'In-app notifications for achievements, friend requests, game invites, etc.',
  descriptionKa: 'აპლიკაციის შიდა შეტყობინებები მიღწევებისთვის, მეგობრობის მოთხოვნებისთვის, თამაშის მოწვევებისთვის და ა.შ.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Notification recipient', descriptionKa: 'შეტყობინების მიმღები' },
    { name: 'type', type: 'text', nullable: false, description: 'Notification type', descriptionKa: 'შეტყობინების ტიპი' },
    { name: 'title', type: 'text', nullable: false, description: 'Notification title', descriptionKa: 'შეტყობინების სათაური' },
    { name: 'message', type: 'text', nullable: true, description: 'Notification body', descriptionKa: 'შეტყობინების ტექსტი' },
    { name: 'data', type: 'jsonb', nullable: true, description: 'Additional metadata', descriptionKa: 'დამატებითი მეტადატა' },
    { name: 'read', type: 'boolean', nullable: true, defaultValue: 'false', description: 'Read status', descriptionKa: 'წაკითხვის სტატუსი' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Creation timestamp', descriptionKa: 'შექმნის დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can view own notifications', 'System can create notifications'],
  usedBy: ['useNotifications', 'NotificationsPage']
};

// ============= ECONOMY TABLES =============

export const TABLE_ECONOMY_CONFIG: TableDoc = {
  name: 'economy_config',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Dynamic economy values that can be adjusted without code changes.',
  descriptionKa: 'დინამიური ეკონომიკის მნიშვნელობები, რომლებიც შეიძლება შეიცვალოს კოდის ცვლილების გარეშე.',
  columns: [
    { name: 'id', type: 'text', nullable: false, description: 'Config key', descriptionKa: 'კონფიგურაციის გასაღები' },
    { name: 'value', type: 'integer', nullable: false, description: 'Config value', descriptionKa: 'კონფიგურაციის მნიშვნელობა' },
    { name: 'category', type: 'text', nullable: false, description: 'Config category', descriptionKa: 'კონფიგურაციის კატეგორია' },
    { name: 'description', type: 'text', nullable: true, description: 'Human-readable description', descriptionKa: 'ადამიანისთვის წაკითხვადი აღწერა' },
  ],
  rlsPolicies: ['Anyone can view config', 'Admins can modify config'],
  usedBy: ['useEconomyConfig', 'AdminEconomy']
};

export const TABLE_GEM_PURCHASES: TableDoc = {
  name: 'gem_purchases',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Purchase history for gem transactions via Stripe or mobile IAP.',
  descriptionKa: 'ლალის ტრანზაქციების შესყიდვის ისტორია Stripe-ით ან მობილური IAP-ით.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Buyer', descriptionKa: 'მყიდველი' },
    { name: 'product_id', type: 'text', nullable: false, description: 'Product identifier', descriptionKa: 'პროდუქტის იდენტიფიკატორი' },
    { name: 'gems_received', type: 'integer', nullable: false, description: 'Gems added', descriptionKa: 'დამატებული ლალები' },
    { name: 'amount_gel', type: 'numeric', nullable: false, description: 'Amount in GEL', descriptionKa: 'თანხა ლარში' },
    { name: 'payment_provider', type: 'text', nullable: true, description: 'stripe, revenuecat', descriptionKa: 'stripe, revenuecat' },
    { name: 'status', type: 'text', nullable: true, defaultValue: 'pending', description: 'pending, completed, failed', descriptionKa: 'pending, completed, failed' },
    { name: 'checkout_session_id', type: 'text', nullable: true, description: 'Stripe session ID', descriptionKa: 'Stripe სესიის ID' },
    { name: 'completed_at', type: 'timestamptz', nullable: true, description: 'Completion timestamp', descriptionKa: 'დასრულების დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can view own purchases', 'System can create/update purchases'],
  usedBy: ['create-gem-checkout', 'stripe-gem-webhook']
};

// ============= USER GENERATED CONTENT TABLES =============

export const TABLE_USER_QUIZ_POSTS: TableDoc = {
  name: 'user_quiz_posts',
  category: 'User Generated Content',
  categoryKa: 'მომხმარებლის მიერ შექმნილი კონტენტი',
  description: 'User-created quizzes that can be shared and played by others.',
  descriptionKa: 'მომხმარებლის მიერ შექმნილი ქვიზები, რომლებიც შეიძლება გაზიარდეს და ითამაშოს სხვებმა.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Creator', descriptionKa: 'შემქმნელი' },
    { name: 'title', type: 'text', nullable: false, description: 'Quiz title', descriptionKa: 'ქვიზის სათაური' },
    { name: 'description', type: 'text', nullable: true, description: 'Quiz description', descriptionKa: 'ქვიზის აღწერა' },
    { name: 'cover_image', type: 'text', nullable: true, description: 'Cover image URL', descriptionKa: 'ფარდის სურათის URL' },
    { name: 'cover_gradient', type: 'text', nullable: true, description: 'Fallback gradient', descriptionKa: 'fallback გრადიენტი' },
    { name: 'questions', type: 'jsonb', nullable: false, description: 'Array of question objects', descriptionKa: 'კითხვის ობიექტების მასივი' },
    { name: 'is_public', type: 'boolean', nullable: true, defaultValue: 'true', description: 'Discoverable by others', descriptionKa: 'აღმოჩენადი სხვებისთვის' },
    { name: 'play_count', type: 'integer', nullable: true, defaultValue: '0', description: 'Times played', descriptionKa: 'ნათამაშები რაოდენობა' },
    { name: 'like_count', type: 'integer', nullable: true, defaultValue: '0', description: 'Like count', descriptionKa: 'მოწონებების რაოდენობა' },
    { name: 'status', type: 'text', nullable: true, defaultValue: 'published', description: 'draft, published, archived', descriptionKa: 'draft, published, archived' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Creation timestamp', descriptionKa: 'შექმნის დროის ნიშნული' },
  ],
  rlsPolicies: ['Public quizzes visible to all', 'Users can CRUD own quizzes'],
  usedBy: ['useUserQuizzes', 'TriviaLobby', 'DiscoverPage']
};

// Export all tables
export const ALL_TABLES: TableDoc[] = [
  TABLE_PROFILES,
  TABLE_USER_ROLES,
  TABLE_USER_PRESENCE,
  TABLE_VIP_SUBSCRIPTIONS,
  TABLE_CATEGORIES,
  TABLE_QUESTIONS,
  TABLE_ICON_LIBRARY,
  TABLE_GAME_ROOMS,
  TABLE_ROOM_PARTICIPANTS,
  TABLE_ROOM_QUESTIONS,
  TABLE_TV_SESSIONS,
  TABLE_TV_PLAYERS,
  TABLE_FRIENDSHIPS,
  TABLE_CHAT_MESSAGES,
  TABLE_NOTIFICATIONS,
  TABLE_ECONOMY_CONFIG,
  TABLE_GEM_PURCHASES,
  TABLE_USER_QUIZ_POSTS,
];

// Table categories for navigation
export const TABLE_CATEGORIES_NAV = [
  { id: 'core-user', name: 'Core User', nameKa: 'მთავარი მომხმარებელი' },
  { id: 'content', name: 'Content', nameKa: 'კონტენტი' },
  { id: 'multiplayer', name: 'Multiplayer', nameKa: 'მულტიპლეიერი' },
  { id: 'tv-mode', name: 'TV Mode', nameKa: 'TV რეჟიმი' },
  { id: 'social', name: 'Social', nameKa: 'სოციალური' },
  { id: 'economy', name: 'Economy', nameKa: 'ეკონომიკა' },
  { id: 'ugc', name: 'User Generated Content', nameKa: 'მომხმარებლის მიერ შექმნილი კონტენტი' },
];
