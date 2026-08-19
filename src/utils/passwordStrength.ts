/**
 * Signup password policy and the live strength meter behind it.
 *
 * Policy (signup only — sign-IN must keep accepting whatever a user already
 * has, so nothing here runs on the login path): at least 8 characters, with
 * at least one letter and one digit. The meter grades beyond the minimum so
 * the bar rewards longer/richer passwords, but only `meetsPolicy` gates the
 * submit.
 */

export interface PasswordChecks {
  /** ≥ 8 characters */
  minLength: boolean;
  /** contains a letter (any script) */
  hasLetter: boolean;
  /** contains a digit */
  hasDigit: boolean;
}

export interface PasswordStrength {
  /** 0 (empty/very weak) … 4 (strong) */
  score: 0 | 1 | 2 | 3 | 4;
  checks: PasswordChecks;
  /** All policy checks pass — signup may proceed. */
  meetsPolicy: boolean;
}

export function passwordStrength(password: string): PasswordStrength {
  const checks: PasswordChecks = {
    minLength: password.length >= 8,
    hasLetter: /\p{L}/u.test(password),
    hasDigit: /\d/.test(password),
  };
  const meetsPolicy = checks.minLength && checks.hasLetter && checks.hasDigit;

  let score = 0;
  if (password.length > 0) score = 1;
  if (checks.minLength && (checks.hasLetter || checks.hasDigit)) score = 2;
  if (meetsPolicy) score = 3;
  // Strong: past the policy floor — longer, or mixes case/symbols too.
  if (
    meetsPolicy &&
    (password.length >= 12 ||
      (/[a-z]/.test(password) && /[A-Z]/.test(password)) ||
      /[^\p{L}\p{N}]/u.test(password))
  ) {
    score = 4;
  }

  return { score: score as PasswordStrength["score"], checks, meetsPolicy };
}
