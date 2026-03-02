import axios from 'axios';
import * as cheerio from 'cheerio';

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
 * Fetches the verse of the day from bible.com
 * @param language The language to fetch the verse in ('en' or 'fr')
 * @returns A promise that resolves to the verse of the day data
 */
export async function fetchVerseOfTheDay(language: Language = 'en'): Promise<VerseOfTheDay> {
    try {
        // Construct the URL with the selected language
        const langPath = language === 'fr' ? 'fr' : '';
        const url = VERSE_OF_THE_DAY_BASE_URL.replace('{lang}', langPath);
        console.log(`Fetching verse of the day from: ${url}`);
        
        const response = await axios.get(url, {
            headers: USER_AGENT_HEADER,
            timeout: AXIOS_TIMEOUT
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
 * Fetches the verse of the day in both English and French and combines the results
 * @returns A promise that resolves to the combined verse of the day data
 */
export async function fetchCombinedVerseOfTheDay(): Promise<VerseOfTheDay> {
    try {
        // Fetch both English and French content
        const englishContent = await fetchVerseOfTheDay('en');
        const frenchContent = await fetchVerseOfTheDay('fr');
        
        // Combine the content
        return {
            reference: englishContent.reference,
            text: englishContent.text,
            imageUrls: englishContent.imageUrls,
            referenceFr: frenchContent.reference,
            textFr: frenchContent.text,
            imageUrlsFr: frenchContent.imageUrls
        };
    } catch (error) {
        console.error('Error fetching combined verse of the day:', error);
        throw error;
    }
}