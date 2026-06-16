import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import { configurationApiUrl, versionsApiUrl, chapterApiUrl, readableApiUrl } from './utils/api';
import { getCached, TTL } from '../cache';
import { fetchHtmlWithPuppeteer } from '../puppeteerHelper';

const AXIOS_TIMEOUT = 10000; // 10 seconds

// Dedicated axios client for bible.com with retry on transient failures.
// Shared safely across requests because no cookies are involved.
const bibleClient = axios.create({ timeout: AXIOS_TIMEOUT });
axiosRetry(bibleClient, {
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

interface BibleLanguageConfig {
    local_name: string;
    iso_639_3: string;
    // Add other properties if needed, though we only use these two
}

interface LanguageInfo {
    name: string;
    code: string;
}

interface BibleVersion {
    id: number;
    abbreviation: string;
    local_abbreviation: string;
    name?: string; // Optional: Full name of the version
    local_title?: string; // Optional: Title in the local language
    // Add other properties if needed
}

interface VersionInfo {
    name: string;
    id: number;
}

interface ApiChapter {
    usfm: string;
    human: string; // Chapter number as string
    canonical: boolean;
    // Add other properties if needed
}

interface ApiBook {
    usfm: string;
    human: string; // Short book name? e.g., "Gen"
    human_long: string; // Full book name, e.g., "Genesis"
    abbreviation: string; // e.g., "Gen"
    chapters: ApiChapter[];
    // Add other properties if needed
}

interface ChapterInfo {
    number: string; // human
    usfm: string;   // usfm
}

interface BookInfo {
    name: string; // human (short name like "Genesis", "Genèse")
    nameLong: string; // human_long (detailed name like "The First Book of Moses, Called Genesis")
    abbreviation: string; // abbreviation
    chapters: ChapterInfo[];
}

interface ChapterContentResponse {
    html: string;
    jsonResponse?: any; // Add the new property, make it optional or 'any' for now
    heading?: string; // For the chapter heading like 'Genesis 1'
    previousChapterUsfm?: { usfm: string; name?: string } | null; // Updated structure
    nextChapterUsfm?: { usfm: string; name?: string } | null;   // Updated structure
}

const bibleContentClassMap: { [key: string]: string } = {
    'version': 'version vid1 iso6393eng', // Example from demo, adjust if different for API
    'book': 'ChapterContent_book__VkdB2 bkGEN',
    'chapter': 'ChapterContent_chapter__uvbXo',
    'label': 'ChapterContent_label__R2PLt',
    's1': 'ChapterContent_s1__bNNaW', // Section heading
    's2': 'ChapterContent_s2__l6Ny0', // Section heading level 2
    's': 'ChapterContent_s__r_36F',   // Section heading (generic/French)
    'r': 'ChapterContent_r___3KRx',   // Poetry/Prose line (French)
    'heading': 'ChapterContent_heading__xBDcs', // Might be the same as s1 or different
    'p': 'ChapterContent_p__dVKHb', // Paragraph
    'verse': 'ChapterContent_verse__57FIw',
    'content': 'ChapterContent_content__RrUqA',
    'nd': 'ChapterContent_nd__ECPAf', // Name of God
    'add': 'ChapterContent_add__9EgW2'  // Words of Jesus, etc.
    // Add any other classes from the actual API response HTML that need mapping
};

const USER_AGENT_HEADER = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// Fetches and processes the list of available Bible languages.
// Cached for 7 days — language list changes essentially never.
// Filtering happens AFTER cache, so different ?search= values share one cache entry.
export async function fetchBibleLanguages(searchQuery?: string): Promise<LanguageInfo[]> {
    const allLanguages = await getCached(
        'bible:languages',
        TTL.VERY_LONG,
        () => fetchBibleLanguagesFromUpstream()
    );

    if (!searchQuery) return allLanguages;
    const q = searchQuery.toLowerCase();
    return allLanguages.filter(lang => lang.name.toLowerCase().includes(q));
}

async function fetchBibleLanguagesFromUpstream(): Promise<LanguageInfo[]> {
    try {
        console.log(`Fetching languages from: ${configurationApiUrl}`);
        const response = await bibleClient.get(configurationApiUrl, {
            headers: USER_AGENT_HEADER,
        });

        // Assuming the data structure contains 'default_versions' array nested within response.data
        const languageConfigs: BibleLanguageConfig[] = response.data?.response?.data?.default_versions;

        if (!Array.isArray(languageConfigs)) {
            console.error('Invalid data structure received from configuration API or default_versions not found at expected path:', response.data);
            throw new Error('Failed to parse language data from configuration API.');
        }

        // Map to the desired format
        const languages = languageConfigs.map(lang => ({
            name: lang.local_name,
            code: lang.iso_639_3
        }));

        return languages;

    } catch (error) {
        console.error('Error fetching Bible languages:', error instanceof Error ? error.message : error);
        // Log more details if axios error
        if (axios.isAxiosError(error)) {
            console.error('Axios error details:', error.response?.status, error.response?.data);
        }
        throw new Error('Failed to fetch Bible languages.'); // Re-throw a generic error for the route handler
    }
}

// Fetches and processes available Bible versions for a given language code.
// Cached for 24 hours per language. Filtering happens AFTER cache.
export async function fetchBibleVersions(languageCode: string, searchQuery?: string): Promise<VersionInfo[]> {
    const allVersions = await getCached(
        `bible:versions:${encodeURIComponent(languageCode)}`,
        TTL.LONG,
        () => fetchBibleVersionsFromUpstream(languageCode)
    );

    if (!searchQuery) return allVersions;
    const q = searchQuery.toLowerCase();
    return allVersions.filter(v => v.name.toLowerCase().includes(q));
}

async function fetchBibleVersionsFromUpstream(languageCode: string): Promise<VersionInfo[]> {
    const apiUrl = versionsApiUrl(languageCode);
    console.log(`Fetching versions for language code '${languageCode}' from: ${apiUrl}`);

    try {
        const response = await bibleClient.get(apiUrl, {
            headers: USER_AGENT_HEADER,
        });

        // Log the entire response.data to inspect its structure
        //console.log(`Raw versions response data for ${languageCode}:`, JSON.stringify(response.data, null, 2));

        // Attempt a more common path first, then the more nested one as a fallback or specific case
        // The actual structure from bible.com/api/bible/versions/<code>.json is often just response.data (if it's an array) 
        // or response.data.versions
        let versionData: BibleVersion[];
        if (Array.isArray(response.data)) {
            versionData = response.data;
        } else if (response.data && Array.isArray(response.data.versions)) {
            versionData = response.data.versions;
        } else if (response.data?.response?.data?.versions && Array.isArray(response.data.response.data.versions)) {
            // Fallback to the previously attempted highly nested structure if others fail
            versionData = response.data.response.data.versions;
        } else {
            // Log the actual received structure for debugging if it fails
            console.error(`Invalid data structure or versions array not found for language code '${languageCode}'. Received:`, response.data);
            throw new Error(`Failed to parse versions data for language code: ${languageCode}`);
        }

        const versions = versionData.map(v => ({
            name: v.name || v.local_title || v.local_abbreviation,
            id: v.id,
            abbreviation: v.abbreviation || v.local_abbreviation
        }));

        console.log(`Successfully fetched and processed ${versions.length} versions for language code '${languageCode}'.`);
        return versions;

    } catch (error) {
        console.error(`Error fetching Bible versions for language code '${languageCode}':`, error instanceof Error ? error.message : error);
        if (axios.isAxiosError(error)) {
            console.error('Axios error details:', error.response?.status, error.response?.data);
        }
        throw new Error(`Failed to fetch Bible versions for language code: ${languageCode}`);
    }
}

// Fetches and processes the list of books and chapters for a given Bible version ID.
// Cached for 7 days per versionId — book structure essentially never changes.
export async function fetchBibleBooks(versionId: string, searchQuery?: string): Promise<BookInfo[]> {
    const allBooks = await getCached(
        `bible:books:${encodeURIComponent(versionId)}`,
        TTL.VERY_LONG,
        () => fetchBibleBooksFromUpstream(versionId)
    );

    if (!searchQuery) return allBooks;
    const q = searchQuery.toLowerCase();
    return allBooks.filter(book =>
        book.name.toLowerCase().includes(q) ||
        book.abbreviation.toLowerCase().includes(q)
    );
}

async function fetchBibleBooksFromUpstream(versionId: string): Promise<BookInfo[]> {
    const apiUrl = chapterApiUrl(versionId);
    console.log(`Fetching books for version ID '${versionId}' from: ${apiUrl}`);

    try {
        const response = await bibleClient.get(apiUrl, {
            headers: USER_AGENT_HEADER,
        });

        // Adjust path based on actual API response structure if needed
        const bookData: ApiBook[] = response.data?.books;

        if (!Array.isArray(bookData)) {
            console.error(`Invalid data structure or books array not found at expected path 'response.data.books' for version ID '${versionId}'. Received:`, response.data);
            throw new Error(`Failed to parse books data for version ID: ${versionId}`);
        }

        // Map to the desired format
        const books = bookData.map(b => ({
            name: b.human,
            nameLong: b.human_long,
            abbreviation: b.abbreviation,
            chapters: b.chapters
                .filter(c => c.canonical)
                .map(c => ({
                    number: c.human,
                    usfm: c.usfm
                }))
        }));

        return books;

    } catch (error) {
        console.error(`Error fetching Bible books for version ID '${versionId}':`, error instanceof Error ? error.message : error);
        if (axios.isAxiosError(error)) {
            console.error('Axios error details:', error.response?.status, error.response?.data);
        }
        throw new Error(`Failed to fetch Bible books for version ID: ${versionId}`);
    }
}

// Fetches chapter content, processes HTML classes, and returns it.
// Cached for 24 hours per (versionId, chapterUsfm).
// Note: jsonResponse contains a large parsed JSON blob. If we hit MongoDB's
// 16MB doc limit on this, the cache write will silently fail and we'll
// just always serve from upstream — that's fine.
export async function fetchAndProcessChapter(versionId: string, chapterUsfm: string): Promise<ChapterContentResponse> {
    return getCached(
        `bible:chapter:${encodeURIComponent(versionId)}:${encodeURIComponent(chapterUsfm)}`,
        TTL.LONG,
        () => fetchAndProcessChapterFromUpstream(versionId, chapterUsfm)
    );
}

async function fetchAndProcessChapterFromUpstream(versionId: string, chapterUsfm: string): Promise<ChapterContentResponse> {
    const apiUrl = readableApiUrl
        .replace('<version_id>', String(versionId))
        .replace('<chapter_usfm_plus_version_abbreviation>', chapterUsfm);

    console.log(`[Chapter Scrape] Fetching via Puppeteer for version ID '${versionId}', USFM '${chapterUsfm}' from: ${apiUrl}`);

    try {
        const html = await fetchHtmlWithPuppeteer(apiUrl);
        const $ = cheerio.load(html);

        // Bible.com's reader has the chapter content in elements with classes like .chapter or .ChapterContent_chapter
        // We will try to extract the main content container
        let contentHtml = '';
        
        const contentContainer = $('[class*="chapter"], [class*="ChapterContent_chapter"]').first().parent();
        
        if (contentContainer.length > 0) {
             contentHtml = contentContainer.html() || '';
        } else {
             // Fallback: extract the whole reader area
             const readerArea = $('[class*="reader"], [class*="Reader_"]').first();
             if (readerArea.length > 0) {
                 contentHtml = readerArea.html() || '';
             } else {
                 // Final fallback: the body
                 contentHtml = $('body').html() || '';
             }
        }

        if (!contentHtml) {
            console.error('Failed to extract chapter content HTML from Puppeteer response.');
            throw new Error('Failed to parse chapter content from HTML.');
        }

        // Transform class names
        const transformedHtml = contentHtml.replace(/class="([^"]*)"/g, (match, classString: string) => {
            const originalClasses = classString.split(' ');
            const newClasses = originalClasses
                .map(originalClass => bibleContentClassMap[originalClass] || originalClass)
                .join(' ');
            return `class="${newClasses}"`;
        });

        // Extract heading (e.g. "Genesis 1")
        const heading = $('h1, [class*="heading"], [class*="title"]').first().text().trim() || chapterUsfm;

        // Note: Previous and Next chapter information might be tricky to extract without the JSON.
        // For now, we will leave them null, or try to parse the pagination links if needed.
        // Bible.com typically has previous/next buttons in the nav.
        let previousChapterUsfm: any = null;
        let nextChapterUsfm: any = null;
        
        $('a[href*="/bible/"]').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().toLowerCase();
            if (href && (text.includes('previous') || text.includes('«') || $(el).attr('aria-label')?.toLowerCase().includes('previous'))) {
                const parts = href.split('/');
                const usfm = parts[parts.length - 1].replace('.json', '');
                previousChapterUsfm = { usfm, name: 'Previous Chapter' };
            }
            if (href && (text.includes('next') || text.includes('»') || $(el).attr('aria-label')?.toLowerCase().includes('next'))) {
                const parts = href.split('/');
                const usfm = parts[parts.length - 1].replace('.json', '');
                nextChapterUsfm = { usfm, name: 'Next Chapter' };
            }
        });

        return {
            html: transformedHtml,
            jsonResponse: {}, // No JSON response available anymore
            heading: heading,
            previousChapterUsfm,
            nextChapterUsfm
        };

    } catch (error) {
        console.error(`Error fetching/processing chapter ${chapterUsfm} for version ID '${versionId}':`, error instanceof Error ? error.message : error);
        if (axios.isAxiosError(error)) {
            console.error('Axios error details:', error.response?.status, error.response?.data);
        }
        throw new Error(`Failed to fetch or process chapter content for ${chapterUsfm}.`);
    }
}
