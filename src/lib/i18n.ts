// Re-export from new locales system for backwards compatibility
// This file is deprecated - use useLanguage() hook instead

import { ka } from '@/locales/ka';
import { t as translate } from '@/contexts/LanguageContext';

export { ka };
export { translate as t };

export type TranslationKey = keyof typeof ka;

export default ka;
