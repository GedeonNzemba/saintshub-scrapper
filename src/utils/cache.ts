/**
 * Hybrid two-tier cache: in-memory LRU (L1) + MongoDB (L2 with TTL index).
 *
 * Design goals — every one of these is intentional, do not relax without
 * thinking about the failure mode:
 *
 *   1. Read-through, write-behind. Cache misses transparently call the
 *      fetcher. Writes happen after the response is returned so the user
 *      never waits on cache I/O.
 *
 *   2. Failures degrade gracefully. If LRU or MongoDB blow up for any
 *      reason, we still call the fetcher and return real data. Cache is
 *      a performance optimization, never a correctness dependency.
 *
 *   3. CACHE_DISABLED=true kill switch. If something goes wrong in prod,
 *      set this env var on Railway and every request bypasses the cache.
 *      No deploy needed.
 *
 *   4. CACHE_VERSION prefix. Bumping the constant below invalidates the
 *      entire cache without manually deleting anything in MongoDB.
 *
 *   5. TTL index in MongoDB. Expired docs are deleted automatically by
 *      MongoDB's background TTL monitor (runs every 60s). We also
 *      re-check expiresAt at read time so stale-but-not-yet-deleted docs
 *      don't get served.
 */

import { LRUCache } from 'lru-cache';
import { Collection } from 'mongodb';
import { getDatabase } from './database/connection';

// Bump this string to invalidate ALL cached entries at once.
const CACHE_VERSION = process.env.CACHE_VERSION || 'v1';
const CACHE_DISABLED = process.env.CACHE_DISABLED === 'true';
const CACHE_COLLECTION = 'scraper_cache';

// In-memory cache. 500 entries × ~50KB avg = ~25MB worst case.
// Each entry has its own TTL — items are evicted whichever comes first
// (TTL expiry or LRU pressure).
// Use `{}` (non-nullish) as the value constraint because lru-cache's
// generic refuses `unknown`. We cast at the call sites — values are
// internally treated as opaque blobs.
const memCache = new LRUCache<string, {}>({
  max: 500,
  ttl: 0, // per-entry TTL passed via set(), 0 means "use the per-entry one"
  ttlAutopurge: true,
  allowStale: false,
});

interface CacheDoc {
  _id: string;
  value: unknown;
  expiresAt: Date;
  cachedAt: Date;
}

function collection(): Collection<CacheDoc> {
  return getDatabase().collection<CacheDoc>(CACHE_COLLECTION);
}

function buildKey(key: string): string {
  return `${CACHE_VERSION}:${key}`;
}

/**
 * Create the TTL index. Called once at startup. Idempotent.
 *
 * `expireAfterSeconds: 0` tells MongoDB to delete docs where
 * `expiresAt < now`. The actual delete runs in a background sweep every
 * ~60s, so stale docs may exist briefly — that's why we also check
 * expiresAt at read time.
 */
export async function initializeCacheIndexes(): Promise<void> {
  if (CACHE_DISABLED) {
    console.log('[cache] CACHE_DISABLED=true — skipping index creation');
    return;
  }
  try {
    const coll = collection();
    await coll.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('[cache] indexes initialized');
  } catch (err) {
    // Index creation failure is non-fatal — cache still works, MongoDB
    // just won't auto-purge. We log and continue.
    console.error('[cache] failed to create index (continuing anyway):', err);
  }
}

/**
 * Get a cached value, or call the fetcher and cache the result.
 *
 * @param key Unique cache key (will be prefixed with CACHE_VERSION)
 * @param ttlSeconds How long the value should live in cache
 * @param fetcher The expensive function to call on a miss
 *
 * @returns Whatever the fetcher returned (from cache if possible).
 */
export async function getCached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (CACHE_DISABLED) {
    return fetcher();
  }

  const fullKey = buildKey(key);

  // ── L1: in-memory LRU ──
  try {
    const memHit = memCache.get(fullKey);
    if (memHit !== undefined) {
      // Sub-millisecond hit. The hottest endpoints will live here forever.
      return memHit as T;
    }
  } catch (err) {
    console.error('[cache] L1 read error (continuing):', err);
  }

  // ── L2: MongoDB ──
  try {
    const doc = await collection().findOne({ _id: fullKey });
    if (doc && doc.expiresAt > new Date()) {
      // Promote to L1 with the remaining TTL.
      const remainingMs = doc.expiresAt.getTime() - Date.now();
      const value = doc.value as T;
      memCache.set(fullKey, value as {}, { ttl: remainingMs });
      return value;
    }
  } catch (err) {
    console.error('[cache] L2 read error (falling through to fetcher):', err);
  }

  // ── Miss: fetch live, populate both layers ──
  const value = await fetcher();

  // Write-behind: don't await — the response goes out immediately.
  void writeBehind(fullKey, value, ttlSeconds);

  return value;
}

function writeBehind<T>(fullKey: string, value: T, ttlSeconds: number): Promise<void> {
  // L1 write is synchronous and effectively never fails
  try {
    memCache.set(fullKey, value as {}, { ttl: ttlSeconds * 1000 });
  } catch (err) {
    console.error('[cache] L1 write failed:', err);
  }

  // L2 write is async, fire-and-forget
  const doc: CacheDoc = {
    _id: fullKey,
    value,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    cachedAt: new Date(),
  };
  return collection()
    .replaceOne({ _id: fullKey }, doc, { upsert: true })
    .then(() => undefined)
    .catch((err) => {
      // MongoDB doc too big (>16MB), connection issue, etc. Non-fatal.
      console.error('[cache] L2 write failed for key', fullKey, '-', err?.message || err);
    });
}

/**
 * Manually invalidate a single key. Useful for admin endpoints / debugging.
 */
export async function invalidate(key: string): Promise<void> {
  const fullKey = buildKey(key);
  memCache.delete(fullKey);
  try {
    await collection().deleteOne({ _id: fullKey });
  } catch (err) {
    console.error('[cache] invalidate L2 failed:', err);
  }
}

/**
 * Clear the in-memory layer only. MongoDB entries will expire naturally.
 * Use on suspected memory issues without losing the L2 cache.
 */
export function clearMemCache(): void {
  memCache.clear();
}

// ── TTL constants ────────────────────────────────────────────────
// Use these so TTLs are consistent across the codebase. Tune in one place.
export const TTL = {
  VERY_LONG: 7 * 24 * 60 * 60, // 7 days — Bible languages, books, sermon languages
  LONG: 24 * 60 * 60,          // 24 hours — Bible versions, chapter content, verse text
  DAILY: 6 * 60 * 60,          // 6 hours — daily verse, quote, verse of the day
  MEDIUM: 60 * 60,             // 1 hour — sermon catalog (year/length/series)
  SHORT: 15 * 60,              // 15 minutes — sermon search results
} as const;
