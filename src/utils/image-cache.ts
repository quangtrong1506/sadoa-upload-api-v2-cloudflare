import { logger } from "./logger";

export const IMAGE_CACHE_TTL = 60 * 60 * 24 * 30;

export const IMAGE_CACHE_CONTROL = `public, max-age=${IMAGE_CACHE_TTL}, s-maxage=${IMAGE_CACHE_TTL}, stale-while-revalidate=86400`;

export function buildCacheKey(fullUrl: string): string {
  return fullUrl;
}

export async function readImageCache(key: string | URL): Promise<Response | undefined> {
  try {
    return await caches.default.match(key);
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : "Unknown error", key: key.toString() },
      "cache.match failed",
    );
    return undefined;
  }
}

export async function writeImageCache(key: string | URL, response: Response): Promise<void> {
  try {
    await caches.default.put(key, response);
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : "Unknown error", key: key.toString() },
      "cache.put failed, retrying once",
    );
    try {
      await caches.default.put(key, response);
    } catch (retryError) {
      logger.warn(
        {
          error: retryError instanceof Error ? retryError.message : "Unknown error",
          key: key.toString(),
        },
        "cache.put retry failed",
      );
    }
  }
}
