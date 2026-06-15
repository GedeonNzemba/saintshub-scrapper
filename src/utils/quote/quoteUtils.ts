import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import { getCached, TTL } from '../cache';

// Base URL for quote of the day with language placeholder
const QUOTE_OF_THE_DAY_BASE_URL = 'https://branham.org/{lang}/quoteoftheday';

// Language options
export type Language = 'en' | 'fr';

const AXIOS_TIMEOUT = 10000; // 10 seconds, consistent with bibleUtils
const USER_AGENT_HEADER = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

const quoteClient = axios.create({ timeout: AXIOS_TIMEOUT });
axiosRetry(quoteClient, {
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

export interface DailyVerse {
    reference: string | null;
    text: string | null;
    // Add French-specific fields
    referenceFr?: string | null;
    textFr?: string | null;
}

export interface DailyQuoteData {
    audioM4aUrl: string | null;
    audioMp3Url: string | null;
    sermonCode: string | null; // e.g., 64-0306
    sermonTitle: string | null;
    quoteText: string | null;
    // Add French-specific fields
    audioM4aUrlFr?: string | null;
    audioMp3UrlFr?: string | null;
    sermonTitleFr?: string | null;
    quoteTextFr?: string | null;
}

export interface ResourceItem {
    date: string | null;
    title: string | null;
    language: string | null;
    pdfUrl: string | null;
    m4aUrl: string | null; // This might be embedded in a javascript function call
}

export interface FullQuotePageData {
    dailyVerse: DailyVerse;
    dailyQuote: DailyQuoteData;
    resources: ResourceItem[];
}

function cleanText(text: string | undefined | null): string | null {
    return text ? text.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ') : null;
}

function extractUrlFromPlayAudio(jsCall: string | undefined): string | null {
    if (!jsCall) return null;
    // Regex to find the third argument in playaudio('string', 'string', 'URL_HERE')
    const match = jsCall.match(/playaudio\([^,]+,\s*'[^']+',\s*'([^']+)'\)/);
    return match && match[2] ? match[2] : null;
}

// Cached for 6h — quote of the day rolls over once daily. 6h means worst
// case a user briefly sees yesterday's quote if they hit at midnight, but
// massively reduces load on branham.org.
export async function fetchDailyQuoteAndVerseData(language: Language = 'en'): Promise<FullQuotePageData> {
    return getCached(
        `quote:daily:${language}`,
        TTL.DAILY,
        () => fetchDailyQuoteAndVerseDataFromUpstream(language)
    );
}

async function fetchDailyQuoteAndVerseDataFromUpstream(language: Language = 'en'): Promise<FullQuotePageData> {
    try {
        const url = QUOTE_OF_THE_DAY_BASE_URL.replace('{lang}', language);
        console.log(`Fetching daily content from: ${url}`);
        const response = await quoteClient.get(url, {
            headers: USER_AGENT_HEADER,
        });
        const html = response.data;
        const $ = cheerio.load(html);

        // 1. Extract Daily Verse
        const dailyVerse: DailyVerse = {
            reference: cleanText($('div.dailybread_title #scripturereference').text()),
            // For text, use .html() to preserve basic HTML like <p>
            text: $('div.dailybread_text #scripturetext p').html()?.trim() || null 
        };
        
        // If this is French content, store it in the French-specific fields
        if (language === 'fr') {
            dailyVerse.referenceFr = dailyVerse.reference;
            dailyVerse.textFr = dailyVerse.text;
            // Keep the data in both fields for better compatibility
            // This way the data is accessible regardless of which field the client checks
        }

        // 2. Extract Daily Quote
        const audioSources = $('audio#1a source');
        let audioM4aUrl: string | null = null;
        let audioMp3Url: string | null = null;
        audioSources.each((i, el) => {
            const src = $(el).attr('src');
            const type = $(el).attr('type');
            if (type?.includes('x-m4a')) {
                audioM4aUrl = src || null;
            }
            if (type?.includes('mpeg')) {
                audioMp3Url = src || null;
            }
        });

        const dailyQuote: DailyQuoteData = {
            audioM4aUrl,
            audioMp3Url,
            sermonCode: cleanText($('div.QOTDdate #title').text()),
            sermonTitle: cleanText($('div.QOTDtitle #summary p').text()),
            // For quoteText, use .html() to preserve HTML like <br />
            quoteText: $('div.QOTDtext #content').html()?.trim() || null 
        };
        
        // If this is French content, store it in the French-specific fields
        if (language === 'fr') {
            dailyQuote.audioM4aUrlFr = audioM4aUrl;
            dailyQuote.audioMp3UrlFr = audioMp3Url;
            dailyQuote.sermonTitleFr = dailyQuote.sermonTitle;
            dailyQuote.quoteTextFr = dailyQuote.quoteText;
            // Keep the data in both fields for better compatibility
            // This way the data is accessible regardless of which field the client checks
        }

        // 3. Extract Download Resources
        const resources: ResourceItem[] = [];
        $('div.resources span#resources2 table.tblresults tr').each((i, row) => {
            if (i === 0) return; // Skip header row

            const cells = $(row).find('td');
            // Get text of cell 1, but remove the hidden p.hiddendownloads first
            const titleText = $(cells[1]).clone().children('p.hiddendownloads').remove().end().text();
            const pdfLink = $(cells[3]).find('a').attr('href');
            const m4aJsCall = $(cells[4]).find('a').attr('href');
            
            resources.push({
                date: cleanText($(cells[0]).find('nobr').text()),
                title: cleanText(titleText),
                language: cleanText($(cells[2]).text()),
                pdfUrl: pdfLink ? (pdfLink.startsWith('http') || pdfLink.startsWith('//') ? pdfLink : `https://branham.org${pdfLink}`) : null,
                m4aUrl: extractUrlFromPlayAudio(m4aJsCall)
            });
        });

        return {
            dailyVerse,
            dailyQuote,
            resources
        };

    } catch (error) {
        console.error('Error fetching or parsing daily quote data:', error);
        // Propagate a more generic error or the specific error if needed
        if (axios.isAxiosError(error)) {
            throw new Error(`Failed to fetch daily quote data from network: ${error.message}`);
        } else if (error instanceof Error) {
            throw new Error(`Error parsing daily quote data: ${error.message}`);
        } else {
            throw new Error('An unknown error occurred while fetching or parsing daily quote data.');
        }
    }
}
