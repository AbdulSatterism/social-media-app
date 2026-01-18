import crypto from 'crypto';
import redis from '../config/redis';

const jsonParse = <T>(str: string | null): T | null => {
  if (!str) return null;
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
};

export const Cache = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await redis.get(key);
    return jsonParse<T>(raw);
  },

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  // Efficient pattern delete via SCAN (no KEYS in prod)
  async delByPattern(pattern: string): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        '200',
      );
      cursor = nextCursor;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== '0');
  },

  // Build a stable key from prefix + query (and optionally user/role)
  buildKey(prefix: string, input: object) {
    const hash = crypto
      .createHash('sha1')
      .update(JSON.stringify(input))
      .digest('hex');
    return `${prefix}:${hash}`;
  },
};
