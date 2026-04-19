/**
 * Utility functions for S3 URL handling.
 */

/**
 * Encodes special characters in S3 URLs that the browser might misinterpret.
 * Specifically, '#' characters are interpreted as fragment identifiers,
 * so we must encode them as '%23' to ensure S3 receives the full key.
 * 
 * @param url The S3 URL to encode
 * @returns The encoded URL string
 */
export const encodeS3Url = (url: string | undefined | null): string => {
  if (!url) return '';
  try {
    const parsedUrl = new URL(url, window.location.origin);
    const isDeadLocalAsset =
      parsedUrl.hostname === 'localhost' &&
      parsedUrl.port !== window.location.port;

    if (isDeadLocalAsset) return '';
  } catch {
    // Keep relative paths usable; the replacement below is still safe.
  }

  // Replace all '#' with '%23' using a global regex for compatibility
  return url.replace(/#/g, '%23');
};
