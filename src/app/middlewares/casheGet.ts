/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
import { Request, Response, NextFunction } from 'express';

import { errorLogger } from '../../shared/logger';
import chalk from 'chalk';
import { Cache } from '../../lib/cashe';

function normalizeQuery(query: Request['query']) {
  // stable key order + stable primitive conversion
  const sortedKeys = Object.keys(query).sort();
  const normalized: Record<string, any> = {};

  for (const k of sortedKeys) {
    const v: any = (query as any)[k];

    if (Array.isArray(v)) {
      normalized[k] = v.map(x => String(x));
    } else if (v === undefined) {
      normalized[k] = null;
    } else {
      normalized[k] = String(v);
    }
  }
  return normalized;
}

export const cacheGet =
  (prefix: string, ttlSeconds = 120, keySelector?: (req: Request) => object) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET
    if (req.method !== 'GET') return next();

    // Optional: allow bypass for debugging
    if (req.headers['x-cache-bypass'] === '1') return next();

    try {
      const keyBasis = keySelector
        ? keySelector(req)
        : {
            path: req.path,
            query: normalizeQuery(req.query),
          };

      const key = Cache.buildKey(prefix, keyBasis);

      // Read cache
      const cachedData = await Cache.get<any>(key);

      // IMPORTANT: don't use `if (cachedData)` (breaks for [])
      if (cachedData !== null && cachedData !== undefined) {
        res.setHeader('X-Cache', 'HIT');
        res.status(200).json(cachedData);
        return;
      }

      // Intercept response
      const originalJson = res.json.bind(res);

      res.json = (body: any): Response => {
        // Only cache successful responses
        // (avoid caching errors, redirects, etc.)
        const status = res.statusCode;

        if (status >= 200 && status < 300) {
          res.setHeader('X-Cache', 'MISS');

          Cache.set(key, body, ttlSeconds).catch((err: any) => {
            errorLogger.error(
              chalk.red('Redis cache set error:'),
              err?.message ?? err,
            );
          });
        } else {
          res.setHeader('X-Cache', 'BYPASS');
        }

        return originalJson(body);
      };

      return next();
    } catch (err: any) {
      errorLogger.error(
        chalk.red('Redis cache middleware error:'),
        err?.message ?? err,
      );
      return next();
    }
  };
