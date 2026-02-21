const errorMap: [string, string][] = [
  ['User not found', 'მომხმარებელი ვერ მოიძებნა'],
  ['Invalid login credentials', 'არასწორი მონაცემები'],
  ['Email not confirmed', 'ელ-ფოსტა არ არის დადასტურებული'],
  ['already registered', 'ეს მომხმარებელი უკვე რეგისტრირებულია'],
  ['Password should be at least', 'პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს'],
  ['Email rate limit exceeded', 'ძალიან ბევრი მცდელობა, სცადე მოგვიანებით'],
  ['rate limit', 'ძალიან ბევრი მცდელობა, სცადე მოგვიანებით'],
  ['Failed to fetch', 'ინტერნეტ კავშირის შეცდომა'],
  ['NetworkError', 'ინტერნეტ კავშირის შეცდომა'],
  ['network', 'ინტერნეტ კავშირის შეცდომა'],
  ['New password should be different', 'ახალი პაროლი განსხვავებული უნდა იყოს'],
  ['Email already in use', 'ეს ელ-ფოსტა უკვე გამოყენებულია'],
  ['Unable to validate email', 'ელ-ფოსტის ფორმატი არასწორია'],
  ['Signups not allowed', 'რეგისტრაცია დროებით შეუძლებელია'],
];

export function translateErrorMessage(message: string): string {
  if (!message) return 'შეცდომა, სცადე თავიდან';
  
  const lowerMessage = message.toLowerCase();
  for (const [pattern, translation] of errorMap) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return translation;
    }
  }
  
  return 'შეცდომა, სცადე თავიდან';
}
