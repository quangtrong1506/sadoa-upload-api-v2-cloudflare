export const env = {} as Record<string, unknown>;

export const ctx = {} as Record<string, unknown>;

const mockCache = {
  default: {
    async match(): Promise<Response | undefined> {
      return undefined;
    },
    async put(): Promise<void> {
      // no-op
    },
    async delete(): Promise<boolean> {
      return true;
    },
  },
} as unknown as CacheStorage;

export const caches = mockCache;

(globalThis as Record<string, unknown>).caches = mockCache;
