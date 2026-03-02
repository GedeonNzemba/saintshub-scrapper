import axios from 'axios';

export async function readSermonBook(url: string) {
  try {
    // Fetch the PDF as a stream
    const response = await axios.get(url, { responseType: 'stream' });
    return response;
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Unknown error reading PDF.' };
  }
}