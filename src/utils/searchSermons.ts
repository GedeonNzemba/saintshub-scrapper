import { AnyNode } from 'domhandler';
import { processMessageHtml } from './formatter/processHTML';
import { client } from './cookie jar/enableCookie';


export async function searchSermons(key: string) {
    try {
        const url = 'https://branham.org/branham/messageaudio.aspx/wmSearch';
        const payload = { formVars: [{ name: "searchcriteria", value: key }] };

        const response = await client.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
            }
        });

        // Process each HTML entry into individual messages
        const cleanedData = response.data.d
            .filter((item: string) => typeof item === 'string' && item.includes('<div'))
            .flatMap((html: AnyNode) => processMessageHtml(html)); // Use flatMap to flatten nested arrays

        return { d: cleanedData };
    } catch (error) {
        console.error({ error: error instanceof Error ? error.message : error });
    }
}