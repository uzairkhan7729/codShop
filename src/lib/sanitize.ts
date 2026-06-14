/**
 * Strip all HTML from user-supplied text (Module 11 — XSS prevention).
 * We never render user text as HTML, but we sanitize on the way in as defense
 * in depth (e.g. review titles/comments).
 *
 * This deliberately avoids a DOM-based sanitizer (DOMPurify/jsdom): the only
 * requirement here is "remove every tag", which is a pure string transform.
 * Pulling in jsdom for this dragged in a heavy, frequently-broken dependency
 * tree (and ESM/CJS incompatibilities under Next's server build), so we do the
 * stripping directly.
 */
export function sanitizeText(input: string | undefined | null): string | undefined {
  if (input == null) return undefined;
  const clean = input
    // Drop entire <script>/<style> blocks *including* their contents.
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Drop any remaining tags (opening, closing, self-closing, comments).
    .replace(/<\/?[a-z!][^>]*>/gi, '');
  return clean.trim();
}
