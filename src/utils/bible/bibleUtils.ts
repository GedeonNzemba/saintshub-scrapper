import axios from 'axios';
import * as cheerio from 'cheerio';
import { configurationApiUrl, versionsApiUrl, chapterApiUrl, readableApiUrl } from './utils/api';

const AXIOS_TIMEOUT = 10000; // 10 seconds

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

// Fetches and processes the list of available Bible languages
export async function fetchBibleLanguages(searchQuery?: string): Promise<LanguageInfo[]> {
    try {
        console.log(`Fetching languages from: ${configurationApiUrl}`);
        const response = await axios.get(configurationApiUrl, {
            headers: USER_AGENT_HEADER,
            timeout: AXIOS_TIMEOUT
        });

        // Assuming the data structure contains 'default_versions' array nested within response.data
        const languageConfigs: BibleLanguageConfig[] = response.data?.response?.data?.default_versions;

        if (!Array.isArray(languageConfigs)) {
            console.error('Invalid data structure received from configuration API or default_versions not found at expected path:', response.data);
            throw new Error('Failed to parse language data from configuration API.');
        }

        // Map to the desired format
        let languages = languageConfigs.map(lang => ({
            name: lang.local_name,
            code: lang.iso_639_3
        }));

        // Filter languages if searchQuery is provided
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            languages = languages.filter(lang => 
                lang.name.toLowerCase().includes(lowercasedQuery)
            );
        }

        // console.log(`Successfully fetched and processed ${languages.length} languages.`);
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

// Fetches and processes available Bible versions for a given language code
export async function fetchBibleVersions(languageCode: string, searchQuery?: string): Promise<VersionInfo[]> {
    // Construct the specific API URL for the language
    const apiUrl = versionsApiUrl(languageCode);
    console.log(`Fetching versions for language code '${languageCode}' from: ${apiUrl}`);

    try {
        const response = await axios.get(apiUrl, {
            headers: USER_AGENT_HEADER,
            timeout: AXIOS_TIMEOUT
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

        // Map to the desired format { name: string, id: number | string, abbreviation?: string }
        // The frontend bible.html uses 'version.name' for display and 'version.id' for value.
        // The VersionInfo interface expects name, id, and optionally abbreviation.
        let versions = versionData.map(v => ({
            name: v.name || v.local_title || v.local_abbreviation, // Prioritize fuller name if available
            id: v.id,
            abbreviation: v.abbreviation || v.local_abbreviation // Store abbreviation if needed elsewhere
        }));

        // Filter versions if searchQuery is provided
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            versions = versions.filter(version => 
                version.name.toLowerCase().includes(lowercasedQuery)
            );
        }

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

// Fetches and processes the list of books and chapters for a given Bible version ID
export async function fetchBibleBooks(versionId: string, searchQuery?: string): Promise<BookInfo[]> {
    // Construct the API URL by replacing the placeholder with the actual version ID
    const apiUrl = chapterApiUrl(versionId);
    console.log(`Fetching books for version ID '${versionId}' from: ${apiUrl}`);

    try {
        const response = await axios.get(apiUrl, {
            headers: USER_AGENT_HEADER,
            timeout: AXIOS_TIMEOUT
        });

        // Adjust path based on actual API response structure if needed
        const bookData: ApiBook[] = response.data?.books;

        if (!Array.isArray(bookData)) {
            console.error(`Invalid data structure or books array not found at expected path 'response.data.books' for version ID '${versionId}'. Received:`, response.data);
            throw new Error(`Failed to parse books data for version ID: ${versionId}`);
        }

        // Map to the desired format
        let books = bookData.map(b => ({
            name: b.human,  // Use short name (e.g., "Genesis", "Genèse") for header display
            nameLong: b.human_long, // Long/detailed name for book picker "Detailed" mode
            abbreviation: b.abbreviation,
            chapters: b.chapters
                .filter(c => c.canonical) // Only include canonical chapters if needed
                .map(c => ({
                    number: c.human,
                    usfm: c.usfm
                }))
        }));

        // Filter books if searchQuery is provided
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            books = books.filter(book => 
                book.name.toLowerCase().includes(lowercasedQuery) || 
                book.abbreviation.toLowerCase().includes(lowercasedQuery)
            );
        }

        //console.log(`Successfully fetched and processed ${books.length} books for version ID '${versionId}'.`);
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
export async function fetchAndProcessChapter(versionId: string, chapterUsfm: string): Promise<ChapterContentResponse> {
    // Construct the API URL
    const apiUrl = readableApiUrl
        .replace('<version_id>', String(versionId))
        .replace('<chapter_usfm_plus_version_abbreviation>', chapterUsfm);

    console.log(`Fetching chapter content for version ID '${versionId}', USFM '${chapterUsfm}' from: ${apiUrl}`);

    try {
        const response = await axios.get<string>(apiUrl, { // Expect a string (HTML) response
            headers: USER_AGENT_HEADER,
            timeout: AXIOS_TIMEOUT
        });

        // Log the raw HTML response to help with debugging if needed
        // console.log('Raw chapter API HTML response data:', response.data);

        // Load the HTML into cheerio
        const $ = cheerio.load(response.data);

        // Find the script tag with id __NEXT_DATA__
        const nextDataScript = $('#__NEXT_DATA__').html();

        if (!nextDataScript) {
            console.error('__NEXT_DATA__ script tag not found in the HTML response.');
            throw new Error('Failed to find __NEXT_DATA__ script tag.');
        }

        // Parse the JSON content from the script tag
        let jsonData;
        try {
            jsonData = JSON.parse(nextDataScript);
        } catch (parseError) {
            console.error('Failed to parse JSON from __NEXT_DATA__ script tag:', parseError);
            throw new Error('Failed to parse chapter JSON data.');
        }

        // Log the parsed JSON structure
        // console.log('Parsed JSON props from __NEXT_DATA__:', JSON.stringify(jsonData?.props, null, 2));

        const chapterInfo = jsonData?.props?.pageProps?.chapterInfo;
        if (!chapterInfo || typeof chapterInfo.content !== 'string') {
            console.error('Invalid chapter data structure or content HTML not found in parsed JSON. Received:', jsonData);
            throw new Error('Failed to parse chapter content from JSON.');
        }
        let contentHtml: string = chapterInfo.content;

        // Transform class names
        const transformedHtml = contentHtml.replace(/class="([^"]*)"/g, (match, classString: string) => {
            const originalClasses = classString.split(' ');
            const newClasses = originalClasses
                .map(originalClass => bibleContentClassMap[originalClass] || originalClass)
                .join(' ');
            return `class="${newClasses}"`;
        });

        // Extract previous and next chapter information if available
        const prevChapInfo = jsonData?.props?.pageProps?.chapterInfo?.previous;
        const nextChapInfo = jsonData?.props?.pageProps?.chapterInfo?.next;

        //console.log(`Successfully fetched and processed chapter content for ${chapterUsfm}.`);

        return {
            html: transformedHtml,
            jsonResponse: jsonData,
            heading: jsonData?.props?.pageProps?.chapterInfo?.reference?.human,
            previousChapterUsfm: prevChapInfo ? { usfm: prevChapInfo.usfm, name: prevChapInfo.reference?.human } : null,
            nextChapterUsfm: nextChapInfo ? { usfm: nextChapInfo.usfm, name: nextChapInfo.reference?.human } : null
        };

    } catch (error) {
        console.error(`Error fetching/processing chapter ${chapterUsfm} for version ID '${versionId}':`, error instanceof Error ? error.message : error);
        if (axios.isAxiosError(error)) {
            console.error('Axios error details:', error.response?.status, error.response?.data);
        }
        throw new Error(`Failed to fetch or process chapter content for ${chapterUsfm}.`);
    }
}
