import 'dotenv/config';
import express, { Request, Response } from 'express';
import { AnyNode } from 'domhandler';
import { fetchLanguages } from './utils/fetchLanguages';
import { processMessageHtml } from './utils/formatter/processHTML';
import { getSermonsByYear } from './utils/getSermonsByYear';
import { createScrapeClient } from './utils/cookie jar/enableCookie';
import { changeLanguage } from './utils/change language/changeLanguage';
import { getSermonsByLength, Lenght } from './utils/getSermonsByLength';
import { getSermonsBySeries, Series } from './utils/getSermonsBySeries';
import { searchSermons } from './utils/searchSermons';
import { readSermonBook } from './utils/readSermonBook';
import { downloadSermonBook } from './utils/downloadSermonBook';
import { downloadSermon } from './utils/downloadSermon';
import { streamSermon } from './utils/streamSermon';
import { fetchDailyQuoteAndVerseData } from './utils/quote/quoteUtils';
import { fetchVerseOfTheDay, fetchCombinedVerseOfTheDay } from './utils/bible/verseOfTheDay';
import { 
    getRandomVerse, 
    getMultipleRandomVerses, 
    getAvailableVerseReferences,
    getAvailableVersesCount 
} from './utils/bible/randomVerse';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { 
    fetchBibleLanguages, 
    fetchBibleVersions, 
    fetchBibleBooks,
    fetchAndProcessChapter 
} from './utils/bible/bibleUtils';
import {
    createHighlight,
    getHighlights,
    getHighlightById,
    updateHighlight,
    deleteHighlight,
    createNote,
    getNotes,
    getNoteById,
    updateNote,
    deleteNote
} from './utils/annotationHandlers';
import { connectToDatabase, closeDatabaseConnection, pingDatabase } from './utils/database/connection';
import { initializeAnnotationIndexes } from './utils/annotationHandlers';
import { initializeCacheIndexes, getCached, TTL } from './utils/cache';
import { closeBrowser, ensureChromeInstalled } from './utils/puppeteerHelper';
import { 
  createResource, 
  getAllResources, 
  getResourceById, 
  updateResource, 
  deleteResource, 
  deleteAllResources,
  initializeResourceIndexes,
  // Nested operations
  getSections,
  addSection,
  updateSection,
  deleteSection,
  getJourneyTemplates,
  getCollections,
  getCollectionById
} from './utils/database/resourceHandlers';const app = express();
const port = parseInt(process.env.PORT || '8080', 10);

// ─── Security & body parsing ──────────────────────────────────────
// Trust proxy headers (Railway, Vercel, Cloudflare) so rate limiter sees real client IP
app.set('trust proxy', 1);

// Security headers. crossOriginResourcePolicy disabled because we serve audio
// streams and PDFs cross-origin to the React Native app.
app.use(helmet({ crossOriginResourcePolicy: false }));

// Response compression (gzip/brotli) for JSON + HTML payloads
app.use(compression());

// JSON body parser with explicit size limit to prevent memory exhaustion
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CORS allow-list — set EXPO_PUBLIC_ALLOWED_ORIGINS in Railway as comma-separated
// origins. Defaults to "*" so the existing mobile app keeps working until you
// lock it down. Mobile RN apps don't send Origin headers anyway; this mainly
// protects the admin dashboard.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length === 0 ? true : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

// Per-IP rate limit on API routes. 300 req/min is generous for normal users
// but blocks scraping/abuse. Set RATE_LIMIT_MAX in env to tune.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// ─── Static assets ────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'utils/bible')));
app.use('/static_fonts', express.static(path.join(__dirname, '../fonts')));
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// Lightweight request logging. In production we should swap to a structured
// logger (Winston/Pino) — that's Phase 3.
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// ─── Health checks ────────────────────────────────────────────────
// Liveness: process is up. Used by Railway to know the container is alive.
app.get('/', (_req, res) => {
  res.send('Server is up and running!');
});

// Readiness: process is up AND can reach MongoDB. Use this in your load
// balancer / orchestrator to drain unhealthy instances.
app.get('/health', async (_req, res) => {
  const dbHealthy = await pingDatabase();
  if (!dbHealthy) {
    return res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
  res.json({ status: 'healthy', database: 'connected' });
});


// ---------------  SERMON API --------------

// GET LANGUAGES
// Cached 7d — branham.org's supported language list is essentially static.
app.get('/api/v3/languages', async (req, res) => {
  try {
    const result = await getCached(
      'sermon:languages',
      TTL.VERY_LONG,
      () => fetchLanguages()
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

// CHANGE LANGUAGE
// NOTE: This endpoint is largely a no-op now that each request uses its own
// cookie jar. We keep it for backwards compatibility with the frontend.
app.get('/api/v3/changeLanguage', async (req: Request<{}, {}, {}, { languageCode: string }>, res: Response) => {
  const { languageCode } = req.query;
  try {
    if (!languageCode) {
      return res.status(400).json({ error: 'Missing language code' });
    }
    const scrapeClient = createScrapeClient();
    await changeLanguage(languageCode, scrapeClient);
    res.json({ message: 'Language changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});



// Helper function for pagination
function paginateArray<T>(data: T[], page: number, limit: number): T[] {
  const startIndex = (page - 1) * limit;
  return data.slice(startIndex, startIndex + limit);
}

// GET SERMON BY LANGUAGE
app.get('/api/v3/sermons', async (req: Request<{}, {}, {}, { languageCode: string; page?: string; limit?: string }>, res: Response) => {
  const { languageCode } = req.query;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  try {
    if (!languageCode) {
      return res.status(400).json({ error: 'Missing language code' });
    }

    // Cache the FULL scrape (pre-pagination), keyed by language. Pagination
    // happens per-request from the cached array, so ?page=1 and ?page=2
    // share the same cache entry.
    const cleanedData = await getCached<unknown[]>(
      `sermon:all:${encodeURIComponent(languageCode)}`,
      TTL.MEDIUM,
      async () => {
        const scrapeClient = createScrapeClient();
        await changeLanguage(languageCode, scrapeClient);
        const response = await scrapeClient.post(
          'https://branham.org/branham/messageaudio.aspx/wmSearch',
          { formVars: [{ name: 'searchcriteria', value: '' }] },
          { headers: { 'Content-Type': 'application/json' } }
        );
        return response.data.d
          .filter((item: string) => typeof item === 'string' && item.includes('<div'))
          .flatMap((html: AnyNode) => processMessageHtml(html));
      }
    );

    const paginatedData = paginateArray(cleanedData, page, limit);
    res.json({ d: paginatedData });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

// GET SERMON BY YEAR
app.get('/api/v3/sermonsByYear', async (req: Request<{}, {}, {}, { languageCode: string; yearCode: string; page?: string; limit?: string }>, res: Response) => {
  const { languageCode, yearCode } = req.query;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  try {
    if (!languageCode || !yearCode) {
      return res.status(400).json({ error: 'Missing language code or year code' });
    }

    const fullResult = await getCached<{ d: any[] }>(
      `sermon:byYear:${encodeURIComponent(languageCode)}:${encodeURIComponent(yearCode)}`,
      TTL.MEDIUM,
      async () => {
        const scrapeClient = createScrapeClient();
        await changeLanguage(languageCode, scrapeClient);
        return getSermonsByYear(yearCode, scrapeClient);
      }
    );

    const itemsToPaginate = Array.isArray(fullResult?.d) ? fullResult.d : [];
    res.json({ ...fullResult, d: paginateArray(itemsToPaginate, page, limit) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
})

// GET SERMON BY LENGTH
app.get('/api/v3/sermonsByLength', async (req: Request<{}, {}, {}, { languageCode: string; lengthCode: Lenght; page?: string; limit?: string }>, res: Response) => {
  const { languageCode, lengthCode } = req.query;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  try {
    if (!languageCode || !lengthCode) {
      return res.status(400).json({ error: 'Missing language code or length code' });
    }

    const fullResult = await getCached<{ d: any[] }>(
      `sermon:byLength:${encodeURIComponent(languageCode)}:${encodeURIComponent(lengthCode)}`,
      TTL.MEDIUM,
      async () => {
        const scrapeClient = createScrapeClient();
        await changeLanguage(languageCode, scrapeClient);
        return getSermonsByLength(lengthCode, scrapeClient);
      }
    );

    const itemsToPaginate = Array.isArray(fullResult?.d) ? fullResult.d : [];
    res.json({ ...fullResult, d: paginateArray(itemsToPaginate, page, limit) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
})

// GET SERMON BY SERIES
app.get('/api/v3/sermonsBySeries', async (req: Request<{}, {}, {}, { languageCode: string; seriesCode: Series; page?: string; limit?: string }>, res: Response) => {
  const { languageCode, seriesCode } = req.query;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  try {
    if (!languageCode || !seriesCode) {
      return res.status(400).json({ error: 'Missing language code or series code' });
    }

    const fullResult = await getCached<{ d: any[] }>(
      `sermon:bySeries:${encodeURIComponent(languageCode)}:${encodeURIComponent(seriesCode)}`,
      TTL.MEDIUM,
      async () => {
        const scrapeClient = createScrapeClient();
        await changeLanguage(languageCode, scrapeClient);
        return getSermonsBySeries(seriesCode, scrapeClient);
      }
    );

    const itemsToPaginate = Array.isArray(fullResult?.d) ? fullResult.d : [];
    res.json({ ...fullResult, d: paginateArray(itemsToPaginate, page, limit) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
})

// SEARCH SERMON
app.get('/api/v3/searchSermons', async (req: Request<{}, {}, {}, { languageCode: string; key: string; page?: string; limit?: string }>, res: Response) => {
  const { languageCode, key } = req.query;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  try {
    if (!languageCode || !key) {
      return res.status(400).json({ error: 'Missing language code or key' });
    }

    // Search uses a shorter TTL — results are user-specific queries and we
    // don't want stale matches lingering too long.
    const fullResult = await getCached<{ d: any[] }>(
      `sermon:search:${encodeURIComponent(languageCode)}:${encodeURIComponent(key)}`,
      TTL.SHORT,
      async () => {
        const scrapeClient = createScrapeClient();
        await changeLanguage(languageCode, scrapeClient);
        return searchSermons(key, scrapeClient);
      }
    );

    const itemsToPaginate = Array.isArray(fullResult?.d) ? fullResult.d : [];
    res.json({ ...fullResult, d: paginateArray(itemsToPaginate, page, limit) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
})

// READ | DOWNLOAD SERMON BOOK
// NOTE: IT WILL RECIEVE THE FOL
// LOWING URL FORMAT:  https://d2w09gj4mqt5u.cloudfront.net/repo/f95/f95b397bc12b7cec9d59f1a8903db10478b1e454e92c22dfddf91a2f59bbcf58589adecdc1fd8e408ec46345d0ff2bcdcc124de2678dff5dd1e489981cbfe8f6.pdf
// 1. API TO READ THE PDF
app.get('/api/v3/readSermonBook', async (req: Request<{}, {}, {}, { url: string }>, res: Response) => {
  const { url } = req.query;
  try {
    if (!url) {
      return res.status(400).json({ error: 'Missing url' });
    }
    // Fetch the PDF as a stream
    const response = await readSermonBook(url);

    if ('error' in response) {
      // Handle the error case
      return res.status(500).json({ error: response.error });
    }

    // At this point, response is an AxiosResponse and has .data
    res.setHeader('Content-Type', 'application/pdf');
    // Tear down the upstream stream if the client disconnects mid-download,
    // otherwise the upstream socket stays open and leaks file descriptors.
    res.on('close', () => response.data.destroy());
    response.data.on('error', (err: unknown) => console.error('readSermonBook stream error:', err));
    response.data.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

// 2. API TO DOWNLOAD THE PDF
app.get('/api/v3/downloadSermonBook', async (req: Request<{}, {}, {}, { url: string }>, res: Response) => {
  const { url } = req.query;
  try {
    if (!url) {
      return res.status(400).json({ error: 'Missing url' });
    }
    // Fetch the PDF as a stream
    const response = await downloadSermonBook(url);

    if ('error' in response) {
      return res.status(500).json({ error: response.error });
    }

    // Extract filename from the URL or use a default
    const filename = url.split('/').pop() || 'sermon.pdf';

    // Set headers for download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.on('close', () => response.data.destroy());
    response.data.on('error', (err: unknown) => console.error('downloadSermonBook stream error:', err));
    response.data.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

// DOWNLOAD SERMON
// IT WILL DOWNLOAD THE MEDIA FILE:  https://d21kl6o5a7faj0.cloudfront.net/repo/78a/78a6f8f6964518ca87f96ca81df0f34260ba6b26671633e94a3ae9f4697d6f487c17586b79b4371d85f120f77df686b9564dbb2490088e05fd6e47fe44fdeb67.m4a
app.get('/api/v3/downloadSermon', async (req: Request<{}, {}, {}, { url: string }>, res: Response) => {
  const { url } = req.query;
  try {
    if (!url) {
      return res.status(400).json({ error: 'Missing url' });
    }
  
    // The downloadSermon utility now returns an object that includes the axios response itself
    const downloadResult = await downloadSermon(url);

    // Discriminated union: 'error' key present means the helper failed.
    if ('error' in downloadResult) {
      return res.status(500).json({ error: `Failed to initiate sermon download: ${downloadResult.error}` });
    }

    const { response: axiosResponse, filename, contentType } = downloadResult;


    if (!axiosResponse || !axiosResponse.data) {
      return res.status(500).json({ error: 'Failed to download sermon (empty response from utility)' });
    }

    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pass through Content-Length if available from the source
    const contentLength = axiosResponse.headers['content-length'];
    if (typeof contentLength === 'string') {
      res.setHeader('X-Content-Length', contentLength);
      // Also set the standard Content-Length if you are sure about the size
      // and that no other transformations will change it.
      // res.setHeader('Content-Length', contentLength);
    }

    // Tear down upstream stream on client disconnect to prevent FD leaks
    res.on('close', () => axiosResponse.data.destroy());
    axiosResponse.data.pipe(res);
  } catch (error) {
    // It's good practice to log the actual error on the server side
    console.error("Error in /api/v3/downloadSermon:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
});

// STREAM SERMON
app.get('/api/v3/streamSermon', async (req: Request<{}, {}, {}, { audioUrl: string }>, res: Response) => {
  const { audioUrl } = req.query;
  try {
    if (!audioUrl) {
      return res.status(400).json({ error: 'Missing audioUrl' });
    }
    // Pass the request and response objects to the utility function
    // It will handle fetching, headers, and streaming
    await streamSermon(audioUrl, req, res);

  } catch (error) {
    // Error handling might be complex here, as headers might already be sent.
    // Log the error on the server. The client might just see a broken stream.
    console.error('Error streaming sermon:', error instanceof Error ? error.message : error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream sermon' });
    } else {
      // If headers are sent, we can't send a JSON error, just end the stream abruptly.
      res.end();
    }
  }
});

// --------------- DAILY CONTENT ROUTES --------------- 

// GET DAILY QUOTE AND VERSE
app.get('/api/v4/daily-content', async (req: Request<{}, {}, {}, { language?: string }>, res: Response) => {
    try {
        const { language = 'en' } = req.query; // Default to English if no language specified
        const validLanguage = language === 'fr' ? 'fr' : 'en'; // Validate language parameter
        
        console.log(`Fetching daily content with language: ${validLanguage}`);
        const dailyContent = await fetchDailyQuoteAndVerseData(validLanguage);
        
        // If French content, remove duplication by omitting the Fr-specific fields
        if (validLanguage === 'fr') {
            if (dailyContent.dailyVerse) {
                delete dailyContent.dailyVerse.referenceFr;
                delete dailyContent.dailyVerse.textFr;
            }
            if (dailyContent.dailyQuote) {
                delete dailyContent.dailyQuote.audioM4aUrlFr;
                delete dailyContent.dailyQuote.audioMp3UrlFr;
                delete dailyContent.dailyQuote.sermonTitleFr;
                delete dailyContent.dailyQuote.quoteTextFr;
            }
        }
        
        res.json(dailyContent);
    } catch (error) {
        console.error('Error in /api/v4/daily-content:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error fetching daily content' });
    }
});

// GET DAILY QUOTE AND VERSE (COMBINED LANGUAGES)
// Parallelized + tolerant: if French fails, return English-only instead of 500.
app.get('/api/v4/daily-content-combined', async (req: Request, res: Response) => {
    try {
        const [enResult, frResult] = await Promise.allSettled([
            fetchDailyQuoteAndVerseData('en'),
            fetchDailyQuoteAndVerseData('fr'),
        ]);

        if (enResult.status === 'rejected') throw enResult.reason;
        const englishContent = enResult.value;
        const frenchContent = frResult.status === 'fulfilled' ? frResult.value : englishContent;
        if (frResult.status === 'rejected') {
            console.error('French daily content failed (using English fallback):', frResult.reason);
        }

        const combinedContent = {
            dailyVerse: {
                reference: englishContent.dailyVerse.reference,
                text: englishContent.dailyVerse.text,
                referenceFr: frenchContent.dailyVerse.referenceFr || frenchContent.dailyVerse.reference,
                textFr: frenchContent.dailyVerse.textFr || frenchContent.dailyVerse.text
            },
            dailyQuote: {
                audioM4aUrl: englishContent.dailyQuote.audioM4aUrl,
                audioMp3Url: englishContent.dailyQuote.audioMp3Url,
                sermonCode: englishContent.dailyQuote.sermonCode,
                sermonTitle: englishContent.dailyQuote.sermonTitle,
                quoteText: englishContent.dailyQuote.quoteText,
                audioM4aUrlFr: frenchContent.dailyQuote.audioM4aUrlFr || frenchContent.dailyQuote.audioM4aUrl,
                audioMp3UrlFr: frenchContent.dailyQuote.audioMp3UrlFr || frenchContent.dailyQuote.audioMp3Url,
                sermonTitleFr: frenchContent.dailyQuote.sermonTitleFr || frenchContent.dailyQuote.sermonTitle,
                quoteTextFr: frenchContent.dailyQuote.quoteTextFr || frenchContent.dailyQuote.quoteText
            },
            resources: [...englishContent.resources, ...frenchContent.resources]
        };
        
        res.json(combinedContent);
    } catch (error) {
        console.error('Error in /api/v4/daily-content-combined:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error fetching combined daily content' });
    }
});

// --------------- VERSE OF THE DAY ROUTES --------------- 

// GET VERSE OF THE DAY
app.get('/api/v4/verse-of-the-day', async (req: Request<{}, {}, {}, { language?: string }>, res: Response) => {
    try {
        const { language = 'en' } = req.query; // Default to English if no language specified
        const validLanguage = language === 'fr' ? 'fr' : 'en'; // Validate language parameter
        
        console.log(`Fetching verse of the day with language: ${validLanguage}`);
        const verseOfTheDay = await fetchVerseOfTheDay(validLanguage);
        
        // If French content, remove duplication by omitting the Fr-specific fields
        if (validLanguage === 'fr') {
            delete verseOfTheDay.referenceFr;
            delete verseOfTheDay.textFr;
            delete verseOfTheDay.imageUrlsFr;
        }
        
        res.json(verseOfTheDay);
    } catch (error) {
        console.error('Error in /api/v4/verse-of-the-day:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error fetching verse of the day' });
    }
});

// GET VERSE OF THE DAY (COMBINED LANGUAGES)
app.get('/api/v4/verse-of-the-day-combined', async (req: Request, res: Response) => {
    try {
        console.log('Fetching combined verse of the day');
        const combinedVerseOfTheDay = await fetchCombinedVerseOfTheDay();
        res.json(combinedVerseOfTheDay);
    } catch (error) {
        console.error('Error in /api/v4/verse-of-the-day-combined:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error fetching combined verse of the day' });
    }
});

// --------------- ANNOTATION API ROUTES --------------- 

// --- Highlights ---
app.post('/api/v4/annotations/highlights', async (req: Request, res: Response) => {
    try {
        const { userId, versionId, bookUsfm, chapter, verses, color } = req.body;
        if (!userId || !versionId || !bookUsfm || chapter === undefined || !verses || !color) {
            return res.status(400).json({ error: 'Missing required fields for highlight.' });
        }
        const newHighlight = await createHighlight({ userId, versionId, bookUsfm, chapter, verses, color });
        res.status(201).json(newHighlight);
    } catch (error) {
        console.error('Error creating highlight:', error);
        res.status(500).json({ error: 'Failed to create highlight.' });
    }
});

app.get('/api/v4/annotations/highlights', async (req: Request, res: Response) => {
    try {
        const { userId, versionId, bookUsfm, chapter, verses } = req.query;
        const chapterNum = chapter ? parseInt(chapter as string) : undefined;
        const highlights = await getHighlights({
            userId: userId as string | undefined,
            versionId: versionId as string | undefined,
            bookUsfm: bookUsfm as string | undefined,
            chapter: chapterNum,
            verses: verses as string | undefined
        });
        res.json(highlights);
    } catch (error) {
        console.error('Error fetching highlights:', error);
        res.status(500).json({ error: 'Failed to retrieve highlights.' });
    }
});

app.get('/api/v4/annotations/highlights/:highlightId', async (req: Request, res: Response) => {
    try {
        const highlight = await getHighlightById(req.params.highlightId);
        if (highlight) {
            res.json(highlight);
        } else {
            res.status(404).json({ error: 'Highlight not found.' });
        }
    } catch (error) {
        console.error('Error fetching highlight:', error);
        res.status(500).json({ error: 'Failed to retrieve highlight.' });
    }
});

app.put('/api/v4/annotations/highlights/:highlightId', async (req: Request, res: Response) => {
    try {
        const updatedHighlight = await updateHighlight(req.params.highlightId, req.body);
        if (updatedHighlight) {
            res.json(updatedHighlight);
        } else {
            res.status(404).json({ error: 'Highlight not found.' });
        }
    } catch (error) {
        console.error('Error updating highlight:', error);
        res.status(500).json({ error: 'Failed to update highlight.' });
    }
});

app.delete('/api/v4/annotations/highlights/:highlightId', async (req: Request, res: Response) => {
    try {
        const success = await deleteHighlight(req.params.highlightId);
        if (success) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Highlight not found.' });
        }
    } catch (error) {
        console.error('Error deleting highlight:', error);
        res.status(500).json({ error: 'Failed to delete highlight.' });
    }
});

// --- Notes ---
app.post('/api/v4/annotations/notes', async (req: Request, res: Response) => {
    try {
        const { userId, versionId, bookUsfm, chapter, verses, text } = req.body;
        if (!userId || !versionId || !bookUsfm || chapter === undefined || !verses || !text) {
            return res.status(400).json({ error: 'Missing required fields for note.' });
        }
        const newNote = await createNote({ userId, versionId, bookUsfm, chapter, verses, text });
        res.status(201).json(newNote);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note.' });
    }
});

app.get('/api/v4/annotations/notes', async (req: Request, res: Response) => {
    try {
        const { userId, versionId, bookUsfm, chapter, verses } = req.query;
        const chapterNum = chapter ? parseInt(chapter as string) : undefined;
        const notes = await getNotes({
            userId: userId as string | undefined,
            versionId: versionId as string | undefined,
            bookUsfm: bookUsfm as string | undefined,
            chapter: chapterNum,
            verses: verses as string | undefined
        });
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to retrieve notes.' });
    }
});

app.get('/api/v4/annotations/notes/:noteId', async (req: Request, res: Response) => {
    try {
        const note = await getNoteById(req.params.noteId);
        if (note) {
            res.json(note);
        } else {
            res.status(404).json({ error: 'Note not found.' });
        }
    } catch (error) {
        console.error('Error fetching note:', error);
        res.status(500).json({ error: 'Failed to retrieve note.' });
    }
});

app.put('/api/v4/annotations/notes/:noteId', async (req: Request, res: Response) => {
    try {
        const updatedNote = await updateNote(req.params.noteId, req.body);
        if (updatedNote) {
            res.json(updatedNote);
        } else {
            res.status(404).json({ error: 'Note not found.' });
        }
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Failed to update note.' });
    }
});

app.delete('/api/v4/annotations/notes/:noteId', async (req: Request, res: Response) => {
    try {
        const success = await deleteNote(req.params.noteId);
        if (success) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Note not found.' });
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note.' });
    }
});


// ---------------  BIBLE API ROUTES --------------- 

// GET BIBLE LANGUAGES
app.get('/api/v4/bible/languages', async (req: Request, res: Response) => {
  try {
    const searchQuery = req.query.search as string | undefined;
    const languages = await fetchBibleLanguages(searchQuery);
    res.json(languages);
  } catch (error) {
    console.error('Error in /api/v4/bible/languages:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
});

// GET BIBLE VERSIONS FOR A LANGUAGE
app.get('/api/v4/bible/versions', async (req: Request, res: Response) => {
  const languageCode = req.query.lang as string;
  const searchQuery = req.query.search as string | undefined;
  console.log(`Received request for /api/v4/bible/versions?lang=${languageCode}`);

  if (!languageCode) {
    return res.status(400).json({ error: 'Missing required query parameter: lang' });
  }

  try {
    const versions = await fetchBibleVersions(languageCode, searchQuery);
    res.json(versions);
  } catch (error) {
    console.error(`Error in /api/v4/bible/versions route for lang=${languageCode}:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
});

// GET BIBLE BOOKS & CHAPTERS FOR A VERSION
app.get('/api/v4/bible/books', async (req: Request, res: Response) => {
  const versionId = req.query.versionId as string;
  const searchQuery = req.query.search as string | undefined;
  console.log(`Received request for /api/v4/bible/books?versionId=${versionId}`);

  if (!versionId) {
    return res.status(400).json({ error: 'Missing required query parameter: versionId' });
  }

  try {
    const books = await fetchBibleBooks(versionId, searchQuery);
    res.json(books);
  } catch (error) {
    console.error(`Error in /api/v4/bible/books route for versionId=${versionId}:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
});

// GET AND PROCESS BIBLE CHAPTER CONTENT
app.get('/api/v4/bible/chapter', async (req: Request, res: Response) => {
  const { versionId, chapterUsfm } = req.query;
  console.log(`Received request for /api/v4/bible/chapter?versionId=${versionId}&chapterUsfm=${chapterUsfm}`);

  if (!versionId || !chapterUsfm) {
    return res.status(400).json({ error: 'Missing required query parameters: versionId and chapterUsfm' });
  }

  try {
    const chapterContent = await fetchAndProcessChapter(versionId as string, chapterUsfm as string);
    //console.log('Chapter content jsonResponse.props:', JSON.stringify(chapterContent.jsonResponse?.props, null, 2));
    res.json(chapterContent);
  } catch (error) {
    console.error(`Error in /api/v4/bible/chapter route for versionId=${versionId}, chapterUsfm=${chapterUsfm}:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
});

// =============== RANDOM VERSE ROUTES ===============

// GET A RANDOM BIBLE VERSE
app.get('/api/v4/bible/random-verse', async (req: Request<{}, {}, {}, { versionId?: string; fetchText?: string }>, res: Response) => {
    try {
        const versionId = parseInt(req.query.versionId as string, 10) || 1; // Default to KJV (1)
        const fetchText = req.query.fetchText !== 'false'; // Default to true
        
        console.log(`Fetching random verse with versionId: ${versionId}, fetchText: ${fetchText}`);
        const randomVerse = await getRandomVerse(versionId, fetchText);
        
        res.json(randomVerse);
    } catch (error) {
        console.error('Error in /api/v4/bible/random-verse:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error fetching random verse' });
    }
});

// GET MULTIPLE RANDOM BIBLE VERSES
app.get('/api/v4/bible/random-verses', async (req: Request<{}, {}, {}, { count?: string; versionId?: string; fetchText?: string }>, res: Response) => {
    try {
        const count = Math.min(parseInt(req.query.count as string, 10) || 5, 20); // Default 5, max 20
        const versionId = parseInt(req.query.versionId as string, 10) || 1;
        const fetchText = req.query.fetchText !== 'false';
        
        console.log(`Fetching ${count} random verses with versionId: ${versionId}, fetchText: ${fetchText}`);
        const randomVerses = await getMultipleRandomVerses(count, versionId, fetchText);
        
        res.json({ count: randomVerses.length, verses: randomVerses });
    } catch (error) {
        console.error('Error in /api/v4/bible/random-verses:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error fetching random verses' });
    }
});

// GET LIST OF AVAILABLE VERSE REFERENCES (no text, just references)
app.get('/api/v4/bible/verse-references', (req: Request, res: Response) => {
    try {
        const references = getAvailableVerseReferences();
        res.json({ 
            count: getAvailableVersesCount(), 
            references 
        });
    } catch (error) {
        console.error('Error in /api/v4/bible/verse-references:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
    }
});

// =============== RESOURCES ROUTES ===============

// Create a new resource
app.post('/api/v4/resources', async (req: Request, res: Response) => {
  try {
    const { resourceType, resourceName, category } = req.body;
    
    if (!resourceType || !resourceName) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'resourceType and resourceName are required' } });
    }

    const result = await createResource(req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Internal Server Error' } });
  }
});

// Get all resources with optional filtering, pagination, and sorting
app.get('/api/v4/resources', async (req: Request, res: Response) => {
  try {
    const { resourceType, category, search, page, limit, sort, order } = req.query;
    
    const filter = {
      resourceType: resourceType as string | undefined,
      category: category as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sort: sort as string | undefined,
      order: order as 'asc' | 'desc' | undefined
    };

    const result = await getAllResources(filter);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Internal Server Error' } });
  }
});

// Get a single resource by ID
app.get('/api/v4/resources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await getResourceById(id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
    }
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Internal Server Error' } });
  }
});

// Update a resource
app.put('/api/v4/resources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await updateResource(id, req.body);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
    }
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Internal Server Error' } });
  }
});

// Delete a resource
app.delete('/api/v4/resources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await deleteResource(id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
    }
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Internal Server Error' } });
  }
});

// Delete all resources (use with caution)
app.delete('/api/v4/resources', async (req: Request, res: Response) => {
  try {
    const result = await deleteAllResources();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error deleting all resources:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Internal Server Error' } });
  }
});

// =============== NESTED COLLECTION ROUTES (Jesus Resource) ===============

// Get all sections from a Jesus resource
app.get('/api/v4/resources/:id/sections', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await getSections(id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
    }
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Internal Server Error' } });
  }
});

// Add a section to a Jesus resource
app.post('/api/v4/resources/:id/sections', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await addSection(id, req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(result.error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
    }
  } catch (error) {
    console.error('Error adding section:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Internal Server Error' } });
  }
});

// Update a section in a Jesus resource
app.put('/api/v4/resources/:id/sections/:sectionName', async (req: Request, res: Response) => {
  try {
    const { id, sectionName } = req.params;
    const result = await updateSection(id, decodeURIComponent(sectionName), req.body);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.code === 'SECTION_NOT_FOUND' ? 404 : 400).json(result);
    }
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Internal Server Error' } });
  }
});

// Delete a section from a Jesus resource
app.delete('/api/v4/resources/:id/sections/:sectionName', async (req: Request, res: Response) => {
  try {
    const { id, sectionName } = req.params;
    const result = await deleteSection(id, decodeURIComponent(sectionName));
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
    }
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Internal Server Error' } });
  }
});

// Get all journey templates from a Jesus resource
app.get('/api/v4/resources/:id/journeys', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await getJourneyTemplates(id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
    }
  } catch (error) {
    console.error('Error fetching journey templates:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Internal Server Error' } });
  }
});

// Get all collections from a Jesus resource
app.get('/api/v4/resources/:id/collections', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await getCollections(id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
    }
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Internal Server Error' } });
  }
});

// Get a specific collection by ID from a Jesus resource
app.get('/api/v4/resources/:id/collections/:collectionId', async (req: Request, res: Response) => {
  try {
    const { id, collectionId } = req.params;
    const result = await getCollectionById(id, collectionId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.code === 'COLLECTION_NOT_FOUND' ? 404 : 400).json(result);
    }
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Internal Server Error' } });
  }
});

// ─── Startup & graceful shutdown ──────────────────────────────────

// Catch any otherwise-unhandled async errors so the process logs them
// instead of crashing silently.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

connectToDatabase()
  .then(async () => {
    await Promise.all([
      initializeResourceIndexes(),
      initializeAnnotationIndexes(),
      initializeCacheIndexes(),
    ]);
    console.log('✅ Database indexes initialized');

    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server listening on http://0.0.0.0:${port}`);
      console.log(`[DEBUG] port variable = ${port}`);
      console.log(`[DEBUG] process.env.PORT = ${process.env.PORT}`);

      // Pre-warm Chrome in the background AFTER the port is open. This must
      // not block listen() — otherwise Railway's health check hits a dead
      // port and restart-loops. Bible chapter/verse requests await this
      // install (see getBrowser); everything else serves immediately.
      ensureChromeInstalled().catch(() => {
        // Already logged inside; a later request will retry the install.
      });
    });

    // Graceful shutdown: stop accepting new connections, finish in-flight
    // requests, then close the DB. Hard-kill after 30s to avoid hanging
    // deployments.
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received — shutting down gracefully...`);

      const forceExit = setTimeout(() => {
        console.error('Forced exit after 30s timeout');
        process.exit(1);
      }, 30_000);
      forceExit.unref();

      server.close(async (err) => {
        if (err) {
          console.error('Error closing HTTP server:', err);
        }
        try {
          await closeDatabaseConnection();
        } catch (closeErr) {
          console.error('Error closing DB connection:', closeErr);
        }
        try {
          await closeBrowser();
        } catch (closeErr) {
          console.error('Error closing Puppeteer browser:', closeErr);
        }
        clearTimeout(forceExit);
        console.log('Shutdown complete.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

// PREV AND NEXT
// ROUTES FOR SEARCH