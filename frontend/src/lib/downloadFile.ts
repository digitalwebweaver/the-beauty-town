/**
 * Saves a Blob to the user's disk under the given filename — a temporary
 * object URL + anchor click, revoked right after. The browser's own
 * download flow has no other trigger point from JS; this is the standard
 * pattern for "the file came back from an API call as a blob response",
 * not a static link the browser can download on its own.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
