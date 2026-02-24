/**
 * Zoom CX - Create Claude_cars32 Inbound Voice Flow  v2
 * Fixed: "detached frame" error + better flow creation UI automation
 */
const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');

const ACCOUNT_ID    = 'Z-wSVKZGRXC59B5xRhrWIg';
const CLIENT_ID     = 'kmKBbmsQRMSaW9vXK0cduQ';
const CLIENT_SECRET = 'OA8RmxnXYHMMh7GR8lP4R9OHb16VLmp2';
const FLOW_NAME     = 'Claude_cars32';
const BASE_API      = 'https://api.zoom.us/v2';
const US_QUEUE_ID   = 'ZWQ1887222496A0776E5F5A9324C573CC62';
const INDIA_QUEUE_ID= 'ZWQA34051F5C48C7C0755E10A04FAFB2ED1';
const CHROME_EXE    = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const LOG_FILE      = 'C:/Users/VijayBandaru/zoom_cx_v2_log.txt';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = msg => {
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n');
};
const sc = async (page, name) => {
  try {
    await page.screenshot({ path: `C:/Users/VijayBandaru/cx_v2_${name}.png` });
    log(`📸 cx_v2_${name}.png`);
  } catch (e) { log(`screenshot ${name} failed: ${e.message}`); }
};

async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const r = await axios.post('https://zoom.us/oauth/token',
    `grant_type=account_credentials&account_id=${ACCOUNT_ID}`,
    { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } });
  return r.data.access_token;
}

// Safe navigation that opens a fresh page
async function safeGoto(browser, url, waitUntil = 'domcontentloaded') {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  // Intercept to capture session token
  let sessionToken = null;
  await page.setRequestInterception(true);
  page.on('request', req => {
    const auth = (req.headers()['authorization'] || '');
    if (auth.startsWith('Bearer ') && auth.length > 80 && !sessionToken) {
      sessionToken = auth.replace('Bearer ', '');
      log(`🔑 Session token captured from intercepted request`);
    }
    req.continue();
  });
  page.on('response', async resp => {
    try {
      const url = resp.url();
      if (url.includes('/contact_center/flows') && resp.request().method() === 'POST') {
        const txt = await resp.text();
        log(`[response] Flow POST ${resp.status()}: ${txt.substring(0, 500)}`);
      }
    } catch(e) {}
  });
  try {
    await page.goto(url, { waitUntil, timeout: 30000 });
  } catch (e) {
    log(`[nav] goto ${url}: ${e.message} (continuing)`);
  }
  return { page, getSessionToken: () => sessionToken };
}

async function main() {
  fs.writeFileSync(LOG_FILE, '');
  log('═══════════════════════════════════════════════════════');
  log(`  ZOOM CX - ${FLOW_NAME} Builder v2`);
  log(`  ${new Date().toISOString()}`);
  log('═══════════════════════════════════════════════════════');

  const token = await getToken();
  log('✅ OAuth token obtained');

  // Check if already exists
  try {
    const r = await axios.get(`${BASE_API}/contact_center/flows`,
      { headers: { Authorization: `Bearer ${token}` }, params: { page_size: 300 } });
    const existing = (r.data.flows || []).find(f => (f.name || f.flow_name) === FLOW_NAME);
    if (existing) {
      log(`⚠️  ${FLOW_NAME} already exists: ${existing.id || existing.flow_id} (${existing.status})`);
    } else {
      log(`ℹ️  ${FLOW_NAME} does not exist yet - will create via browser`);
    }
  } catch (e) { log(`flows check: ${e.message}`); }

  log('\n[Browser] Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_EXE,
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
    ],
    ignoreDefaultArgs: ['--enable-automation']
  });

  log('\n═══════════════════════════════════════════════════════════');
  log('  CHROME IS OPEN → Please log in to zoom.us');
  log('  URL opening: https://zoom.us/signin');
  log('  After login this script automatically creates the flow.');
  log('═══════════════════════════════════════════════════════════\n');

  // Open signin page
  const { page: signinPage } = await safeGoto(browser, 'https://zoom.us/signin');
  await sleep(2000);
  await sc(signinPage, '01_signin');

  // Wait for login (4 min max)
  let loggedIn = false;
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    try {
      const url = signinPage.isClosed() ? '' : signinPage.url();
      if (url && !url.includes('/signin') && !url.includes('/login') &&
          url.includes('zoom.us') && url.length > 20) {
        loggedIn = true;
        log(`[Browser] ✅ Logged in! URL: ${url}`);
        break;
      }
    } catch (e) { /* page may be navigating */ }
    await sleep(2000);
    process.stdout.write('.');
  }
  console.log('');

  if (!loggedIn) {
    log('[Browser] ❌ Login timeout (4 min). Exiting.');
    await browser.close();
    return;
  }

  await sleep(3000);

  // Open a FRESH page to avoid detached frame issues
  log('\n[Browser] Opening fresh page for Contact Center flows...');
  let sessionToken = null;

  const { page, getSessionToken } = await safeGoto(
    browser,
    'https://zoom.us/account/contact-center#/flows',
    'networkidle2'
  );
  sessionToken = getSessionToken();
  await sleep(5000);
  await sc(page, '02_flows_page');

  let currentUrl = page.url();
  log(`[Browser] Flows page URL: ${currentUrl}`);

  // If redirect to login again, try the other URL patterns
  if (currentUrl.includes('/signin') || currentUrl.includes('/login')) {
    log('[Browser] Got redirect to login. Trying alternative URLs...');
    const altUrls = [
      'https://zoom.us/contact-center/flows',
      'https://zoom.us/account/contact-center',
    ];
    for (const u of altUrls) {
      try {
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await sleep(3000);
        const pu = page.url();
        if (!pu.includes('/signin')) { log(`[Browser] Found: ${pu}`); break; }
      } catch (e) { log(`[Browser] nav ${u}: ${e.message}`); }
    }
  }

  currentUrl = page.url();
  await sc(page, '03_final_flows_url');

  // Inspect page structure
  const pageInfo = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    h: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent.trim()).slice(0, 5),
    buttons: Array.from(document.querySelectorAll('button,[role="button"]'))
      .map(b => b.textContent.trim().replace(/\s+/g, ' '))
      .filter(t => t.length > 0 && t.length < 80)
      .slice(0, 30),
    inputs: Array.from(document.querySelectorAll('input')).map(i => ({
      type: i.type, name: i.name, placeholder: i.placeholder, id: i.id
    })).slice(0, 10)
  }));
  log('[Browser] Page structure:');
  log(JSON.stringify(pageInfo, null, 2));

  // ── Try in-browser fetch with session cookies ─────────────────────────────
  log('\n[Browser] Attempting flow creation via in-browser fetch (uses session cookies)...');
  const inBrowserResult = await page.evaluate(async (flowName, baseApi) => {
    const results = {};
    const payloads = [
      { flow_name: flowName, channel: 'voice' },
      { flow_name: flowName, channel_type: 'voice' },
      { flowName, channel: 'voice' },
      { name: flowName, channel: 'voice' },
    ];
    for (const payload of payloads) {
      try {
        const r = await fetch(`${baseApi}/contact_center/flows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include'
        });
        const text = await r.text();
        results[JSON.stringify(payload)] = { status: r.status, body: text.substring(0, 300) };
        if (r.ok && text.includes('flow_id')) {
          results._created = JSON.parse(text);
          break;
        }
      } catch (e) {
        results[JSON.stringify(payload)] = { error: e.message };
      }
    }
    return results;
  }, FLOW_NAME, BASE_API);

  log('[Browser] In-browser API results:');
  for (const [k, v] of Object.entries(inBrowserResult)) {
    log(`  ${k}: ${JSON.stringify(v)}`);
  }

  let flowId = inBrowserResult._created?.flow_id || null;

  // ── Try clicking the "Create Flow" button ─────────────────────────────────
  if (!flowId) {
    log('\n[Browser] Trying to click Create Flow button...');

    const createPatterns = [
      'create flow', 'create a flow', '+ create', 'new flow',
      'add flow', 'create', '+ new', 'add new flow'
    ];

    for (const pat of createPatterns) {
      const clicked = await page.evaluate((p) => {
        const all = document.querySelectorAll('button,[role="button"],a[href*="flow"]');
        for (const el of all) {
          const t = el.textContent.trim().toLowerCase();
          if (t.includes(p) && el.offsetParent !== null) {
            el.click();
            return el.textContent.trim();
          }
        }
        return null;
      }, pat);

      if (clicked) {
        log(`[Browser] ✅ Clicked button: "${clicked}"`);
        await sleep(3000);
        await sc(page, '04_after_create_btn');
        break;
      }
    }

    // Look for modal / dialog
    const modal = await page.$('[role="dialog"],[class*="modal"],[class*="Modal"],[class*="dialog"]');
    if (modal) {
      log('[Browser] Modal/dialog detected after click');

      // Type flow name
      const nameField = await page.$('input[placeholder*="name" i],input[name*="name" i],input[type="text"]');
      if (nameField) {
        await nameField.click({ clickCount: 3 });
        await nameField.type(FLOW_NAME, { delay: 60 });
        log(`[Browser] ✅ Typed "${FLOW_NAME}" in name field`);
      }

      // Select Voice channel
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('input[type="radio"],[role="radio"],label,button')) {
          if (/voice/i.test(el.textContent || el.value || el.dataset.value || '')) {
            el.click();
          }
        }
      });
      log('[Browser] Clicked Voice option');
      await sleep(500);
      await sc(page, '05_form_filled');

      // Click confirm/create button in modal
      for (const pat of ['create', 'confirm', 'ok', 'next', 'submit', 'save']) {
        const confirmed = await page.evaluate((p) => {
          const scope = document.querySelector('[role="dialog"],[class*="modal"]') || document;
          for (const btn of scope.querySelectorAll('button')) {
            const t = btn.textContent.trim().toLowerCase();
            if (t.includes(p) && !t.includes('cancel') && btn.offsetParent) {
              btn.click();
              return btn.textContent.trim();
            }
          }
          return null;
        }, pat);
        if (confirmed) {
          log(`[Browser] ✅ Confirmed with: "${confirmed}"`);
          await sleep(5000);
          await sc(page, '06_after_confirm');
          break;
        }
      }

      // Extract flow ID from URL
      const newUrl = page.url();
      const m = newUrl.match(/flows\/([A-Za-z0-9_\-]{10,})/);
      if (m) {
        flowId = m[1];
        log(`[Browser] ✅ Flow ID from URL: ${flowId}`);
      } else {
        log(`[Browser] URL after confirm: ${newUrl}`);
      }
    } else {
      log('[Browser] No modal found. Dumping current page buttons:');
      const btns = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button,[role="button"]'))
          .map(b => b.textContent.trim().replace(/\s+/g, ' '))
          .filter(t => t)
          .join(' | ')
      );
      log(btns);
    }
  }

  // ── If we have a flow ID, configure it via PATCH + publish ────────────────
  if (flowId) {
    log(`\n[Browser] Flow created! ID: ${flowId}`);
    log(`  URL: https://zoom.us/contact-center/flows/${flowId}/edit`);

    // Navigate to flow builder
    try {
      await page.goto(`https://zoom.us/contact-center/flows/${flowId}/edit`, {
        waitUntil: 'networkidle2', timeout: 30000
      });
      await sleep(5000);
      await sc(page, '07_flow_editor');
      log(`[Browser] Flow editor URL: ${page.url()}`);
    } catch (e) {
      log(`[Browser] Nav to editor: ${e.message}`);
    }

    // Try to publish via REST (flow exists but might be empty - that's ok as a start)
    try {
      const pub = await axios.put(`${BASE_API}/contact_center/flows/${flowId}/publish`, {},
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      log(`[REST] ✅ Published flow ${flowId}: ${pub.status}`);
    } catch (e) {
      log(`[REST] Publish attempt: ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
    }

  } else {
    log('\n[Browser] ⚠️  Could not auto-create flow. Browser is open for manual creation.');
    log('Please create the flow manually using the Zoom CX UI.');
    log(`Flow name: ${FLOW_NAME}`);
    log(`Channel: Voice (Inbound)`);
  }

  // Save captured info
  fs.writeFileSync('C:/Users/VijayBandaru/zoom_cx_v2_result.json', JSON.stringify({
    flowId,
    sessionToken: sessionToken ? 'captured' : 'not captured',
    timestamp: new Date().toISOString()
  }, null, 2));

  log('\n════════════════════════════════════════════════════════');
  log(`  Browser will stay open for 10 minutes for manual work`);
  log(`  Flow to build: ${FLOW_NAME}`);
  if (flowId) log(`  Flow ID: ${flowId}`);
  log('════════════════════════════════════════════════════════');

  // Keep open for manual work
  for (let i = 10; i > 0; i--) {
    await sleep(60000);
    log(`  ⏳ ${i - 1} min remaining...`);
  }

  try { await browser.close(); } catch (e) {}
}

main().catch(e => {
  console.error('Fatal:', e.message);
  fs.appendFileSync(LOG_FILE, `\nFatal: ${e.message}\n${e.stack}\n`);
  process.exit(1);
});
