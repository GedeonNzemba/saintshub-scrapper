import axios from 'axios';
import { Request, Response } from 'express';

/**
 * Stream sermon audio with HTTP Range support so clients can seek.
 *
 * Hardening over the original:
 *   - HEAD request has a 10s timeout (was: none)
 *   - GET range request has a 30s connect timeout (was: none)
 *   - Upstream stream is destroyed if the client disconnects mid-stream
 *   - Stream errors are surfaced via console instead of crashing the process
 */
export async function streamSermon(audioUrl: string, req: Request, res: Response) {
  try {
    // 1. Get audio file size + range support
    const headResponse = await axios.head(audioUrl, { timeout: 10_000 });
    const rawContentLength = headResponse.headers['content-length'];
    const fileSize = parseInt(
      typeof rawContentLength === 'string' ? rawContentLength : '0',
      10
    );
    const rawContentType = headResponse.headers['content-type'];
    const contentType = typeof rawContentType === 'string' ? rawContentType : 'audio/mpeg';

    // 2. Parse Range header
    const rangeHeader = req.headers.range;
    let start = 0;
    let end = fileSize - 1;
    let statusCode = 200;
    let chunksize = fileSize;

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).send('Requested range not satisfiable');
        return;
      }

      statusCode = 206;
      chunksize = (end - start) + 1;
    }

    // 3. Response headers
    res.writeHead(statusCode, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });

    // 4. Ranged GET + pipe
    const audioResponse = await axios.get(audioUrl, {
      responseType: 'stream',
      timeout: 30_000,
      headers: { 'Range': `bytes=${start}-${end}` },
    });

    // Cleanup: kill upstream if client disconnects (prevents FD leaks)
    res.on('close', () => audioResponse.data.destroy());
    audioResponse.data.on('error', (err: unknown) => {
      console.error('streamSermon upstream stream error:', err);
    });

    audioResponse.data.pipe(res);
  } catch (error) {
    console.error(`Error fetching/streaming audio from ${audioUrl}:`, error);
    throw error;
  }
}
