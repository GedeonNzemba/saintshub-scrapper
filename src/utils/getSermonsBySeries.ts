import { AxiosInstance } from 'axios';
import { AnyNode } from 'domhandler';
import { processMessageHtml } from './formatter/processHTML';
import { client as sharedClient } from './cookie jar/enableCookie';

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

export type Series = 'mylifestory' | 'angel' | 'seals' | 'revelation' | 'cod' | 'hebrews' | 'holy' | 'adoption' | 'seventy' | 'church' | 'demonology' | 'israel' | 'cab';

export async function getSermonsBySeries(
    seriesCode: Series,
    scrapeClient: AxiosInstance = sharedClient
) {
    try {
        const url = 'https://branham.org/branham/messageaudio.aspx/wmSearchBySeries';
        const payload = { formVars: [{ name: "series", value: seriesCode }] };

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
        console.error('getSermonsBySeries failed:', { seriesCode, message });
        throw new Error(`Failed to fetch sermons for series "${seriesCode}": ${message}`);
    }
}
