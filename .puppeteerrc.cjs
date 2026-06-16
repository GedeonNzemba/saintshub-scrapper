const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 *
 * Puppeteer cache location. On Railway we set PUPPETEER_CACHE_DIR in
 * nixpacks.toml so the build-time download and the runtime launch agree on
 * one persistent path inside /app. We honour that env var here too so the
 * `npx puppeteer browsers install chrome` postinstall writes to the same dir.
 * Falls back to a project-local .cache for local dev.
 */
module.exports = {
  cacheDirectory: process.env.PUPPETEER_CACHE_DIR || join(__dirname, '.cache', 'puppeteer'),
};
