import express, { Request, Response } from 'express';
import { AnyNode } from 'domhandler';
import { fetchLanguages } from './utils/fetchLanguages';
import { processMessageHtml } from './utils/formatter/processHTML';
import { getSermonsByYear } from './utils/getSermonsByYear';
import { client } from './utils/cookie jar/enableCookie';
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
import { connectToDatabase } from './utils/database/connection';
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
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Serve static files for bible.html and its assets from src/utils/bible at the root URL path `/`
app.use(express.static(path.join(__dirname, 'utils/bible')));

// Serve static files for fonts from 'test 2/fonts/' accessible via '/static_fonts/' URL path
app.use('/static_fonts', express.static(path.join(__dirname, '../fonts')));

// Serve admin dashboard
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// scrapper


// GET SERVER STATUS
app.get('/', (req, res) => {
  res.send('Server is up and running!');
});


// ---------------  SERMON API --------------

// GET LANGUAGES
app.get('/api/v3/languages', async (req, res) => {
  try {
    const result = await fetchLanguages();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

// CHANGE LANGUAGE
app.get('/api/v3/changeLanguage', async (req: Request<{}, {}, {}, { languageCode: string }>, res: Response) => {
  const { languageCode } = req.query;
  try {
    if (!languageCode) {
      return res.status(400).json({ error: 'Missing language code' });
    }
    await changeLanguage(languageCode);
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

    // 1. Set language
    await changeLanguage(languageCode);

    // 2. Now call the search endpoint
    const response = await client.post(
      'https://branham.org/branham/messageaudio.aspx/wmSearch',
      { formVars: [{ name: 'searchcriteria', value: '' }] },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
        }
      }
    );

    // Process each HTML entry into individual messages
    const cleanedData = response.data.d
      .filter((item: string) => typeof item === 'string' && item.includes('<div'))
      .flatMap((html: AnyNode) => processMessageHtml(html));

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

    // 1. Set language
    await changeLanguage(languageCode);

    const fullResult = await getSermonsByYear(yearCode);
    
    let paginatedResult = fullResult;
    if (fullResult && typeof fullResult === 'object' && fullResult !== null && 'd' in fullResult && Array.isArray((fullResult as any).d)) {
      const itemsToPaginate: any[] = (fullResult as any).d;
      const paginatedItems = paginateArray(itemsToPaginate, page, limit);
      paginatedResult = { ...(fullResult as object), d: paginatedItems };
    } else if (Array.isArray(fullResult)) {
      // This case might occur if the result is a simple array, though typically it's { d: [...] }
      paginatedResult = { d: paginateArray(fullResult, page, limit) };
    }

    res.json(paginatedResult);
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

    // 1. Set language
    await changeLanguage(languageCode);

    const fullResult = await getSermonsByLength(lengthCode);

    let paginatedResult = fullResult;
    if (fullResult && typeof fullResult === 'object' && fullResult !== null && 'd' in fullResult && Array.isArray((fullResult as any).d)) {
      const itemsToPaginate: any[] = (fullResult as any).d;
      const paginatedItems = paginateArray(itemsToPaginate, page, limit);
      paginatedResult = { ...(fullResult as object), d: paginatedItems };
    } else if (Array.isArray(fullResult)) {
      paginatedResult = { d: paginateArray(fullResult, page, limit) };
    }

    res.json(paginatedResult);
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

    // 1. Set language
    await changeLanguage(languageCode);

    const fullResult = await getSermonsBySeries(seriesCode);

    let paginatedResult = fullResult;
    if (fullResult && typeof fullResult === 'object' && fullResult !== null && 'd' in fullResult && Array.isArray((fullResult as any).d)) {
      const itemsToPaginate: any[] = (fullResult as any).d;
      const paginatedItems = paginateArray(itemsToPaginate, page, limit);
      paginatedResult = { ...(fullResult as object), d: paginatedItems };
    } else if (Array.isArray(fullResult)) {
      paginatedResult = { d: paginateArray(fullResult, page, limit) };
    }

    res.json(paginatedResult);
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

    // 1. Set language
    await changeLanguage(languageCode);

    const fullResult = await searchSermons(key);

    let paginatedResult = fullResult;
    if (fullResult && typeof fullResult === 'object' && fullResult !== null && 'd' in fullResult && Array.isArray((fullResult as any).d)) {
      const itemsToPaginate: any[] = (fullResult as any).d;
      const paginatedItems = paginateArray(itemsToPaginate, page, limit);
      paginatedResult = { ...(fullResult as object), d: paginatedItems };
    } else if (Array.isArray(fullResult)) {
      paginatedResult = { d: paginateArray(fullResult, page, limit) };
    }

    res.json(paginatedResult);
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

    // Pipe the PDF stream directly to the response
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

    // Check for error from downloadSermon
    if (downloadResult.error) {
      // Use a more specific error code if possible, e.g., 502 Bad Gateway if the external download failed
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
    if (contentLength) {
      res.setHeader('X-Content-Length', contentLength);
      // Also set the standard Content-Length if you are sure about the size
      // and that no other transformations will change it.
      // res.setHeader('Content-Length', contentLength);
    }

    // Pipe the file stream directly to the response
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
app.get('/api/v4/daily-content-combined', async (req: Request, res: Response) => {
    try {
        // Fetch both English and French content
        const englishContent = await fetchDailyQuoteAndVerseData('en');
        const frenchContent = await fetchDailyQuoteAndVerseData('fr');
        
        // Combine the content
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
app.post('/api/v4/annotations/highlights', (req: Request, res: Response) => {
    try {
        // Basic validation (more robust validation should be added)
        const { userId, versionId, bookUsfm, chapter, verses, color } = req.body;
        if (!userId || !versionId || !bookUsfm || chapter === undefined || !verses || !color) {
            return res.status(400).json({ error: 'Missing required fields for highlight.' });
        }
        const newHighlight = createHighlight({ userId, versionId, bookUsfm, chapter, verses, color });
        res.status(201).json(newHighlight);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create highlight.' });
    }
});

app.get('/api/v4/annotations/highlights', (req: Request, res: Response) => {
    try {
        const { userId, versionId, bookUsfm, chapter, verses } = req.query;
        const chapterNum = chapter ? parseInt(chapter as string) : undefined;
        const highlights = getHighlights({
            userId: userId as string | undefined,
            versionId: versionId as string | undefined,
            bookUsfm: bookUsfm as string | undefined,
            chapter: chapterNum,
            verses: verses as string | undefined
        });
        res.json(highlights);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve highlights.' });
    }
});

app.get('/api/v4/annotations/highlights/:highlightId', (req: Request, res: Response) => {
    try {
        const highlight = getHighlightById(req.params.highlightId);
        if (highlight) {
            res.json(highlight);
        } else {
            res.status(404).json({ error: 'Highlight not found.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve highlight.' });
    }
});

app.put('/api/v4/annotations/highlights/:highlightId', (req: Request, res: Response) => {
    try {
        const updatedHighlight = updateHighlight(req.params.highlightId, req.body);
        if (updatedHighlight) {
            res.json(updatedHighlight);
        } else {
            res.status(404).json({ error: 'Highlight not found.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update highlight.' });
    }
});

app.delete('/api/v4/annotations/highlights/:highlightId', (req: Request, res: Response) => {
    try {
        const success = deleteHighlight(req.params.highlightId);
        if (success) {
            res.status(204).send(); // No content
        } else {
            res.status(404).json({ error: 'Highlight not found.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete highlight.' });
    }
});

// --- Notes ---
app.post('/api/v4/annotations/notes', (req: Request, res: Response) => {
    try {
        const { userId, versionId, bookUsfm, chapter, verses, text } = req.body;
        if (!userId || !versionId || !bookUsfm || chapter === undefined || !verses || !text) {
            return res.status(400).json({ error: 'Missing required fields for note.' });
        }
        const newNote = createNote({ userId, versionId, bookUsfm, chapter, verses, text });
        res.status(201).json(newNote);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create note.' });
    }
});

app.get('/api/v4/annotations/notes', (req: Request, res: Response) => {
    try {
        const { userId, versionId, bookUsfm, chapter, verses } = req.query;
        const chapterNum = chapter ? parseInt(chapter as string) : undefined;
        const notes = getNotes({
            userId: userId as string | undefined,
            versionId: versionId as string | undefined,
            bookUsfm: bookUsfm as string | undefined,
            chapter: chapterNum,
            verses: verses as string | undefined
        });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve notes.' });
    }
});

app.get('/api/v4/annotations/notes/:noteId', (req: Request, res: Response) => {
    try {
        const note = getNoteById(req.params.noteId);
        if (note) {
            res.json(note);
        } else {
            res.status(404).json({ error: 'Note not found.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve note.' });
    }
});

app.put('/api/v4/annotations/notes/:noteId', (req: Request, res: Response) => {
    try {
        const updatedNote = updateNote(req.params.noteId, req.body);
        if (updatedNote) {
            res.json(updatedNote);
        } else {
            res.status(404).json({ error: 'Note not found.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update note.' });
    }
});

app.delete('/api/v4/annotations/notes/:noteId', (req: Request, res: Response) => {
    try {
        const success = deleteNote(req.params.noteId);
        if (success) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Note not found.' });
        }
    } catch (error) {
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

// ---------------  NOTE  --------------

// Initialize database and start server
connectToDatabase()
  .then(async () => {
    // Initialize resource indexes
    await initializeResourceIndexes();
    console.log('✅ Resource indexes initialized');
    
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

// PREV AND NEXT
// ROUTES FOR SEARCH