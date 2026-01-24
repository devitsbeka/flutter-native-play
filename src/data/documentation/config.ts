// Configuration Files Documentation
// Documents all configuration files in the project

export interface ConfigValue {
  key: string;
  type: string;
  description: string;
  descriptionKa: string;
  example?: string;
}

export interface ConfigDoc {
  name: string;
  category: string;
  categoryKa: string;
  description: string;
  descriptionKa: string;
  filePath: string;
  values: ConfigValue[];
}

export const CONFIG_ECONOMY: ConfigDoc = {
  name: 'economyConfig',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Default economy values for coins, gems, rewards, and costs. These can be overridden by database values.',
  descriptionKa: 'ნაგულისხმევი ეკონომიკის მნიშვნელობები მონეტებისთვის, ლალებისთვის, ჯილდოებისთვის და ღირებულებებისთვის. ეს შეიძლება გადაიწეროს მონაცემთა ბაზის მნიშვნელობებით.',
  filePath: 'src/config/economyConfig.ts',
  values: [
    { key: 'COINS_PER_CORRECT_ANSWER', type: 'number', description: 'Coins earned per correct answer', descriptionKa: 'მონეტები მიღებული სწორ პასუხზე', example: '10' },
    { key: 'COINS_PER_WIN', type: 'number', description: 'Bonus coins for winning a game', descriptionKa: 'ბონუს მონეტები თამაშის მოგებისთვის', example: '50' },
    { key: 'XP_PER_CORRECT_ANSWER', type: 'number', description: 'XP earned per correct answer', descriptionKa: 'XP მიღებული სწორ პასუხზე', example: '15' },
    { key: 'DAILY_PLAYS_LIMIT', type: 'number', description: 'Free VS plays per day', descriptionKa: 'უფასო VS თამაშები დღეში', example: '5' },
    { key: 'POWER_UP_COSTS', type: 'object', description: 'Cost of each power-up type', descriptionKa: 'თითოეული power-up ტიპის ღირებულება' },
    { key: 'CHEST_REWARDS', type: 'object', description: 'Reward ranges for chest types', descriptionKa: 'ჯილდოს დიაპაზონები ზურგჩანთის ტიპებისთვის' },
  ]
};

export const CONFIG_LEADERBOARD_REWARDS: ConfigDoc = {
  name: 'leaderboardRewards',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Weekly leaderboard reward tiers. Defines coins, gems, and exclusive items for top players.',
  descriptionKa: 'ყოველკვირეული ლიდერბორდის ჯილდოს დონეები. განსაზღვრავს მონეტებს, ლალებს და ექსკლუზიურ ნივთებს საუკეთესო მოთამაშეებისთვის.',
  filePath: 'src/config/leaderboardRewards.ts',
  values: [
    { key: 'WEEKLY_LEADERBOARD_REWARDS', type: 'array', description: 'Reward tiers by rank', descriptionKa: 'ჯილდოს დონეები რანგის მიხედვით' },
    { key: 'EXCLUSIVE_FRAMES', type: 'array', description: 'Exclusive avatar frames', descriptionKa: 'ექსკლუზიური ავატარის ჩარჩოები' },
    { key: 'LEADERBOARD_BADGES', type: 'array', description: 'Achievement badges', descriptionKa: 'მიღწევის ბეჯები' },
  ]
};

export const CONFIG_ROOM_GRADIENTS: ConfigDoc = {
  name: 'roomGradients',
  category: 'Visual',
  categoryKa: 'ვიზუალური',
  description: 'Gradient color options for game room backgrounds. Users can customize their room theme.',
  descriptionKa: 'გრადიენტი ფერის ოფციები თამაშის ოთახის ფონებისთვის. მომხმარებლებს შეუძლიათ მოარგონ თავიანთი ოთახის თემა.',
  filePath: 'src/config/roomGradients.ts',
  values: [
    { key: 'ROOM_GRADIENTS', type: 'array', description: 'Available gradient options', descriptionKa: 'ხელმისაწვდომი გრადიენტის ოფციები' },
    { key: 'DEFAULT_GRADIENT', type: 'string', description: 'Default gradient ID', descriptionKa: 'ნაგულისხმევი გრადიენტის ID' },
  ]
};

export const CONFIG_VIDEO: ConfigDoc = {
  name: 'videoConfig',
  category: 'Visual',
  categoryKa: 'ვიზუალური',
  description: 'Background video configuration for different screens. Defines video URLs and settings.',
  descriptionKa: 'ფონური ვიდეოს კონფიგურაცია სხვადასხვა ეკრანებისთვის. განსაზღვრავს ვიდეოს URL-ებს და პარამეტრებს.',
  filePath: 'src/config/videoConfig.ts',
  values: [
    { key: 'GAME_BACKGROUND_VIDEO', type: 'string', description: 'Game screen background', descriptionKa: 'თამაშის ეკრანის ფონი' },
    { key: 'MENU_BACKGROUND_VIDEO', type: 'string', description: 'Menu screen background', descriptionKa: 'მენიუს ეკრანის ფონი' },
    { key: 'VIDEO_PRELOAD', type: 'boolean', description: 'Preload videos on start', descriptionKa: 'ვიდეოების წინასწარი ჩატვირთვა დაწყებისას' },
  ]
};

export const CONFIG_NOTIFICATION: ConfigDoc = {
  name: 'notificationConfig',
  category: 'System',
  categoryKa: 'სისტემა',
  description: 'Push notification settings and message templates.',
  descriptionKa: 'Push შეტყობინებების პარამეტრები და შეტყობინებების შაბლონები.',
  filePath: 'src/config/notificationConfig.ts',
  values: [
    { key: 'NOTIFICATION_TYPES', type: 'object', description: 'Notification type definitions', descriptionKa: 'შეტყობინების ტიპის განსაზღვრებები' },
    { key: 'DEFAULT_CHANNEL', type: 'string', description: 'Default notification channel', descriptionKa: 'ნაგულისხმევი შეტყობინებების არხი' },
    { key: 'SOUNDS', type: 'object', description: 'Notification sound files', descriptionKa: 'შეტყობინებების ხმის ფაილები' },
  ]
};

export const CONFIG_CATEGORY_ICONS: ConfigDoc = {
  name: 'categoryIconMapping',
  category: 'Content',
  categoryKa: 'კონტენტი',
  description: 'Maps category IDs to their icon slugs. Used for displaying category icons throughout the app.',
  descriptionKa: 'აკავშირებს კატეგორიის ID-ებს მათ ხატულას slug-ებთან. გამოიყენება კატეგორიის ხატულების ჩვენებისთვის აპლიკაციაში.',
  filePath: 'src/config/categoryIconMapping.ts',
  values: [
    { key: 'CATEGORY_ICON_MAP', type: 'Record<string, string>', description: 'Category to icon slug mapping', descriptionKa: 'კატეგორიიდან ხატულას slug-ზე მაპინგი' },
    { key: 'DEFAULT_CATEGORY_ICON', type: 'string', description: 'Fallback icon slug', descriptionKa: 'Fallback ხატულას slug' },
  ]
};

// Export all configs
export const ALL_CONFIGS: ConfigDoc[] = [
  CONFIG_ECONOMY,
  CONFIG_LEADERBOARD_REWARDS,
  CONFIG_ROOM_GRADIENTS,
  CONFIG_VIDEO,
  CONFIG_NOTIFICATION,
  CONFIG_CATEGORY_ICONS,
];

// Config categories for navigation
export const CONFIG_CATEGORIES = [
  { id: 'economy', name: 'Economy', nameKa: 'ეკონომიკა' },
  { id: 'visual', name: 'Visual', nameKa: 'ვიზუალური' },
  { id: 'system', name: 'System', nameKa: 'სისტემა' },
  { id: 'content', name: 'Content', nameKa: 'კონტენტი' },
];
