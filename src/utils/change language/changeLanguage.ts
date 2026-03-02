import { client } from "../cookie jar/enableCookie";

export async function changeLanguage(languageCode: string) {
    try {
        // 1. Set language to French (FRN)
        await client.post(
            'https://branham.org/branham/messageaudio.aspx/wmSetLanguage',
            { formVars: [{ name: 'language', value: languageCode }] },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
                }
            }
        );
    } catch (error) {
        console.error({ error: error instanceof Error ? error.message : error });
    }
}