const { connect } = require('puppeteer-real-browser');

async function runScraper(email, password) {
  // 1. Connect using the real-browser logic to bypass Turnstile
  const { browser, page } = await connect({
    headless: false, // Must be false to solve the initial JS challenge
    args: ['--start-maximized'],
    customConfig: {},
    skipTarget: [],
    fingerprint: true, // This spoofs a real device fingerprint
    turnstile: true,   // Automatically handles the Turnstile "Verify" button
  });

  try {
    await page.goto('https://www.kalodata.com/login', { waitUntil: 'networkidle2' });

    // Wait for the login form - Cloudflare should be bypassed by now
    await page.waitForSelector('input[type="text"]', { timeout: 60000 });
    
    // Login logic
    await page.type('input[type="text"]', email, { delay: 100 });
    await page.type('input[type="password"]', password, { delay: 100 });
    await page.click('button[type="submit"]');

    // Wait for the dashboard to load
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Navigate to products and scrape
    await page.goto('https://www.kalodata.com/product');
    await page.waitForSelector('.ant-table-row');

    const products = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.ant-table-row')).map(row => ({
        title: row.querySelector('.product-name')?.innerText,
        price: row.querySelector('.price-cell')?.innerText,
        source: "Kalodata"
      }));
    });

    await browser.close();
    return products;
  } catch (err) {
    console.error("Scraping failed:", err);
    await browser.close();
    throw err;
  }
}

module.exports = runScraper;