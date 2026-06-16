const { fetchHtmlWithPuppeteer } = require('./dist/utils/puppeteerHelper.js');

async function test() {
  try {
    const html = await fetchHtmlWithPuppeteer('https://www.bible.com/bible/1/GEN.1.KJV');
    console.log(html.substring(0, 1000));
    console.log("=========================================");
    
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    const text = $('[data-usfm="GEN.1.1"]').text();
    console.log("Extracted verse text:", text);
    
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
test();
