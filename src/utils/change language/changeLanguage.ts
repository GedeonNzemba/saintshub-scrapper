import { AxiosInstance } from 'axios';
import { client as sharedClient } from '../cookie jar/enableCookie';

/**
 * Change the language on branham.org for the given axios client.
 *
 * Pass a per-request client (from `createScrapeClient()`) to avoid
 * leaking the language cookie across users. If no client is provided,
 * the shared legacy client is used for backwards compatibility.
 *
 * Throws on failure so the caller can return a proper error response
 * instead of silently returning data in the wrong language.
 */
export async function changeLanguage(
  languageCode: string,
  scrapeClient: AxiosInstance = sharedClient
): Promise<void> {
  try {
    await scrapeClient.post(
      'https://branham.org/branham/messageaudio.aspx/wmSetLanguage',
      { formVars: [{ name: 'language', value: languageCode }] },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('changeLanguage failed:', { languageCode, message });
    throw new Error(`Failed to change language to "${languageCode}": ${message}`);
  }
}
