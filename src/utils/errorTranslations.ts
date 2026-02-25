import { t } from './standaloneTranslation';

const errorMap: [string, string][] = [
  ['User not found', 'systemErrors.userNotFound'],
  ['Invalid login credentials', 'systemErrors.invalidCredentials'],
  ['Email not confirmed', 'systemErrors.emailNotConfirmed'],
  ['already registered', 'systemErrors.alreadyRegistered'],
  ['Password should be at least', 'systemErrors.passwordTooShort'],
  ['Email rate limit exceeded', 'systemErrors.rateLimitExceeded'],
  ['rate limit', 'systemErrors.rateLimitExceeded'],
  ['Failed to fetch', 'systemErrors.networkError'],
  ['NetworkError', 'systemErrors.networkError'],
  ['network', 'systemErrors.networkError'],
  ['New password should be different', 'systemErrors.newPasswordDifferent'],
  ['Email already in use', 'systemErrors.emailAlreadyInUse'],
  ['Unable to validate email', 'systemErrors.invalidEmailFormat'],
  ['Signups not allowed', 'systemErrors.signupsNotAllowed'],
];

export function translateErrorMessage(message: string): string {
  if (!message) return t('systemErrors.genericError');
  
  const lowerMessage = message.toLowerCase();
  for (const [pattern, translationKey] of errorMap) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return t(translationKey);
    }
  }
  
  return t('systemErrors.genericError');
}
