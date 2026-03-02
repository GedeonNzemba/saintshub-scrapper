import { AnyNode } from 'domhandler';
import { processMessageHtml } from './formatter/processHTML';
import { client } from './cookie jar/enableCookie';

// YEAR LIST  1947 until 1965
const years = [
    {year: 1947, code: "47-"},
    {year: 1948, code: "48-"},
    {year: 1949, code: "49-"},
    {year: 1950, code: "50-"},
    {year: 1951, code: "51-"},
    {year: 1952, code: "52-"},
    {year: 1953, code: "53-"},
    {year: 1954, code: "54-"},
    {year: 1955, code: "55-"},
    {year: 1956, code: "56-"},
    {year: 1957, code: "57-"},
    {year: 1958, code: "58-"},
    {year: 1959, code: "59-"},
    {year: 1960, code: "60-"},
    {year: 1961, code: "61-"},
    {year: 1962, code: "62-"},
    {year: 1963, code: "63-"},
    {year: 1964, code: "64-"},
    {year: 1965, code: "65-"}
]

export async function getSermonsByYear(yearCode: string) {
    try {
        const url = 'https://branham.org/branham/messageaudio.aspx/wmSearchByYear';
        const payload = { formVars: [{ name: "year", value: yearCode }] };

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