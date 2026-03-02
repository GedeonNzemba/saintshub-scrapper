import { AnyNode } from 'domhandler';
import { processMessageHtml } from './formatter/processHTML';
import { client } from './cookie jar/enableCookie';

// YEAR LIST  1947 until 1965
const lenght = [
    {lenght: '0 - 30', code: "30"},
    {lenght: '31 - 60', code: "60"},
    {lenght: '61 - 90', code: "90"},
    {lenght: '91 - 120', code: "120"},
    {lenght: '121 - 150', code: "150 +"}
]

// Type Lenght must be one of the following: '30', '60', '90', '120', '150'
export type Lenght = '30' | '60' | '90' | '120' | '150';

export async function getSermonsByLength(lengthCode: Lenght) {
    try {
        const url = 'https://branham.org/branham/messageaudio.aspx/wmSearchByMinutes';
        const payload = { formVars: [{ name: "minutes", value: lengthCode }] };

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