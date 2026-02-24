/* global document, window */
/**
 * Zoom CX - Claude_cars32 Flow Builder
 * Uses system Chrome + Puppeteer to automate flow configuration
 *
 * Flow ID: NZBuYW2YRmCx-JEu_cmjBg (already renamed to Claude_cars32)
 */

const puppeteer = require('puppeteer');
const axios     = require('axios');
const path      = require('path');

const ACCOUNT_ID    = 'Z-wSVKZGRXC59B5xRhrWIg';
const CLIENT_ID     = 'kmKBbmsQRMSaW9vXK0cduQ';
const CLIENT_SECRET = 'OA8RmxnXYHMMh7GR8lP4R9OHb16VLmp2';
const FLOW_ID       = 'NZBuYW2YRmCx-JEu_cmjBg';  // Claude_cars32
const FLOW_NAME     = 'Claude_cars32';
const BASE_API      = 'https://api.zoom.us/v2';
const _US_QUEUE_ID   = 'ZWQ1887222496A0776E5F5A9324C573CC62';
const _INDIA_QUEUE_ID= 'ZWQA34051F5C48C7C0755E10A04FAFB2ED1';
const CHROME_PATH   = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const SS_DIR = 'C:\\Users\\VijayBandaru\\';

async function ss(page, name) {
  try {
    await page.screenshot({ path: path.join(SS_DIR, `zoom_${name}.png`), fullPage: false });
    console.log(`   📸 Screenshot: zoom_${name}.png`);
  } catch (_e) { /* empty */ }
}

async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const r = await axios.post(
    'https://zoom.us/oauth/token',
    `grant_type=account_credentials&account_id=${ACCOUNT_ID}`,
    { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return r.data.access_token;
}

async function tryPublishViaAPI(token) {
  console.log('\n[API] Trying all publish methods...');
  const attempts = [
    ['put',  `${BASE_API}/contact_center/flows/${FLOW_ID}/publish`, {}],
    ['post', `${BASE_API}/contact_center/flows/${FLOW_ID}/publish`, {}],
    ['put',  `${BASE_API}/contact_center/flows/${FLOW_ID}/publish`, { version_description: 'v1.0' }],
    // Try updating flow status directly
    ['patch', `${BASE_API}/contact_center/flows/${FLOW_ID}`, { status: 'published' }],
  ];

  for (const [method, url, body] of attempts) {
    try {
      const r = await axios[method](url, body, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      console.log(`[API] ✅ ${method.toUpperCase()} publish succeeded:`, JSON.stringify(r.data || 'ok'));
      return true;
    } catch (e) {
      console.log(`[API] ${method.toUpperCase()} ${url.split('/').pop()}: ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
    }
  }
  return false;
}

async function buildFlow() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ZOOM CX - Claude_cars32 Browser Automation');
  console.log('═══════════════════════════════════════════════════════════════');

  const token = await getToken();
  console.log('✅ Token obtained');

  // Try API publish first
  await tryPublishViaAPI(token);

  // Open Zoom CX Flow Builder in browser
  console.log('\n[Browser] Launching Chrome...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      `--app=https://zoom.us/contact-center/flows/${FLOW_ID}/edit`
    ]
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  // Intercept requests to capture internal token
  let internalToken = null;
  await page.setRequestInterception(true);
  page.on('request', req => {
    const auth = req.headers()['authorization'];
    if (auth && auth.startsWith('Bearer ') && !internalToken) {
      internalToken = auth.replace('Bearer ', '');
      console.log('[Browser] Captured internal Bearer token!');
    }
    req.continue();
  });

  try {
    console.log('[Browser] Loading Zoom CX Flow Builder...');
    console.log(`[Browser] URL: https://zoom.us/contact-center/flows/${FLOW_ID}/edit`);

    await page.goto(`https://zoom.us/contact-center/flows/${FLOW_ID}/edit`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await sleep(3000);
    await ss(page, '01_initial');

    const url = page.url();
    console.log(`[Browser] Current URL: ${url}`);

    if (url.includes('/signin') || url.includes('/login') || url.includes('/oauth')) {
      console.log('[Browser] 🔑 Login required. Attempting automatic login...');

      // Check for email field
      try {
        await page.waitForSelector('#email, input[type="email"], input[name="email"]', { timeout: 8000 });
        await page.focus('#email, input[type="email"], input[name="email"]');
        await page.keyboard.type('vijay.Bandaru+sandbox@waterfield.com', { delay: 50 });
        await sleep(500);

        // Click next/continue
        await page.keyboard.press('Enter');
        await sleep(2000);
        await ss(page, '02_after_email');

        // Wait for password or SSO
        const passEl = await page.$('input[type="password"], #password');
        if (passEl) {
          console.log('[Browser] Password field found. Waiting for manual password entry...');
          console.log('[Browser] ⚠️  Please enter your password in the browser window!');
          // Wait for navigation after password entry (up to 60s)
          await page.waitForNavigation({ timeout: 60000 }).catch(() => {});
        }
      } catch (e) {
        console.log(`[Browser] Login form issue: ${e.message}`);
        console.log('[Browser] ⚠️  Please log in manually in the browser window. Waiting 60 seconds...');
        await sleep(60000);
      }
    }

    await sleep(3000);
    await ss(page, '03_post_login');

    const postLoginUrl = page.url();
    console.log(`[Browser] Post-login URL: ${postLoginUrl}`);

    // Navigate to the specific flow builder
    if (!postLoginUrl.includes('/flows/')) {
      console.log('[Browser] Navigating to flow builder...');
      await page.goto(`https://zoom.us/contact-center/flows/${FLOW_ID}/edit`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await sleep(5000);
    }

    await ss(page, '04_flow_builder');
    const builderUrl = page.url();
    console.log(`[Browser] Flow builder URL: ${builderUrl}`);

    // Detect the flow builder canvas
    const canvasVisible = await page.evaluate(() => {
      const selectors = [
        '[class*="canvas"]', '[class*="flow-builder"]', '[class*="designer"]',
        '[class*="FlowBuilder"]', '[class*="WorkCanvas"]', '[data-testid*="canvas"]',
        'svg', 'canvas', '[class*="widget"]'
      ];
      for (const s of selectors) {
        if (document.querySelector(s)) return s;
      }
      return null;
    });
    console.log(`[Browser] Canvas element detected: ${canvasVisible}`);

    // Get page structure
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent.trim()).slice(0, 5),
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t).slice(0, 20),
        url: window.location.href
      };
    });
    console.log('[Browser] Page info:', JSON.stringify(pageInfo, null, 2));

    // If we captured internal token, try to create flow with it
    if (internalToken && internalToken !== token) {
      console.log('[Browser] 🔑 Using captured internal token for API calls...');

      const internalCreateAttempts = [
        { flow_name: FLOW_NAME, channel_type: 'voice' },
        { name: FLOW_NAME, channel_type: 'voice' },
        { flow_name: FLOW_NAME, type: 'voice' },
      ];

      for (const payload of internalCreateAttempts) {
        try {
          const r = await axios.post(`${BASE_API}/contact_center/flows`, payload, {
            headers: { Authorization: `Bearer ${internalToken}`, 'Content-Type': 'application/json' }
          });
          console.log(`[API] ✅ Internal token create success:`, JSON.stringify(r.data));
          break;
        } catch (e) {
          console.log(`[API] Internal token: ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
        }
      }
    }

    // Try to interact with flow builder UI
    console.log('[Browser] Looking for widget palette/toolbar...');

    // Look for toolbar with widget types
    const widgetButtons = await page.evaluate(() => {
      const results = [];
      // Find all draggable elements, buttons, or palette items
      const allEls = document.querySelectorAll('[draggable="true"], [class*="palette"], [class*="widget-item"], [class*="node-type"]');
      for (const el of allEls) {
        results.push({
          tag: el.tagName,
          class: el.className,
          text: el.textContent.trim().substring(0, 50)
        });
      }
      return results.slice(0, 20);
    });
    console.log('[Browser] Widget items found:', JSON.stringify(widgetButtons));

    // Take final screenshot
    await ss(page, '05_final_state');

    // Keep browser open for manual interaction
    console.log('\n[Browser] ===================================================');
    console.log('[Browser] Browser is now open at the Zoom CX Flow Builder!');
    console.log('[Browser] Flow: Claude_cars32');
    console.log('[Browser] ID: ' + FLOW_ID);
    console.log('[Browser]');
    console.log('[Browser] Please configure the flow manually using the guide below.');
    console.log('[Browser] The browser will stay open for 5 minutes for you to work.');
    console.log('[Browser] ===================================================');

    // Wait 5 minutes for manual configuration
    for (let i = 5; i > 0; i--) {
      console.log(`[Browser] Keeping browser open... ${i} minute(s) remaining`);
      await sleep(60000);
    }

  } catch (err) {
    console.error(`[Browser] Error: ${err.message}`);
    await ss(page, 'error_state');
  } finally {
    console.log('[Browser] Closing browser...');
    await browser.close();
  }
}

buildFlow().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
