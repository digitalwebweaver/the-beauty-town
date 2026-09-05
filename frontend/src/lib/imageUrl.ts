const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  ''
);

/**
 * Turn a backend-relative URL (/uploads/...) into an absolute URL the browser can load.
 * External URLs (https://…) pass through unchanged.
 */
export function imageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return url;
}
