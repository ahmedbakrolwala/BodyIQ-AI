export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? null
    : "Enter a valid email address.";
}
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH)
    return "Use at least 12 characters for your password.";
  if (password.length > PASSWORD_MAX_LENGTH)
    return "Passwords can be at most 128 characters.";
  return null;
}
export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | null {
  return password === confirmation
    ? null
    : "Your passwords don’t match. Please check both fields.";
}
export function validateName(value: string): string | null {
  return value.trim().length > 0 && value.trim().length <= 60
    ? null
    : "Enter your name (1–60 characters).";
}
