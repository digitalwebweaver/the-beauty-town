/**
 * Strip everything that isn't a digit and cap length.
 * Use for phone inputs.
 */
export function digitsOnly(value: string, maxLength = 10): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

/**
 * Strip digits and unusual symbols; allow letters, spaces, dots, apostrophes,
 * and hyphens (for names like "Mary O'Brien" or "Jean-Pierre").
 */
export function lettersOnly(value: string, maxLength = 80): string {
  return value.replace(/[^A-Za-z\s.'\-]/g, '').slice(0, maxLength);
}

/**
 * Common Input props for phone fields — numeric keypad on mobile,
 * hard cap in the browser, and a digits-only value.
 */
export const phoneInputProps = {
  inputMode: 'numeric' as const,
  maxLength: 10,
  autoComplete: 'tel',
  placeholder: '9XXXXXXXXX',
};

export const nameInputProps = {
  autoComplete: 'name',
  maxLength: 80,
};
