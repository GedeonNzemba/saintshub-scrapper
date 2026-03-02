import axios from 'axios';
import { readSermonBook } from './readSermonBook';

export async function downloadSermonBook(url: string) {
  try {
    // Fetch the PDF as a stream
    const response = await readSermonBook(url);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Unknown error downloading PDF.' };
  }
}