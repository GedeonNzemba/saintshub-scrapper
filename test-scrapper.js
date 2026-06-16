const { fetchAndProcessChapter } = require('./dist/utils/bible/bibleUtils.js');

async function test() {
  try {
    const chapter = await fetchAndProcessChapter("1", "GEN.1");
    console.log("Heading:", chapter.heading);
    console.log("HTML length:", chapter.html.length);
    console.log("HTML preview:", chapter.html.substring(0, 500));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
test();
