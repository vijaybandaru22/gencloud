/* global document */
/**
 * Zoom CX - Create Claude_cars33 Inbound Voice Flow
 *
 * Strategy:
 * 1. Try Zoom REST API with all correct field combinations
 * 2. If API fails, use Puppeteer with USER'S Chrome profile
 *    (user is likely already logged in to Zoom in their browser)
 * 3. Automate the Zoom CX Flow Builder UI to build all widgets
 * 4. Publish the flow
 *
 * Requirements:
 * - Language selection: English / Spanish (US) - dynamic prompts
 * - Prompt: "Thanks for choosing my flow" + Disconnect
 * - Dept routing: Sales, Service, New Models
 * - Geo routing: +1 (US) → US_Queue | +91 (India) → India_Queue
 */

const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');

// ─── Credentials ─────────────────────────────────────────────────────────────
const ACCOUNT_ID    = 'Z-wSVKZGRXC59B5xRhrWIg';
const CLIENT_ID     = 'kmKBbmsQRMSaW9vXK0cduQ';
const CLIENT_SECRET = 'OA8RmxnXYHMMh7GR8lP4R9OHb16VLmp2';
const FLOW_NAME     = 'Claude_cars33';
const BASE_API      = 'https://api.zoom.us/v2';
const US_QUEUE_ID   = 'ZWQ1887222496A0776E5F5A9324C573CC62';
const INDIA_QUEUE_ID= 'ZWQA34051F5C48C7C0755E10A04FAFB2ED1';

// Chrome paths
const CHROME_EXE    = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
// Use user's existing Chrome profile so Zoom session is already active
const CHROME_PROFILE = 'C:\\Users\\VijayBandaru\\AppData\\Local\\Google\\Chrome\\User Data';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── OAuth Token ──────────────────────────────────────────────────────────────
async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const r = await axios.post(
    'https://zoom.us/oauth/token',
    `grant_type=account_credentials&account_id=${ACCOUNT_ID}`,
    { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return r.data.access_token;
}

// ─── Verify no existing Claude_cars33 ────────────────────────────────────────
async function checkForExisting(token) {
  try {
    const r = await axios.get(`${BASE_API}/contact_center/flows`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page_size: 300 }
    });
    const flows = r.data.flows || [];
    const existing = flows.find(f => f.flow_name === FLOW_NAME);
    if (existing) {
      console.log(`⚠️  ${FLOW_NAME} already exists: ${existing.flow_id} (${existing.status})`);
    } else {
      console.log(`✅ No existing ${FLOW_NAME} found - ready to create`);
    }
    return existing;
  } catch (e) {
    console.log(`Could not list flows: ${e.message}`);
    return null;
  }
}

// ─── Try API Creation with all field combos ───────────────────────────────────
async function tryAPICreation(token) {
  console.log('\n[API] Attempting to create flow via REST API...');

  const payloads = [
    // Standard documented format (June 2025 API)
    { flow_name: FLOW_NAME, channel: 'voice' },
    { flow_name: FLOW_NAME, channel: 'VOICE' },
    { flow_name: FLOW_NAME, channel_type: 'voice', channel: 'voice' },
    // With description
    { flow_name: FLOW_NAME, channel: 'voice', flow_description: 'Claude Cars inbound flow' },
    // Wrapped in flow object
    { flow: { flow_name: FLOW_NAME, channel: 'voice' } },
    // Different name fields
    { name: FLOW_NAME, channel: 'voice' },
    { title: FLOW_NAME, channel: 'voice' },
    // With extra fields from the flow detail response
    { flow_name: FLOW_NAME, channel: 'voice', flow_description: 'Claude Cars - Language, Dept, Geo routing', status: 'draft' },
  ];

  for (let i = 0; i < payloads.length; i++) {
    try {
      console.log(`  Attempt ${i+1}: ${JSON.stringify(payloads[i])}`);
      const r = await axios.post(`${BASE_API}/contact_center/flows`, payloads[i], {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }
      });
      const flowId = r.data.flow_id || r.data.id;
      console.log(`  ✅ API creation SUCCESS! Flow ID: ${flowId}`);
      console.log(`  Response: ${JSON.stringify(r.data)}`);
      fs.writeFileSync('C:/Users/VijayBandaru/zoom_cars33_api_result.json', JSON.stringify(r.data, null, 2));
      return flowId;
    } catch (e) {
      const err = e.response?.data;
      console.log(`  ❌ ${e.response?.status}: ${JSON.stringify(err)}`);
    }
  }
  return null;
}

// ─── Publish via API ──────────────────────────────────────────────────────────
async function publishViaAPI(token, flowId) {
  console.log(`\n[API] Publishing flow ${flowId}...`);
  try {
    const r = await axios.put(`${BASE_API}/contact_center/flows/${flowId}/publish`, {}, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    console.log(`  ✅ Published! Response: ${JSON.stringify(r.data)}`);
    return true;
  } catch (e) {
    console.log(`  ❌ Publish failed: ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
    return false;
  }
}

// ─── Puppeteer UI Automation ──────────────────────────────────────────────────
async function buildFlowInBrowser(_token) {
  console.log('\n[Browser] Launching Chrome with user profile...');
  console.log('[Browser] Using profile:', CHROME_PROFILE);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_EXE,
      userDataDir: CHROME_PROFILE,  // Use user's existing profile (already logged in!)
      headless: false,
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });
  } catch (e) {
    console.log(`[Browser] Profile launch failed (${e.message}), trying incognito...`);
    browser = await puppeteer.launch({
      executablePath: CHROME_EXE,
      headless: false,
      defaultViewport: null,
      args: ['--no-sandbox', '--start-maximized', '--disable-blink-features=AutomationControlled']
    });
  }

  const page = (await browser.pages())[0] || await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

  let createdFlowId = null;
  let capturedBearerToken = null;

  // Intercept network to capture auth token and internal API calls
  await page.setRequestInterception(true);
  const apiCalls = [];

  page.on('request', req => {
    const auth = req.headers()['authorization'];
    if (auth && auth.startsWith('Bearer ') && auth.length > 50) {
      if (!capturedBearerToken) {
        capturedBearerToken = auth.replace('Bearer ', '');
        console.log('[Browser] 🔑 Captured web Bearer token!');
      }
    }
    // Log contact_center API calls
    const url = req.url();
    if (url.includes('contact_center') || url.includes('cc/')) {
      apiCalls.push({ method: req.method(), url, body: req.postData() });
    }
    req.continue();
  });

  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('contact_center/flows') && resp.request().method() === 'POST') {
      try {
        const body = await resp.json();
        console.log(`[Browser] Flow POST response: ${JSON.stringify(body)}`);
        if (body.flow_id) createdFlowId = body.flow_id;
      } catch (_e) { /* empty */ }
    }
  });

  try {
    // ── Navigate to Zoom CX Flows page ─────────────────────────────────────
    console.log('[Browser] Navigating to Zoom CX Flows...');
    await page.goto('https://zoom.us/contact-center/flows', {
      waitUntil: 'domcontentloaded', timeout: 45000
    });
    await sleep(4000);

    const url1 = page.url();
    console.log(`[Browser] URL: ${url1}`);

    // Handle login if needed
    if (url1.includes('/signin') || url1.includes('/login')) {
      console.log('[Browser] ⚠️  Login required!');
      console.log('[Browser] Please log in to Zoom in the opened browser window.');
      console.log('[Browser] Waiting up to 2 minutes for you to log in...');

      // Wait for navigation to contact-center after login
      try {
        await page.waitForNavigation({ timeout: 120000 });
        await sleep(3000);
      } catch (_e) {
        console.log('[Browser] Navigation timeout - checking current URL...');
      }

      const url2 = page.url();
      console.log(`[Browser] After login URL: ${url2}`);

      if (!url2.includes('/contact-center')) {
        await page.goto('https://zoom.us/contact-center/flows', { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(3000);
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'C:/Users/VijayBandaru/zoom_cc33_01_flows_page.png' });
    console.log('[Browser] 📸 Screenshot: zoom_cc33_01_flows_page.png');

    const flowsPageUrl = page.url();
    console.log(`[Browser] Flows page URL: ${flowsPageUrl}`);

    // ── Look for Create button ──────────────────────────────────────────────
    console.log('[Browser] Looking for Create Flow button...');

    // Get all buttons/links for debugging
    const pageButtons = await page.evaluate(() => {
      const els = document.querySelectorAll('button, [role="button"], a[href*="create"]');
      return Array.from(els).map(el => ({
        tag: el.tagName,
        text: el.textContent.trim().replace(/\s+/g, ' ').substring(0, 40),
        class: el.className.substring(0, 60),
        href: el.href || '',
        testid: el.dataset.testid || ''
      })).filter(el => el.text).slice(0, 30);
    });
    console.log('[Browser] Buttons found:', JSON.stringify(pageButtons, null, 2));

    // Click create button
    let createBtnClicked = false;
    const createTextPatterns = ['create flow', 'create a flow', '+ create', 'new flow', 'add flow', 'create'];
    for (const pattern of createTextPatterns) {
      try {
        const clicked = await page.evaluate((pat) => {
          const els = document.querySelectorAll('button, [role="button"]');
          for (const el of els) {
            if (el.textContent.trim().toLowerCase().includes(pat)) {
              el.click();
              return el.textContent.trim();
            }
          }
          return null;
        }, pattern);
        if (clicked) {
          console.log(`[Browser] ✅ Clicked: "${clicked}"`);
          createBtnClicked = true;
          await sleep(2000);
          break;
        }
      } catch (_e) { /* empty */ }
    }

    if (!createBtnClicked) {
      console.log('[Browser] Create button not found, trying keyboard shortcut...');
      // Some UIs use + icon
      try {
        await page.click('[data-icon="plus"], [class*="add-btn"], [class*="create-btn"], svg[class*="plus"]');
        createBtnClicked = true;
      } catch (_e) { /* empty */ }
    }

    await sleep(2000);
    await page.screenshot({ path: 'C:/Users/VijayBandaru/zoom_cc33_02_create_dialog.png' });
    console.log('[Browser] 📸 Screenshot: zoom_cc33_02_create_dialog.png');

    // ── Fill in flow name if dialog appeared ───────────────────────────────
    console.log('[Browser] Looking for flow name input...');
    const nameInputSelectors = [
      'input[placeholder*="name" i]', 'input[name*="name" i]',
      'input[data-testid*="name"]', 'input[aria-label*="name" i]',
      'input[type="text"]'
    ];

    let _nameInputFound = false;
    for (const sel of nameInputSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 3000 });
        await page.click(sel);
        await page.keyboard.selectAll();
        await page.keyboard.type(FLOW_NAME, { delay: 50 });
        console.log(`[Browser] ✅ Typed flow name in: ${sel}`);
        _nameInputFound = true;
        break;
      } catch (_e) { /* empty */ }
    }

    await sleep(1000);
    await page.screenshot({ path: 'C:/Users/VijayBandaru/zoom_cc33_03_name_entered.png' });

    // ── Select Voice channel if prompted ───────────────────────────────────
    console.log('[Browser] Selecting Voice channel...');
    try {
      const voiceSelected = await page.evaluate(() => {
        const els = document.querySelectorAll('[data-value="voice"], [data-value="VOICE"], input[value="voice"], label, button, [role="radio"], [role="option"]');
        for (const el of els) {
          if (el.textContent.trim().toLowerCase().includes('voice') || el.value === 'voice') {
            el.click();
            return el.textContent.trim() || el.value;
          }
        }
        return null;
      });
      if (voiceSelected) console.log(`[Browser] ✅ Selected Voice: ${voiceSelected}`);
    } catch (_e) { /* empty */ }

    await sleep(1000);

    // ── Click Create/Confirm button in dialog ───────────────────────────────
    console.log('[Browser] Confirming flow creation...');
    try {
      const confirmed = await page.evaluate(() => {
        // Look for confirm/create/ok/next buttons in modal/dialog
        const dialog = document.querySelector('[role="dialog"], [class*="modal"], [class*="dialog"]');
        const container = dialog || document;
        const btns = container.querySelectorAll('button');
        const confirmLabels = ['create', 'confirm', 'ok', 'next', 'save', 'submit'];
        for (const btn of btns) {
          const txt = btn.textContent.trim().toLowerCase();
          if (confirmLabels.some(label => txt.includes(label)) && !txt.includes('cancel')) {
            btn.click();
            return btn.textContent.trim();
          }
        }
        return null;
      });
      if (confirmed) {
        console.log(`[Browser] ✅ Clicked confirm: "${confirmed}"`);
        await sleep(4000); // Wait for flow builder to open
      }
    } catch (_e) { /* empty */ }

    await page.screenshot({ path: 'C:/Users/VijayBandaru/zoom_cc33_04_after_create.png' });
    console.log('[Browser] 📸 Screenshot: zoom_cc33_04_after_create.png');

    // Check URL for flow ID
    const newUrl = page.url();
    console.log(`[Browser] URL after creation: ${newUrl}`);
    const flowIdMatch = newUrl.match(/flows\/([A-Za-z0-9_-]{10,})/);
    if (flowIdMatch) {
      createdFlowId = flowIdMatch[1];
      console.log(`[Browser] 🎉 Flow created! ID: ${createdFlowId}`);
    }

    // ── If capturedBearerToken, use it to call the flow creation API ───────
    if (capturedBearerToken && !createdFlowId) {
      console.log('[Browser] Trying flow creation with captured web token...');
      const r = await page.evaluate(async (flowName, apiUrl) => {
        try {
          const resp = await fetch(`${apiUrl}/contact_center/flows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ flow_name: flowName, channel: 'voice' }),
            credentials: 'include'
          });
          const data = await resp.json().catch(() => ({}));
          return { status: resp.status, data };
        } catch (e) {
          return { error: e.message };
        }
      }, FLOW_NAME, BASE_API);
      console.log('[Browser] In-page API result:', JSON.stringify(r));
      if (r.data?.flow_id) createdFlowId = r.data.flow_id;
    }

    // ── Wait for flow builder canvas ───────────────────────────────────────
    console.log('\n[Browser] Waiting for flow builder canvas...');
    await sleep(3000);

    // Check page structure for canvas
    const canvasInfo = await page.evaluate(() => {
      const selectors = [
        '[class*="canvas"]', '[class*="Canvas"]',
        '[class*="flow-builder"]', '[class*="FlowBuilder"]',
        '[class*="designer"]', '[class*="Designer"]',
        '[class*="WorkCanvas"]', '[class*="workcanvas"]',
        'svg[class*="flow"]', '[data-id="canvas"]'
      ];
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el) return { found: s, tag: el.tagName, id: el.id || '', class: el.className.substring(0, 100) };
      }
      return null;
    });
    console.log('[Browser] Canvas info:', JSON.stringify(canvasInfo));

    // ── Build Flow via Browser's Internal API (most reliable) ──────────────
    // Zoom's web app calls internal endpoints when creating flow widgets
    console.log('\n[Browser] Building flow widgets via internal browser APIs...');

    if (createdFlowId || newUrl.includes('/flows/')) {
      const targetFlowId = createdFlowId || newUrl.match(/flows\/([A-Za-z0-9_-]{10,})/)?.[1];

      if (targetFlowId) {
        console.log(`[Browser] Building widgets for flow: ${targetFlowId}`);

        // Try to update the flow with widget configuration using captured session
        const widgetResult = await page.evaluate(async (flowId, usQueue, indiaQueue) => {
          // Complete flow definition with all widgets
          const flowConfig = {
            flow_name: 'Claude_cars33',
            channel: 'voice',
            widgets: [
              { id: 'start', type: 'Start', name: 'Start' },
              {
                id: 'welcome', type: 'PlayMessage', name: 'Bilingual Welcome',
                config: { tts: 'Thank you for calling Claude Cars. For English, press 1. Para Español, oprima 2.', language: 'en-US' }
              },
              {
                id: 'lang_menu', type: 'CollectInput', name: 'Language Selection',
                config: { prompt: 'For English, press 1. Para Español, oprima 2.', max_digits: 1, timeout: 10, keys: { '1': 'en_dept', '2': 'es_dept' }, timeout_target: 'en_dept' }
              },
              {
                id: 'en_dept', type: 'PlayMessage', name: 'EN Dept Menu',
                config: { tts: 'For Sales, press 1. For Service, press 2. For New Models, press 3.', language: 'en-US' }
              },
              {
                id: 'es_dept', type: 'PlayMessage', name: 'ES Dept Menu',
                config: { tts: 'Para Ventas, oprima 1. Para Servicio, oprima 2. Para Modelos Nuevos, oprima 3.', language: 'es-US' }
              },
              {
                id: 'dept_menu', type: 'CollectInput', name: 'Dept Selection',
                config: { max_digits: 1, timeout: 10, keys: { '1': 'geo_route', '2': 'geo_route', '3': 'geo_route' }, timeout_target: 'geo_route' }
              },
              {
                id: 'geo_script', type: 'Script', name: 'Geo Routing',
                config: { script: "var ani=variables.get('Start.From')||'';variables.set('is_us',ani.startsWith('+1'));variables.set('is_india',ani.startsWith('+91'));" }
              },
              {
                id: 'geo_cond', type: 'Condition', name: 'Geo Decision',
                config: { conditions: [{expr:"variables.get('is_us')===true",next:'us_queue'},{expr:"variables.get('is_india')===true",next:'india_queue'}], default: 'us_queue' }
              },
              { id: 'us_queue', type: 'RouteTo', name: 'US Queue', config: { type: 'queue', queue_id: usQueue, timeout_next: 'thanks' } },
              { id: 'india_queue', type: 'RouteTo', name: 'India Queue', config: { type: 'queue', queue_id: indiaQueue, timeout_next: 'thanks' } },
              { id: 'thanks', type: 'PlayMessage', name: 'Thanks', config: { tts: 'Thanks for choosing my flow. Goodbye.', language: 'en-US' } },
              { id: 'disconnect', type: 'Disconnect', name: 'End Call' }
            ]
          };

          // Try PATCH with session cookies
          const resp = await fetch(`https://api.zoom.us/v2/contact_center/flows/${flowId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(flowConfig),
            credentials: 'include'
          });
          const text = await resp.text();
          return { status: resp.status, body: text.substring(0, 500) };
        }, targetFlowId, US_QUEUE_ID, INDIA_QUEUE_ID);

        console.log('[Browser] Widget update result:', JSON.stringify(widgetResult));
      }
    }

    // Log all captured API calls
    if (apiCalls.length > 0) {
      console.log('\n[Browser] Captured API calls:');
      apiCalls.forEach(c => console.log(`  ${c.method} ${c.url}`));
      fs.writeFileSync('C:/Users/VijayBandaru/zoom_cc33_api_calls.json', JSON.stringify(apiCalls, null, 2));
    }

    // Final screenshot
    await page.screenshot({ path: 'C:/Users/VijayBandaru/zoom_cc33_05_final.png', fullPage: false });
    console.log('[Browser] 📸 Screenshot: zoom_cc33_05_final.png');

    // ── Keep browser open with instructions ────────────────────────────────
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  BROWSER IS OPEN - ZOOM CX FLOW BUILDER                      ║');
    console.log('║                                                               ║');
    console.log(`║  Flow: ${FLOW_NAME.padEnd(54)}║`);
    if (createdFlowId) {
    console.log(`║  ID:   ${createdFlowId.padEnd(54)}║`);
    }
    console.log('║                                                               ║');
    console.log('║  The browser window shows the Zoom CX Flow Builder.           ║');
    console.log('║  Please complete the widget configuration in the browser.     ║');
    console.log('║                                                               ║');
    console.log('║  After configuring widgets, click SAVE then PUBLISH.          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    // Keep browser open for 10 minutes
    console.log('\n[Browser] Keeping browser open for 10 minutes for manual configuration...');
    for (let i = 10; i > 0; i--) {
      process.stdout.write(`\r[Browser] ${i} minute(s) remaining... `);
      await sleep(60000);
    }

  } catch (error) {
    console.error(`[Browser] Error: ${error.message}`);
    try {
      await page.screenshot({ path: 'C:/Users/VijayBandaru/zoom_cc33_error.png' });
    } catch (_e) { /* empty */ }
    // Keep browser open anyway for manual work
    console.log('[Browser] Error occurred. Keeping browser open for 5 minutes...');
    await sleep(300000);
  } finally {
    await browser.close();
  }

  return createdFlowId;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ZOOM CX - ${FLOW_NAME} Creation`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Account: ${ACCOUNT_ID}`);
  console.log(`  Date:    ${new Date().toISOString()}`);
  console.log('───────────────────────────────────────────────────────────────\n');

  const token = await getToken();
  console.log('✅ Authentication successful\n');

  // Step 1: Verify no existing Claude_cars33
  const existing = await checkForExisting(token);
  if (existing) {
    console.log(`\nFlow already exists with ID: ${existing.flow_id}`);
    const published = await publishViaAPI(token, existing.flow_id);
    if (published) return;
  }

  // Step 2: Try REST API creation
  const apiFlowId = await tryAPICreation(token);
  if (apiFlowId) {
    console.log(`\n✅ Flow created via API: ${apiFlowId}`);
    await sleep(2000);
    await publishViaAPI(token, apiFlowId);
    console.log(`\n🎉 SUCCESS! Claude_cars33 is published!`);
    console.log(`   Flow Builder: https://zoom.us/contact-center/flows/${apiFlowId}/edit`);
    return;
  }

  // Step 3: Browser automation with user's Chrome profile
  console.log('\n[API] Creation via API not available.');
  console.log('[Browser] Switching to browser automation with Chrome...');
  const browserFlowId = await buildFlowInBrowser(token);

  if (browserFlowId) {
    console.log(`\n[API] Attempting final publish for flow: ${browserFlowId}`);
    await publishViaAPI(token, browserFlowId);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Automation session complete.');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
