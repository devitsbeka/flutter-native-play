/**
 * Signup email screening.
 *
 * Two layers: a real format check (stricter than "contains @"), and a
 * blocklist of the throwaway-inbox domains that account farms actually use.
 * This cannot prove an address is deliverable — only the confirmation email
 * can do that (see the register flow) — but it stops the obvious garbage at
 * the field, with a message that says what's wrong.
 */

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "sharklasers.com",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "tempmailo.com",
  "throwawaymail.com",
  "yopmail.com",
  "yopmail.fr",
  "getnada.com",
  "nada.email",
  "maildrop.cc",
  "dispostable.com",
  "trashmail.com",
  "trashmail.de",
  "mailnesia.com",
  "mytemp.email",
  "fakeinbox.com",
  "spamgourmet.com",
  "mintemail.com",
  "mohmal.com",
  "emailondeck.com",
  "burnermail.io",
  "33mail.com",
  "tempinbox.com",
  "mail-temp.com",
  "moakt.com",
  "tmpmail.org",
  "tmpmail.net",
  "inboxkitten.com",
  "mailsac.com",
  "dropmail.me",
]);

// One TLD, at least one dot in the domain, no spaces, sane local part.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return false;
  // Match the domain and any subdomain of a listed one.
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  return [...DISPOSABLE_DOMAINS].some((d) => domain.endsWith(`.${d}`));
}
