import { AnyNode } from 'domhandler';
import { processMessageHtml } from './formatter/processHTML';
import { client } from './cookie jar/enableCookie';

// YEAR LIST 
const series = [
    {title: 'My Life Story', value: 'mylifestory'},
    {title: 'How The Angel Came To Me', value: 'angel'},
    {title: 'The Revelation Of The Seven Seals', value: 'seals'},
    {title: 'The Revelation Of Jesus Christ', value: 'revelation'},
    {title: 'Conduct, Order, And Doctrine Of The Church', value: 'cod'},
    {title: 'The Book Of Hebrews', value: 'hebrews'},
    {title: 'The Holy Ghost', value: 'holy'},
    {title: 'Adoption', value: 'adoption'},
    {title: 'The Seventy Weeks Of Daniel', value: 'seventy'},
    {title: 'The Church', value: 'church'},
    {title: 'Demonology', value: 'demonology'},
    {title: 'Israel And The Church', value: 'israel'},
    {title: 'The Church Age book (audio)', value: 'cab'}
]

// Type Series must be one of the following: 'mylifestory', 'angel', 'seals', 'revelation', 'cod', 'hebrews', 'holy', 'adoption', 'seventy', 'church', 'demonology', 'israel', 'cab'
export type Series = 'mylifestory' | 'angel' | 'seals' | 'revelation' | 'cod' | 'hebrews' | 'holy' | 'adoption' | 'seventy' | 'church' | 'demonology' | 'israel' | 'cab';

export async function getSermonsBySeries(seriesCode: Series) {
    try {
        const url = 'https://branham.org/branham/messageaudio.aspx/wmSearchBySeries';
        const payload = { formVars: [{ name: "series", value: seriesCode }] };

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