import puppeteer, { Browser, Page } from 'puppeteer';
import { execSync } from 'child_process';

let browserInstance: Browser | null = null;

/**
 * Initializes and returns a singleton Puppeteer browser instance.
 * It uses the system Chromium if available on PATH (e.g., via Nixpacks on Railway),
 * otherwise it falls back to the bundled Chromium.
 */
export async function getBrowser(): Promise<Browser> {
  if (browserInstance) {
    return browserInstance;
  }

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

  console.log(`[Puppeteer] Launching browser... (Executable: ${executablePath || 'bundled'})`);
  browserInstance = await puppeteer.launch({
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
  });

  return browserInstance;
}

/**
 * Fetches the HTML content of a given URL using Puppeteer.
 * It waits for the network to be idle to ensure dynamic content (or Cloudflare challenges)
 * has finished loading.
 *
 * @param url The URL to scrape.
 * @returns The HTML content of the page.
 */
export async function fetchHtmlWithPuppeteer(url: string): Promise<string> {
  const browser = await getBrowser();
  let page: Page | null = null;

  try {
    page = await browser.newPage();
    
    // Set a common user agent to appear less like a bot
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set extra HTTP headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    console.log(`[Puppeteer] Navigating to ${url}`);
    
    // Go to the URL and wait until there are no more than 2 network connections for at least 500 ms.
    // This gives Cloudflare's JS challenge time to execute.
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Sometimes 'networkidle2' fires too early during a redirect challenge.
    // We can explicitly wait for a known element, but since we are scraping multiple endpoints 
    // (some return JSON inside __NEXT_DATA__, some return readable content), 
    // waiting a brief moment to ensure Cloudflare has passed is safer.
    await new Promise(resolve => setTimeout(resolve, 2000));

    const html = await page.content();
    return html;
  } catch (error) {
    console.error(`[Puppeteer] Error fetching ${url}:`, error);
    throw error;
  } finally {
    if (page) {
      await page.close().catch(console.error);
    }
  }
}

/**
 * Gracefully closes the Puppeteer browser instance.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    console.log('[Puppeteer] Closing browser...');
    await browserInstance.close();
    browserInstance = null;
  }
}
