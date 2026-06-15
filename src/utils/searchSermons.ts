import { AxiosInstance } from 'axios';
import { AnyNode } from 'domhandler';
import { processMessageHtml } from './formatter/processHTML';
import { client as sharedClient } from './cookie jar/enableCookie';

export async function searchSermons(
    key: string,
    scrapeClient: AxiosInstance = sharedClient
) {
    try {
        const url = 'https://branham.org/branham/messageaudio.aspx/wmSearch';
        const payload = { formVars: [{ name: "searchcriteria", value: key }] };

        const response = await scrapeClient.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const cleanedData = response.data.d
            .filter((item: string) => typeof item === 'string' && item.includes('<div'))
            .flatMap((html: AnyNode) => processMessageHtml(html));

        return { d: cleanedData };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('searchSermons failed:', { key, message });
        throw new Error(`Failed to search sermons for "${key}": ${message}`);
    }
}
