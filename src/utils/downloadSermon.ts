import axios from 'axios';
import { readSermonBook } from './readSermonBook';

export async function downloadSermon(url: string) {
  try {
      // Fetch the file as a stream
      const response = await axios.get(url, { responseType: 'stream' });

      // Extract filename from the URL or use a default
      const filename = url.split('/').pop() || 'sermon.m4a';
  
      // Attempt to extract the content type from the response headers, fallback to octet-stream
      const contentType = response.headers['content-type'] || 'application/octet-stream';
  
    return { response, filename, contentType };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Unknown error downloading sermon.' };
  }
}