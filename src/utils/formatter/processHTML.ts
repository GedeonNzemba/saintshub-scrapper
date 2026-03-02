import * as cheerio from 'cheerio';
import axios from 'axios';
import { AnyNode } from 'domhandler';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

export function processMessageHtml(html: AnyNode) {
    const $ = cheerio.load(html);
    const messages: { code: string; title: string; location: string | null; duration: string | null; pdfUrl: string | null; audioUrl: string | null; streamUrl: string | null; }[] = [];

    // Iterate over each message container (e.g., <div class="message">)
    $('.message').each((index, element) => {
        const message = $(element);

        // Extract message code
        const code = message.find('.prodtext').first().text().trim();

        // Extract title
        const title = message.find('.prodtexttitle').text().trim();

        // Extract location and duration
        const prodtext2Divs = message.find('.prodtext2').map((i, el) => $(el).text().trim()).get();
        const location = prodtext2Divs[0] || null;
        const duration = prodtext2Divs[1] || null;

        // Extract URLs
        const pdfUrl = message.find('a[title="download PDF file"]').attr('href') || null;
        const audioUrl = message.find('a[title="Download Audio"]').attr('href') || null;
        const streamUrl = message.find('a[title="Stream Audio"]').attr('href') || null;

        messages.push({
            code,
            title,
            location,
            duration,
            pdfUrl,
            audioUrl,
            streamUrl
        });
    });

    return messages;
}