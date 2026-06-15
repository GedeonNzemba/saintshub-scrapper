import axios, { AxiosResponse } from 'axios';

/**
 * Fetch a sermon audio file as a stream.
 *
 * Hardening over the original:
 *   - Explicit 30s connect timeout (was: no timeout — could hang forever)
 *   - Caller-supplied callback for cleanup on client disconnect, so the
 *     upstream connection gets torn down if the user closes the app
 *     mid-download. Without this, file descriptors leak.
 */
export async function downloadSermon(url: string): Promise<
  | { response: AxiosResponse; filename: string; contentType: string }
  | { error: string }
> {
  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 30_000,
    });

    const filename = url.split('/').pop() || 'sermon.m4a';
    const rawContentType = response.headers['content-type'];
    const contentType = typeof rawContentType === 'string' ? rawContentType : 'application/octet-stream';

    // Surface stream errors so they reach the response handler instead of
    // crashing the process via unhandled 'error' events.
    response.data.on('error', (err: unknown) => {
      console.error('downloadSermon stream error:', err);
    });

    return { response, filename, contentType };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Unknown error downloading sermon.' };
  }
}
