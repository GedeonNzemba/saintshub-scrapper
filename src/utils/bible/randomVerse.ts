import axios from 'axios';
import * as cheerio from 'cheerio';

const AXIOS_TIMEOUT = 10000;

const USER_AGENT_HEADER = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

export interface RandomVerse {
    reference: string;
    text: string;
    bookName: string;
    chapter: number;
    verse: number;
    versionId?: number;
    versionAbbreviation?: string;
}

// Curated list of popular/meaningful Bible verses with their USFM references
// Format: { usfm: "BOOK.CHAPTER.VERSE", reference: "Human readable", text?: "Pre-filled KJV text" }
interface VerseEntry {
    usfm: string;
    reference: string;
    text?: string; // Pre-filled KJV text — skips Bible.com fetch when present
}

const POPULAR_VERSES: VerseEntry[] = [
    // Old Testament
    { usfm: "GEN.1.1", reference: "Genesis 1:1" },
    { usfm: "GEN.1.27", reference: "Genesis 1:27" },
    { usfm: "GEN.28.15", reference: "Genesis 28:15" },
    { usfm: "EXO.14.14", reference: "Exodus 14:14" },
    { usfm: "DEU.31.6", reference: "Deuteronomy 31:6" },
    { usfm: "DEU.31.8", reference: "Deuteronomy 31:8" },
    { usfm: "JOS.1.9", reference: "Joshua 1:9" },
    { usfm: "1SA.16.7", reference: "1 Samuel 16:7" },
    { usfm: "PSA.23.1", reference: "Psalm 23:1" },
    { usfm: "PSA.23.4", reference: "Psalm 23:4" },
    { usfm: "PSA.27.1", reference: "Psalm 27:1" },
    { usfm: "PSA.34.8", reference: "Psalm 34:8" },
    { usfm: "PSA.37.4", reference: "Psalm 37:4" },
    { usfm: "PSA.46.1", reference: "Psalm 46:1" },
    { usfm: "PSA.46.10", reference: "Psalm 46:10" },
    { usfm: "PSA.51.10", reference: "Psalm 51:10" },
    { usfm: "PSA.91.1", reference: "Psalm 91:1" },
    { usfm: "PSA.91.11", reference: "Psalm 91:11" },
    { usfm: "PSA.118.24", reference: "Psalm 118:24" },
    { usfm: "PSA.119.105", reference: "Psalm 119:105" },
    { usfm: "PSA.121.1", reference: "Psalm 121:1" },
    { usfm: "PSA.139.14", reference: "Psalm 139:14" },
    { usfm: "PRO.3.5", reference: "Proverbs 3:5" },
    { usfm: "PRO.3.6", reference: "Proverbs 3:6" },
    { usfm: "PRO.16.3", reference: "Proverbs 16:3" },
    { usfm: "PRO.22.6", reference: "Proverbs 22:6" },
    { usfm: "PRO.27.17", reference: "Proverbs 27:17" },
    { usfm: "ECC.3.1", reference: "Ecclesiastes 3:1" },
    { usfm: "ISA.26.3", reference: "Isaiah 26:3" },
    { usfm: "ISA.40.31", reference: "Isaiah 40:31" },
    { usfm: "ISA.41.10", reference: "Isaiah 41:10" },
    { usfm: "ISA.43.2", reference: "Isaiah 43:2" },
    { usfm: "ISA.53.5", reference: "Isaiah 53:5" },
    { usfm: "ISA.55.8", reference: "Isaiah 55:8" },
    { usfm: "JER.29.11", reference: "Jeremiah 29:11" },
    { usfm: "JER.33.3", reference: "Jeremiah 33:3" },
    { usfm: "LAM.3.22", reference: "Lamentations 3:22" },
    { usfm: "LAM.3.23", reference: "Lamentations 3:23" },
    { usfm: "MIC.6.8", reference: "Micah 6:8" },
    { usfm: "NAH.1.7", reference: "Nahum 1:7" },
    { usfm: "ZEP.3.17", reference: "Zephaniah 3:17" },
    
    // New Testament
    { usfm: "MAT.5.14", reference: "Matthew 5:14" },
    { usfm: "MAT.5.16", reference: "Matthew 5:16" },
    { usfm: "MAT.6.33", reference: "Matthew 6:33" },
    { usfm: "MAT.7.7", reference: "Matthew 7:7" },
    { usfm: "MAT.11.28", reference: "Matthew 11:28" },
    { usfm: "MAT.19.26", reference: "Matthew 19:26" },
    { usfm: "MAT.28.19", reference: "Matthew 28:19" },
    { usfm: "MAT.28.20", reference: "Matthew 28:20" },
    { usfm: "MRK.9.23", reference: "Mark 9:23" },
    { usfm: "MRK.10.27", reference: "Mark 10:27" },
    { usfm: "MRK.11.24", reference: "Mark 11:24" },
    { usfm: "LUK.1.37", reference: "Luke 1:37" },
    { usfm: "LUK.6.31", reference: "Luke 6:31" },
    { usfm: "LUK.11.9", reference: "Luke 11:9" },
    { usfm: "JHN.1.1", reference: "John 1:1" },
    { usfm: "JHN.1.14", reference: "John 1:14" },
    { usfm: "JHN.3.16", reference: "John 3:16" },
    { usfm: "JHN.3.17", reference: "John 3:17" },
    { usfm: "JHN.8.32", reference: "John 8:32" },
    { usfm: "JHN.10.10", reference: "John 10:10" },
    { usfm: "JHN.11.25", reference: "John 11:25" },
    { usfm: "JHN.13.34", reference: "John 13:34" },
    { usfm: "JHN.14.6", reference: "John 14:6" },
    { usfm: "JHN.14.27", reference: "John 14:27" },
    { usfm: "JHN.15.5", reference: "John 15:5" },
    { usfm: "JHN.15.13", reference: "John 15:13" },
    { usfm: "JHN.16.33", reference: "John 16:33" },
    { usfm: "ACT.1.8", reference: "Acts 1:8" },
    { usfm: "ACT.2.38", reference: "Acts 2:38" },
    { usfm: "ROM.3.23", reference: "Romans 3:23" },
    { usfm: "ROM.5.8", reference: "Romans 5:8" },
    { usfm: "ROM.6.23", reference: "Romans 6:23" },
    { usfm: "ROM.8.1", reference: "Romans 8:1" },
    { usfm: "ROM.8.18", reference: "Romans 8:18" },
    { usfm: "ROM.8.28", reference: "Romans 8:28" },
    { usfm: "ROM.8.31", reference: "Romans 8:31" },
    { usfm: "ROM.8.37", reference: "Romans 8:37" },
    { usfm: "ROM.8.38", reference: "Romans 8:38" },
    { usfm: "ROM.10.9", reference: "Romans 10:9" },
    { usfm: "ROM.12.2", reference: "Romans 12:2" },
    { usfm: "ROM.12.12", reference: "Romans 12:12" },
    { usfm: "ROM.15.13", reference: "Romans 15:13" },
    { usfm: "1CO.10.13", reference: "1 Corinthians 10:13" },
    { usfm: "1CO.13.4", reference: "1 Corinthians 13:4" },
    { usfm: "1CO.13.13", reference: "1 Corinthians 13:13" },
    { usfm: "1CO.15.58", reference: "1 Corinthians 15:58" },
    { usfm: "1CO.16.14", reference: "1 Corinthians 16:14" },
    { usfm: "2CO.4.18", reference: "2 Corinthians 4:18" },
    { usfm: "2CO.5.7", reference: "2 Corinthians 5:7" },
    { usfm: "2CO.5.17", reference: "2 Corinthians 5:17" },
    { usfm: "2CO.12.9", reference: "2 Corinthians 12:9" },
    { usfm: "GAL.2.20", reference: "Galatians 2:20" },
    { usfm: "GAL.5.22", reference: "Galatians 5:22" },
    { usfm: "GAL.6.9", reference: "Galatians 6:9" },
    { usfm: "EPH.2.8", reference: "Ephesians 2:8" },
    { usfm: "EPH.2.10", reference: "Ephesians 2:10" },
    { usfm: "EPH.3.20", reference: "Ephesians 3:20" },
    { usfm: "EPH.4.32", reference: "Ephesians 4:32" },
    { usfm: "EPH.6.10", reference: "Ephesians 6:10" },
    { usfm: "EPH.6.11", reference: "Ephesians 6:11" },
    { usfm: "PHP.1.6", reference: "Philippians 1:6" },
    { usfm: "PHP.2.3", reference: "Philippians 2:3" },
    { usfm: "PHP.4.4", reference: "Philippians 4:4" },
    { usfm: "PHP.4.6", reference: "Philippians 4:6" },
    { usfm: "PHP.4.7", reference: "Philippians 4:7" },
    { usfm: "PHP.4.8", reference: "Philippians 4:8" },
    { usfm: "PHP.4.13", reference: "Philippians 4:13" },
    { usfm: "PHP.4.19", reference: "Philippians 4:19" },
    { usfm: "COL.3.2", reference: "Colossians 3:2" },
    { usfm: "COL.3.12", reference: "Colossians 3:12" },
    { usfm: "COL.3.23", reference: "Colossians 3:23" },
    { usfm: "1TH.5.16", reference: "1 Thessalonians 5:16" },
    { usfm: "1TH.5.17", reference: "1 Thessalonians 5:17" },
    { usfm: "1TH.5.18", reference: "1 Thessalonians 5:18" },
    { usfm: "2TI.1.7", reference: "2 Timothy 1:7" },
    { usfm: "2TI.3.16", reference: "2 Timothy 3:16" },
    { usfm: "HEB.4.12", reference: "Hebrews 4:12" },
    { usfm: "HEB.4.16", reference: "Hebrews 4:16" },
    { usfm: "HEB.11.1", reference: "Hebrews 11:1" },
    { usfm: "HEB.11.6", reference: "Hebrews 11:6" },
    { usfm: "HEB.12.1", reference: "Hebrews 12:1" },
    { usfm: "HEB.12.2", reference: "Hebrews 12:2" },
    { usfm: "HEB.13.5", reference: "Hebrews 13:5" },
    { usfm: "HEB.13.8", reference: "Hebrews 13:8" },
    { usfm: "JAS.1.2", reference: "James 1:2" },
    { usfm: "JAS.1.5", reference: "James 1:5" },
    { usfm: "JAS.1.17", reference: "James 1:17" },
    { usfm: "JAS.4.7", reference: "James 4:7" },
    { usfm: "JAS.4.8", reference: "James 4:8" },
    { usfm: "1PE.5.7", reference: "1 Peter 5:7" },
    { usfm: "1JN.1.9", reference: "1 John 1:9" },
    { usfm: "1JN.4.4", reference: "1 John 4:4" },
    { usfm: "1JN.4.7", reference: "1 John 4:7" },
    { usfm: "1JN.4.8", reference: "1 John 4:8" },
    { usfm: "1JN.4.19", reference: "1 John 4:19" },
    { usfm: "REV.3.20", reference: "Revelation 3:20" },
    { usfm: "REV.21.4", reference: "Revelation 21:4" },

    // ── Curated multi-verse passages & additional verses (pre-filled KJV text) ──

    // Trust & Guidance
    { usfm: "PRO.3.5", reference: "Proverbs 3:5-6", text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths." },
    { usfm: "JHN.14.26", reference: "John 14:26", text: "But the Comforter, which is the Holy Ghost, whom the Father will send in my name, he shall teach you all things, and bring all things to your remembrance, whatsoever I have said unto you." },

    // Overcoming
    { usfm: "ISA.40.31", reference: "Isaiah 40:31", text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint." },
    { usfm: "ISA.41.10", reference: "Isaiah 41:10", text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness." },
    { usfm: "REV.21.3", reference: "Revelation 21:3-4", text: "And I heard a great voice out of heaven saying, Behold, the tabernacle of God is with men, and he will dwell with them, and they shall be his people, and God himself shall be with them, and be their God. And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away." },
    { usfm: "PHP.4.13", reference: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me." },

    // Peace
    { usfm: "ISA.26.3", reference: "Isaiah 26:3", text: "Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee." },
    { usfm: "PHP.4.6", reference: "Philippians 4:6-7", text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus." },
    { usfm: "JHN.14.27", reference: "John 14:27", text: "Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid." },

    // Life Principles
    { usfm: "COL.3.23", reference: "Colossians 3:23", text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men." },
    { usfm: "2CO.5.17", reference: "2 Corinthians 5:17", text: "Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new." },
    { usfm: "PHP.4.8", reference: "Philippians 4:8", text: "Finally, brethren, whatsoever things are true, whatsoever things are honest, whatsoever things are just, whatsoever things are pure, whatsoever things are lovely, whatsoever things are of good report; if there be any virtue, and if there be any praise, think on these things." },
    { usfm: "JAS.4.7", reference: "James 4:7", text: "Submit yourselves therefore to God. Resist the devil, and he will flee from you." },
    { usfm: "MAT.6.33", reference: "Matthew 6:33", text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you." },

    // Relationships With Others
    { usfm: "JAS.1.19", reference: "James 1:19", text: "Wherefore, my beloved brethren, let every man be swift to hear, slow to speak, slow to wrath." },
    { usfm: "ROM.12.14", reference: "Romans 12:14-15", text: "Bless them which persecute you: bless, and curse not. Rejoice with them that do rejoice, and weep with them that weep." },
    { usfm: "JHN.13.34", reference: "John 13:34", text: "A new commandment I give unto you, That ye love one another; as I have loved you, that ye also love one another. By this shall all men know that ye are my disciples, if ye have love one to another." },

    // Salvation
    { usfm: "ROM.8.1", reference: "Romans 8:1", text: "There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit." },
    { usfm: "JHN.14.6", reference: "John 14:6", text: "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me." },
    { usfm: "1JN.1.9", reference: "1 John 1:9", text: "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness." },
    { usfm: "JHN.3.16", reference: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
];

// Book abbreviation to full name mapping
const BOOK_NAMES: { [key: string]: string } = {
    "GEN": "Genesis", "EXO": "Exodus", "LEV": "Leviticus", "NUM": "Numbers",
    "DEU": "Deuteronomy", "JOS": "Joshua", "JDG": "Judges", "RUT": "Ruth",
    "1SA": "1 Samuel", "2SA": "2 Samuel", "1KI": "1 Kings", "2KI": "2 Kings",
    "1CH": "1 Chronicles", "2CH": "2 Chronicles", "EZR": "Ezra", "NEH": "Nehemiah",
    "EST": "Esther", "JOB": "Job", "PSA": "Psalms", "PRO": "Proverbs",
    "ECC": "Ecclesiastes", "SNG": "Song of Solomon", "ISA": "Isaiah", "JER": "Jeremiah",
    "LAM": "Lamentations", "EZK": "Ezekiel", "DAN": "Daniel", "HOS": "Hosea",
    "JOL": "Joel", "AMO": "Amos", "OBA": "Obadiah", "JON": "Jonah",
    "MIC": "Micah", "NAH": "Nahum", "HAB": "Habakkuk", "ZEP": "Zephaniah",
    "HAG": "Haggai", "ZEC": "Zechariah", "MAL": "Malachi",
    "MAT": "Matthew", "MRK": "Mark", "LUK": "Luke", "JHN": "John",
    "ACT": "Acts", "ROM": "Romans", "1CO": "1 Corinthians", "2CO": "2 Corinthians",
    "GAL": "Galatians", "EPH": "Ephesians", "PHP": "Philippians", "COL": "Colossians",
    "1TH": "1 Thessalonians", "2TH": "2 Thessalonians", "1TI": "1 Timothy", "2TI": "2 Timothy",
    "TIT": "Titus", "PHM": "Philemon", "HEB": "Hebrews", "JAS": "James",
    "1PE": "1 Peter", "2PE": "2 Peter", "1JN": "1 John", "2JN": "2 John",
    "3JN": "3 John", "JUD": "Jude", "REV": "Revelation"
};

/**
 * Parse USFM string to extract book, chapter, and verse
 * @param usfm - USFM string like "GEN.1.1" or "JHN.3.16"
 */
function parseUsfm(usfm: string): { book: string; chapter: number; verse: number } {
    const parts = usfm.split('.');
    return {
        book: parts[0],
        chapter: parseInt(parts[1], 10),
        verse: parseInt(parts[2], 10)
    };
}

/**
 * Strip leading verse number from text
 * Handles cases like "19For that which..." -> "For that which..."
 * @param text - The verse text that may have a leading verse number
 */
function stripLeadingVerseNumber(text: string): string {
    if (!text) return text;
    // Remove leading digits (verse numbers) from the beginning of the text
    // This handles cases like "19For" -> "For" or "5But" -> "But"
    return text.replace(/^\d+\s*/, '').trim();
}

/**
 * Fetch the actual verse text from Bible.com
 * @param versionId - Bible version ID (default: 1 for KJV)
 * @param usfm - USFM reference like "GEN.1.1"
 */
async function fetchVerseText(versionId: number, usfm: string): Promise<string | null> {
    try {
        const parsed = parseUsfm(usfm);
        const chapterUsfm = `${parsed.book}.${parsed.chapter}`;
        
        // Fetch the chapter content
        const apiUrl = `https://www.bible.com/bible/${versionId}/${chapterUsfm}.json`;
        
        const response = await axios.get(apiUrl, {
            headers: USER_AGENT_HEADER,
            timeout: AXIOS_TIMEOUT
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Find the __NEXT_DATA__ script tag
        const nextDataScript = $('#__NEXT_DATA__').html();
        if (!nextDataScript) {
            console.error('__NEXT_DATA__ not found for verse fetch');
            return null;
        }

        const jsonData = JSON.parse(nextDataScript);
        const contentHtml = jsonData?.props?.pageProps?.chapterInfo?.content;
        
        if (!contentHtml) {
            return null;
        }

        // Parse the chapter HTML to find the specific verse
        const $content = cheerio.load(contentHtml);
        
        // Look for the verse by data-usfm attribute or verse number
        let verseText = '';
        
        // Try to find verse by looking for verse markers
        $content('[data-usfm]').each((_, el) => {
            const dataUsfm = $content(el).attr('data-usfm');
            if (dataUsfm && dataUsfm.includes(usfm)) {
                verseText = $content(el).text().trim();
            }
        });

        // Alternative: Look for verse spans with class containing 'verse'
        if (!verseText) {
            $content('[class*="verse"]').each((_, el) => {
                const verseContent = $content(el);
                const label = verseContent.find('[class*="label"]').text().trim();
                if (label === String(parsed.verse)) {
                    verseText = verseContent.find('[class*="content"]').text().trim();
                }
            });
        }

        // Strip any leading verse numbers from the text
        return verseText ? stripLeadingVerseNumber(verseText) : null;
    } catch (error) {
        console.error('Error fetching verse text:', error instanceof Error ? error.message : error);
        return null;
    }
}

/**
 * Get a random Bible verse from the curated list
 * @param versionId - Bible version ID (default: 1 for KJV)
 * @param fetchText - Whether to fetch the actual verse text from Bible.com
 */
export async function getRandomVerse(versionId: number = 1, fetchText: boolean = true): Promise<RandomVerse> {
    // Select a random verse from the curated list
    const randomIndex = Math.floor(Math.random() * POPULAR_VERSES.length);
    const selectedVerse = POPULAR_VERSES[randomIndex];
    const parsed = parseUsfm(selectedVerse.usfm);
    
    let verseText = '';

    if (selectedVerse.text) {
        // Use pre-filled text (multi-verse passages or curated KJV text)
        verseText = selectedVerse.text;
    } else if (fetchText) {
        const fetchedText = await fetchVerseText(versionId, selectedVerse.usfm);
        verseText = fetchedText || `[Verse text for ${selectedVerse.reference}]`;
    }

    return {
        reference: selectedVerse.reference,
        text: verseText,
        bookName: BOOK_NAMES[parsed.book] || parsed.book,
        chapter: parsed.chapter,
        verse: parsed.verse,
        versionId: versionId,
        versionAbbreviation: versionId === 1 ? 'KJV' : undefined
    };
}

/**
 * Get multiple random Bible verses
 * @param count - Number of random verses to return
 * @param versionId - Bible version ID (default: 1 for KJV)
 * @param fetchText - Whether to fetch the actual verse text
 */
export async function getMultipleRandomVerses(
    count: number = 5, 
    versionId: number = 1, 
    fetchText: boolean = true
): Promise<RandomVerse[]> {
    // Ensure we don't request more verses than available
    const maxCount = Math.min(count, POPULAR_VERSES.length);
    
    // Shuffle and pick unique verses
    const shuffled = [...POPULAR_VERSES].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, maxCount);
    
    const verses: RandomVerse[] = [];
    
    for (const verse of selected) {
        const parsed = parseUsfm(verse.usfm);
        let verseText = '';

        if (verse.text) {
            // Use pre-filled text
            verseText = verse.text;
        } else if (fetchText) {
            const fetchedText = await fetchVerseText(versionId, verse.usfm);
            verseText = fetchedText || `[Verse text for ${verse.reference}]`;
        }
        
        verses.push({
            reference: verse.reference,
            text: verseText,
            bookName: BOOK_NAMES[parsed.book] || parsed.book,
            chapter: parsed.chapter,
            verse: parsed.verse,
            versionId: versionId
        });
    }
    
    return verses;
}

/**
 * Get the list of available verse references (without fetching text)
 */
export function getAvailableVerseReferences(): { usfm: string; reference: string }[] {
    return POPULAR_VERSES.map(v => ({ usfm: v.usfm, reference: v.reference }));
}

/**
 * Get total count of available curated verses
 */
export function getAvailableVersesCount(): number {
    return POPULAR_VERSES.length;
}
