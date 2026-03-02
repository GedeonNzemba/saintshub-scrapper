import axios from 'axios';
import * as cheerio from 'cheerio';

export async function fetchLanguages() {
    try {
        const response = await axios.post(
            'https://branham.org/branham/messageaudio.aspx/wmDisplayLanguages',
            { formVars: [{ name: "", value: "" }] },
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        // Process the HTML response
        const htmlContent = response.data.d;
        const $ = cheerio.load(htmlContent);

        const languages: { code: string; name: string }[] = [];

        // Extract each language entry
        $('div.large-8.medium-12.columns.end').each((index, element) => {
            const languageDiv = $(element).find('.languagesbox');
            const code = languageDiv?.attr('id')?.replace('lng_', '') || '';
            const name = languageDiv?.text().trim() || '';

            languages.push({ code, name });
        });

        return { d: languages };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error:', error.message);
        } else {
            console.error('Error:', error);
        }
        return { d: [] };
    }
}
