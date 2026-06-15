import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import { getCached, TTL } from '../cache';

// Base URL for verse of the day with language placeholder
const VERSE_OF_THE_DAY_BASE_URL = 'https://www.bible.com/{lang}/verse-of-the-day';

// Language options
export type Language = 'en' | 'fr';

// Timeout for axios requests
const AXIOS_TIMEOUT = 10000; // 10 seconds

// User agent header for requests
const USER_AGENT_HEADER = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

const votdClient = axios.create({ timeout: AXIOS_TIMEOUT });
axiosRetry(votdClient, {
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

export interface VerseOfTheDay {
    reference: string | null;
    text: string | null;
    imageUrls: string[];
    // Add French-specific fields
    referenceFr?: string | null;
    textFr?: string | null;
    imageUrlsFr?: string[];
}

/**
 * Fetches the verse of the day from bible.com. Cached for 6h.
 */
export async function fetchVerseOfTheDay(language: Language = 'en'): Promise<VerseOfTheDay> {
    return getCached(
        `votd:${language}`,
        TTL.DAILY,
        () => fetchVerseOfTheDayFromUpstream(language)
    );
}

async function fetchVerseOfTheDayFromUpstream(language: Language = 'en'): Promise<VerseOfTheDay> {
    try {
        const langPath = language === 'fr' ? 'fr' : '';
        const url = VERSE_OF_THE_DAY_BASE_URL.replace('{lang}', langPath);
        console.log(`Fetching verse of the day from: ${url}`);

        const response = await votdClient.get(url, {
            headers: USER_AGENT_HEADER,
        });
        
        const html = response.data;
        const $ = cheerio.load(html);
        
        // Extract data using the provided selectors
        const imageUrls: string[] = [];
        $("main div:first-child div div div:first-child div:nth-child(2) img").each((i, el) => {
            const src = $(el).attr('src');
            if (src) {
                // Add the base URL to the image URL if it's a relative path
                const fullImageUrl = src.startsWith('/') ? `https://www.bible.com${src}` : src;
                imageUrls.push(fullImageUrl);
            }
        });
        
        const text = $("main > div:first-child > div > div > div:first-child > div:nth-child(3) > a").text().trim();
        const reference = $("main > div:first-child > div > div > div:first-child > div:nth-child(3) > a:nth-child(2)").text().trim();
        
        // Create the verse of the day object
        const verseOfTheDay: VerseOfTheDay = {
            reference: reference || null,
            text: text || null,
            imageUrls
        };
        
        // If this is French content, store it in the French-specific fields as well
        if (language === 'fr') {
            verseOfTheDay.referenceFr = reference;
            verseOfTheDay.textFr = text;
            verseOfTheDay.imageUrlsFr = [...imageUrls];
        }
        
        return verseOfTheDay;
        
    } catch (error) {
        console.error('Error fetching or parsing verse of the day:', error);
        // Propagate a more generic error or the specific error if needed
        if (axios.isAxiosError(error)) {
            throw new Error(`Failed to fetch verse of the day from network: ${error.message}`);
        } else if (error instanceof Error) {
            throw new Error(`Error parsing verse of the day: ${error.message}`);
        } else {
            throw new Error('An unknown error occurred while fetching or parsing verse of the day.');
        }
    }
}

/**
 * Fetches the verse of the day in both English and French and combines the results.
 *
 * Improvements over the original:
 *   - Parallel fetches via Promise.allSettled (was: sequential)
 *   - If French fails but English succeeds, we still return English data
 *     instead of 500-ing. French fields become null.
 */
export async function fetchCombinedVerseOfTheDay(): Promise<VerseOfTheDay> {
    const [enResult, frResult] = await Promise.allSettled([
        fetchVerseOfTheDay('en'),
        fetchVerseOfTheDay('fr'),
    ]);

    if (enResult.status === 'rejected') {
        console.error('Error fetching English verse of the day:', enResult.reason);
        throw enResult.reason;
    }

    const englishContent = enResult.value;
    const frenchContent = frResult.status === 'fulfilled' ? frResult.value : null;

    if (frResult.status === 'rejected') {
        console.error('French verse of the day failed (returning English only):', frResult.reason);
    }

    return {
        reference: englishContent.reference,
        text: englishContent.text,
        imageUrls: englishContent.imageUrls,
        referenceFr: frenchContent ? frenchContent.reference : null,
        textFr: frenchContent ? frenchContent.text : null,
        imageUrlsFr: frenchContent ? frenchContent.imageUrls : []
    };
}