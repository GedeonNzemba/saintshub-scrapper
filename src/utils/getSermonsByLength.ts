import { AxiosInstance } from 'axios';
import { AnyNode } from 'domhandler';
import { processMessageHtml } from './formatter/processHTML';
import { client as sharedClient } from './cookie jar/enableCookie';

const lenght = [
    {lenght: '0 - 30', code: "30"},
    {lenght: '31 - 60', code: "60"},
    {lenght: '61 - 90', code: "90"},
    {lenght: '91 - 120', code: "120"},
    {lenght: '121 - 150', code: "150 +"}
]

// Type Lenght must be one of the following: '30', '60', '90', '120', '150'
export type Lenght = '30' | '60' | '90' | '120' | '150';

export async function getSermonsByLength(
    lengthCode: Lenght,
    scrapeClient: AxiosInstance = sharedClient
) {
    try {
        const url = 'https://branham.org/branham/messageaudio.aspx/wmSearchByMinutes';
        const payload = { formVars: [{ name: "minutes", value: lengthCode }] };

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
        console.error('getSermonsByLength failed:', { lengthCode, message });
        throw new Error(`Failed to fetch sermons for length "${lengthCode}": ${message}`);
    }
}
