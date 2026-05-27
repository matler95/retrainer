/**
 * Input sanitization utilities for XSS protection.
 *
 * Sanitizes user text inputs by:
 * - Trimming whitespace
 * - Enforcing max length
 * - Stripping HTML tags and dangerous characters
 *
 * All functions are pure and deterministic.
 */

/**
 * Sanitize a user text input.
 *
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length (default 500)
 * @returns Sanitized string
 */
export function sanitizeInput(input: string, maxLength = 500): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>&"'/]/g, "");
}

/**
 * Sanitize a numeric input.
 *
 * @param input - Raw numeric input
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped number
 */
export function sanitizeNumber(input: number, min: number, max: number): number {
  if (isNaN(input) || !isFinite(input)) return min;
  return Math.min(max, Math.max(min, input));
}

/**
 * Sanitize an email input.
 *
 * @param email - Raw email input
 * @returns Trimmed and lowercased email, or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : "";
}

/**
 * Sanitize a comma-separated list (e.g., exercises to avoid).
 *
 * @param input - Raw comma-separated string
 * @param maxItems - Maximum number of items
 * @returns Array of sanitized strings
 */
export function sanitizeList(input: string, maxItems = 20): string[] {
  return input
    .split(",")
    .map((s) => sanitizeInput(s, 100))
    .filter(Boolean)
    .slice(0, maxItems);
}