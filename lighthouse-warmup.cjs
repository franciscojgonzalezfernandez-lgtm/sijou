// lhci `puppeteerScript`: runs in the browser Lighthouse uses, once per URL before its runs.
// It loads the page with Vercel's protection bypass and `x-vercel-set-bypass-cookie`, so:
// - the bypass cookie lands in the browser's cookie jar, and Lighthouse's own fetches (robots.txt)
//   get through without the measured navigation going through the set-cookie redirect;
// - the edge cache for that URL is warm before the first measured run.
// Fail-safe: a slow or failing warm-up only logs; Lighthouse still runs and asserts.
const TIMEOUT_MS = 30_000;

module.exports = async (browser, { url }) => {
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!bypass) return;
  const page = await browser.newPage();
  try {
    await page.setExtraHTTPHeaders({
      "x-vercel-protection-bypass": bypass,
      "x-vercel-set-bypass-cookie": "true",
      "x-vercel-skip-toolbar": "1",
    });
    const response = await page.goto(url, { waitUntil: "load", timeout: TIMEOUT_MS });
    const cookies = await browser.cookies();
    const hasBypassCookie = cookies.some((c) => c.name === "_vercel_jwt");
    console.log(`Warm-up ${url}: ${response?.status()}, bypass cookie: ${hasBypassCookie}`);
  } catch (error) {
    console.warn(`Warm-up ${url} failed: ${error instanceof Error ? error.message : error}`);
  } finally {
    await page.close();
  }
};
