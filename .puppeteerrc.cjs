const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  // This is critical for Railway because the default /root/.cache 
  // is often discarded between the build and run phases.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
