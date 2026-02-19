/**
 * Converts a user-supplied URL pattern (with * as wildcard) into a safe RegExp.
 * Escapes all regex metacharacters except *, then replaces * with .* for matching.
 */

export function urlPatternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&");
  const withWildcards = escaped.replace(/\*/g, ".*");
  return new RegExp(`^${withWildcards}$`, "i");
}
