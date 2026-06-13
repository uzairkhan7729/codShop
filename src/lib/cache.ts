import Redis from 'ioredis';
import { env } from '@/lib/env';

/**
 * Cache abstraction (Module 10). Uses Redis when REDIS_URL is set, otherwise a
 * process-local Map with TTL — so the app runs with zero infra in development.
 */
export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Invalidate every key starting with the given prefix. */
  delByPrefix(prefix: string): Promise<void>;
}

class MemoryCache implements ICache {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

class RedisCache implements ICache {
  constructor(private readonly client: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    // SCAN avoids blocking Redis on large keyspaces.
    let cursor = '0';
    do {
      const [next, keys] = await this.client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = next;
      if (keys.length) await this.client.del(...keys);
    } while (cursor !== '0');
  }
}

const globalForCache = globalThis as unknown as { cache?: ICache; redis?: Redis };

function createCache(): ICache {
  if (env.REDIS_URL) {
    const client =
      globalForCache.redis ?? new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: false });
    globalForCache.redis = client;
    client.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[redis] connection error:', err.message);
    });
    return new RedisCache(client);
  }
  return new MemoryCache();
}

export const cache: ICache = globalForCache.cache ?? createCache();
if (process.env.NODE_ENV !== 'production') globalForCache.cache = cache;

/** Cache key prefixes — invalidate a whole namespace via delByPrefix. */
export const CACHE_KEYS = {
  products: 'products:',
  product: 'product:',
  categories: 'categories:',
} as const;

export const CACHE_TTL = {
  productList: 300, // 5 minutes (Module 10 requirement)
  product: 300,
  categories: 600,
} as const;
