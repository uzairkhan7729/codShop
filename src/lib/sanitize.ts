import DOMPurify from 'isomorphic-dompurify';

/**
 * Strip all HTML from user-supplied text (Module 11 — XSS prevention).
 * We never render user text as HTML, but we sanitize on the way in as defense
 * in depth (e.g. review titles/comments).
 */
export function sanitizeText(input: string | undefined | null): string | undefined {
  if (input == null) return undefined;
  const clean = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return clean.trim();
}
