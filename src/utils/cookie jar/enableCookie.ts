import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

/**
 * Attach retry behaviour to an axios instance.
 *
 * We retry on:
 *   - network errors (no response received — ECONNRESET, ETIMEDOUT, DNS, etc.)
 *   - 502 / 503 / 504 from the upstream
 *   - 429 (rate limited) — exponential backoff lets the upstream recover
 *
 * branham.org POST endpoints are read-only "search" calls despite using
 * POST, so retrying them is safe. We override the default
 * `isRetryableError` which would skip POST.
 */
function attachRetry(instance: AxiosInstance) {
  axiosRetry(instance, {
    retries: 2,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error: AxiosError) => {
      if (axiosRetry.isNetworkError(error)) return true;
      const status = error.response?.status;
      if (status === 429) return true;
      if (status && status >= 500 && status < 600) return true;
      return false;
    },
    shouldResetTimeout: true,
  });
}

/**
 * Build a fresh axios client backed by its own cookie jar.
 *
 * IMPORTANT: This MUST be called once per request when interacting with
 * branham.org because that site stores the user's selected language in a
 * cookie. Using a single shared jar caused cross-request language
 * contamination — User A's "fr" cookie would change User B's results.
 *
 * The shared `client` export is kept as a soft fallback for any caller
 * that hasn't been migrated yet, but new code should use createScrapeClient().
 */
export function createScrapeClient(): AxiosInstance {
  const jar = new CookieJar();
  const instance = wrapper(
    axios.create({
      jar,
      timeout: 15_000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
  );
  attachRetry(instance);
  return instance;
}

// Legacy shared client — DEPRECATED. Do not use in new code. Only kept so
// any code path we missed during the migration still functions.
const jar = new CookieJar();
const client = wrapper(axios.create({ jar, timeout: 15_000 }));
attachRetry(client);

export { client };
