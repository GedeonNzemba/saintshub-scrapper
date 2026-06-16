import puppeteer, { Browser, Page } from 'puppeteer';
import { execSync } from 'child_process';

let browserInstance: Browser | null = null;
let launchPromise: Promise<Browser> | null = null;

// Resolved once and memoised. `undefined` = not resolved yet,
// `null` = resolved to "use puppeteer's bundled Chromium".
let resolvedExecutablePath: string | null | undefined = undefined;

// Cap how many Puppeteer pages can run at once. The 24h chapter/verse cache
// means most requests never reach Puppeteer, but a burst of cache-misses
// (e.g. right after a deploy) could otherwise open dozens of pages and OOM
// the container. Excess requests queue behind this limit.
const MAX_CONCURRENT_PAGES = 3;
let activePages = 0;
const waiters: Array<() => void> = [];

async function acquirePageSlot(): Promise<void> {
  if (activePages < MAX_CONCURRENT_PAGES) {
    activePages++;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  activePages++;
}

function releasePageSlot(): void {
  activePages--;
  const next = waiters.shift();
  if (next) next();
}

/**
 * Resolve the Chromium executable path once.
 *
 * Priority:
 *   1. PUPPETEER_EXECUTABLE_PATH env (if set and non-empty)
 *   2. `which chromium` / common binary names — this is how we find the
 *      Nix-installed Chromium on Railway (it's on PATH at runtime)
 *   3. undefined -> Puppeteer uses its bundled download (local dev on macOS)
 */
function resolveExecutablePath(): string | undefined {
  if (resolvedExecutablePath !== undefined) {
    return resolvedExecutablePath || undefined;
  }

  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && envPath.trim().length > 0) {
    resolvedExecutablePath = envPath.trim();
    console.log(`[Puppeteer] Using Chromium from PUPPETEER_EXECUTABLE_PATH: ${resolvedExecutablePath}`);
    return resolvedExecutablePath;
  }

  const candidates = ['chromium', 'chromium-browser', 'google-chrome-stable', 'google-chrome'];
  for (const bin of candidates) {
    try {
      const found = execSync(`which ${bin}`, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
      if (found) {
        resolvedExecutablePath = found;
        console.log(`[Puppeteer] Resolved system Chromium: ${found}`);
        return found;
      }
    } catch {
      // binary not on PATH — try the next candidate
    }
  }

  console.log('[Puppeteer] No system Chromium found on PATH; falling back to bundled Chromium.');
  resolvedExecutablePath = null;
  return undefined;
}

/**
 * Initialise and return a singleton Puppeteer browser instance.
 * Concurrent callers share one launch (no double-launch race), and the
 * singleton is cleared automatically if the browser dies so the next
 * request relaunches it.
 */
export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  // A launch is already in flight — await the same promise.
  if (launchPromise) {
    return launchPromise;
  }

  const executablePath = resolveExecutablePath();
  console.log(`[Puppeteer] Launching browser... (Executable: ${executablePath || 'bundled'})`);

  launchPromise = puppeteer
    .launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,800',
      ],
    })
    .then((browser) => {
      browserInstance = browser;
      browser.on('disconnected', () => {
        console.warn('[Puppeteer] Browser disconnected; will relaunch on next request.');
        browserInstance = null;
      });
      launchPromise = null;
      return browser;
    })
    .catch((err) => {
      // Reset so a later request can retry the launch.
      launchPromise = null;
      throw err;
    });

  return launchPromise;
}

/**
 * Fetch the HTML content of a URL using Puppeteer, waiting for any
 * Cloudflare/Fastly JS challenge to resolve.
 */
export async function fetchHtmlWithPuppeteer(url: string): Promise<string> {
  await acquirePageSlot();
  const browser = await getBrowser();
  let page: Page | null = null;

  try {
    page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    console.log(`[Puppeteer] Navigating to ${url}`);

    // Wait until the network is quiet so the JS challenge has time to run.
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // networkidle2 can fire mid-challenge during a redirect; give the
    // challenge a brief grace period to finish before reading the DOM.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return await page.content();
  } catch (error) {
    console.error(`[Puppeteer] Error fetching ${url}:`, error);
    throw error;
  } finally {
    if (page) {
      await page.close().catch((e) => console.error('[Puppeteer] page close error:', e));
    }
    releasePageSlot();
  }
}

/**
 * Gracefully close the Puppeteer browser instance (called on shutdown).
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    console.log('[Puppeteer] Closing browser...');
    await browserInstance.close().catch((e) => console.error('[Puppeteer] close error:', e));
    browserInstance = null;
  }
}
