/**
 * @file lib/utils/safeRedirect.ts
 * @fileoverview Validates a post-auth redirect target taken from the URL.
 */

/**
 * Return `raw` only when it is a same-origin relative path, otherwise `fallback`.
 * Rejects absolute URLs, protocol-relative (`//host`), backslash tricks (`/\host`)
 * and scheme payloads such as `javascript:` (open redirect + DOM XSS).
 */
export function getSafeRedirect(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return fallback;
  }
  // Control characters can be stripped by the URL parser and turn `/\t/host` into `//host`
  if (/[\u0000-\u001F\u007F]/.test(raw)) return fallback;

  try {
    const base = 'http://placeholder.local';
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
