const INTERNAL_BASE = 'https://eclipserblx.invalid';
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * Accept only same-origin application paths before passing data from query
 * parameters, storage, or the database to React Router.
 */
export function safeInternalPath(value: string | null | undefined, fallback = '/'): string {
  if (!value || CONTROL_CHARACTERS.test(value)) return fallback;

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.includes('\\') || CONTROL_CHARACTERS.test(decoded)) return fallback;

    const url = new URL(value, INTERNAL_BASE);
    if (url.origin !== INTERNAL_BASE || !url.pathname.startsWith('/')) return fallback;

    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}
