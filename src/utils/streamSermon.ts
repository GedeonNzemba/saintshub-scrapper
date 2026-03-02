import axios from 'axios';
import { Request, Response } from 'express';

export async function streamSermon(audioUrl: string, req: Request, res: Response) {
  try {
    // 1. Get Audio File Size and Check Range Support (using HEAD request)
    const headResponse = await axios.head(audioUrl);
    const fileSize = parseInt(headResponse.headers['content-length'] || '0', 10);
    const contentType = headResponse.headers['content-type'] || 'audio/mpeg'; // Default or get from HEAD

    // 2. Parse Range Header from Request
    const rangeHeader = req.headers.range;
    let start = 0;
    let end = fileSize - 1;
    let statusCode = 200; // OK
    let chunksize = fileSize;

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Check for valid range
      if (start >= fileSize || end >= fileSize) {
        res.status(416).send('Requested range not satisfiable'); // Range Not Satisfiable
        return;
      }

      statusCode = 206; // Partial Content
      chunksize = (end - start) + 1;
    }

    // 3. Set Response Headers
    res.writeHead(statusCode, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      // Add other headers like Cache-Control if needed
      'Cache-Control': 'no-cache', // Example: prevent caching if desired
    });

    // 4. Make Ranged GET Request and Pipe Stream
    const audioResponse = await axios.get(audioUrl, {
      responseType: 'stream',
      headers: {
        'Range': `bytes=${start}-${end}`
      }
    });

    audioResponse.data.pipe(res);

  } catch (error) {
    console.error(`Error fetching/streaming audio from ${audioUrl}:`, error);
    // Rethrow the error to be caught by the main endpoint handler
    throw error;
  }
}