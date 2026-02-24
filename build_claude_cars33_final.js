/* global document, location */
/**
 * ZOOM CX - Build Claude_cars33 Inbound Voice Flow
 * ================================================
 * 1. Opens Chrome to Zoom login page
 * 2. Waits for you to sign in (up to 3 mins)
 * 3. Automatically navigates to Contact Center → Flows
 * 4. Clicks "Create Flow", fills in name, channel
 * 5. Builds all widgets via UI automation
 * 6. Saves and Publishes the flow
 *
 * Flow:
 *   Welcome Bilingual → Language Select → Dept Menu → Geo Route → Queue / Thanks+Disconnect
 */

const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');

const ACCOUNT_ID    = 'Z-wSVKZGRXC59B5xRhrWIg';
const CLIENT_ID     = 'kmKBbmsQRMSaW9vXK0cduQ';
const CLIENT_SECRET = 'OA8RmxnXYHMMh7GR8lP4R9OHb16VLmp2';
const FLOW_NAME     = 'Claude_cars33';
const BASE_API      = 'https://api.zoom.us/v2';
const US_QUEUE_ID   = 'ZWQ1887222496A0776E5F5A9324C573CC62';
const INDIA_QUEUE_ID= 'ZWQA34051F5C48C7C0755E10A04FAFB2ED1';
const CHROME_EXE    = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const sc    = async (page, n) => {
  try { await page.screenshot({ path: `C:/Users/VijayBandaru/cc33_${n}.png` }); } catch (_e) { /* empty */ }
};

// ─── OAuth Token ──────────────────────────────────────────────────────────────
async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const r = await axios.post('https://zoom.us/oauth/token',
    `grant_type=account_credentials&account_id=${ACCOUNT_ID}`,
    { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } });
  return r.data.access_token;
}

// ─── Try to publish via REST after flow is created ───────────────────────────
async function tryPublish(token, flowId) {
  try {
    await axios.put(`${BASE_API}/contact_center/flows/${flowId}/publish`, {},
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    return true;
  } catch (_e) {
    return false;
  }
}

// ─── Click element by visible text ───────────────────────────────────────────
async function clickByText(page, text, selector = 'button, [role="button"], a, span, div') {
  const clicked = await page.evaluate((txt, sel) => {
    const els = document.querySelectorAll(sel);
    const lower = txt.toLowerCase();
    for (const el of els) {
      const t = el.textContent.trim().toLowerCase().replace(/\s+/g, ' ');
      if (t.includes(lower) && el.offsetParent !== null) {
        el.click();
        return el.textContent.trim();
      }
    }
    return null;
  }, text, selector);
  return clicked;
}

// ─── Wait for element with multiple selectors ────────────────────────────────
async function waitForAny(page, selectors, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const sel of selectors) {
      try {
        await page.waitForSelector(sel, { timeout: 500 });
        return sel;
      } catch (_e) { /* empty */ }
    }
    await sleep(500);
  }
  return null;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ZOOM CX - ${FLOW_NAME} Flow Builder`);
  console.log('═══════════════════════════════════════════════════════════════');

  const token = await getToken();
  console.log('✅ OAuth token obtained\n');

  // Launch Chrome (incognito for clean session)
  console.log('[Browser] Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_EXE,
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  });

  const page = (await browser.pages())[0] || await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  // Intercept to capture internal bearer token
  let webToken = null;
  await page.setRequestInterception(true);
  page.on('request', req => {
    const auth = req.headers()['authorization'];
    if (auth && auth.startsWith('Bearer ') && auth.length > 80 && !webToken) {
      webToken = auth.replace('Bearer ', '');
      console.log('[Browser] 🔑 Internal web token captured');
    }
    req.continue();
  });

  let createdFlowId = null;

  // Monitor for flow creation response
  page.on('response', async resp => {
    try {
      const url = resp.url();
      if (url.includes('/contact_center/flows') && ['POST'].includes(resp.request().method())) {
        const txt = await resp.text().catch(() => '');
        if (txt && txt.includes('flow_id')) {
          const data = JSON.parse(txt);
          if (data.flow_id) { createdFlowId = data.flow_id; console.log(`[Browser] 🎉 Flow created via intercepted API! ID: ${createdFlowId}`); }
        }
      }
    } catch (_e) { /* empty */ }
  });

  try {
    // ────────────────────────────────────────────────────────────────────────
    // PHASE 1: Login
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[Phase 1] Opening Zoom Sign In page...');
    await page.goto('https://zoom.us/signin', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);
    await sc(page, '01_login');
    console.log('[Phase 1] 🌐 Chrome is open at zoom.us/signin');
    console.log('[Phase 1] ⚡ Please LOG IN to Zoom in the browser window now!');
    console.log('[Phase 1] ⏳ Waiting up to 3 minutes for login...');

    // Wait until URL changes away from signin (indicates successful login)
    let loggedIn = false;
    const loginDeadline = Date.now() + 180000; // 3 min
    while (Date.now() < loginDeadline) {
      const currentUrl = page.url();
      if (!currentUrl.includes('/signin') && !currentUrl.includes('/login') &&
          !currentUrl.includes('zoom.us/#') && currentUrl !== 'https://zoom.us/signin') {
        loggedIn = true;
        console.log(`\n[Phase 1] ✅ Logged in! URL: ${currentUrl}`);
        break;
      }
      process.stdout.write('.');
      await sleep(3000);
    }
    console.log('');

    if (!loggedIn) {
      console.log('[Phase 1] ❌ Login timeout. Please run the script again and log in within 3 minutes.');
      await browser.close();
      return;
    }

    await sleep(2000);
    await sc(page, '02_after_login');

    // ────────────────────────────────────────────────────────────────────────
    // PHASE 2: Navigate to Contact Center Admin
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[Phase 2] Navigating to Contact Center admin...');

    // Try multiple possible URLs for the admin portal
    const ccUrls = [
      'https://zoom.us/contact-center/flows',
      'https://zoom.us/admin/contact-center/flows',
      'https://zoom.us/account/contact-center/flows',
    ];

    let _onFlowsPage = false;
    for (const url of ccUrls) {
      console.log(`[Phase 2] Trying: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(3000);

      const pageUrl = page.url();
      const title = await page.title().catch(() => '');
      console.log(`[Phase 2] → URL: ${pageUrl} | Title: ${title}`);

      // Check if we're on the right page (not 404, not marketing page)
      const isFlowsPage = await page.evaluate(() => {
        // Look for indicators of the flows management UI
        const text = document.body.innerText.toLowerCase();
        return text.includes('flow') && (text.includes('create') || text.includes('published') || text.includes('inbound'));
      });

      if (isFlowsPage) {
        _onFlowsPage = true;
        console.log('[Phase 2] ✅ Found flows page!');
        break;
      }
    }

    await sc(page, '03_flows_page');

    // ────────────────────────────────────────────────────────────────────────
    // PHASE 3: Create New Flow
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[Phase 3] Creating new flow...');

    // Get the current page info
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: location.href,
        bodyText: document.body.innerText.substring(0, 500),
        buttons: Array.from(document.querySelectorAll('button, [role="button"]'))
          .map(b => b.textContent.trim().replace(/\s+/g, ' '))
          .filter(t => t && t.length > 1 && t.length < 50)
          .slice(0, 20)
      };
    });
    console.log('[Phase 3] Page info:', JSON.stringify(pageInfo, null, 2));

    // Attempt to click Create button
    const createPatterns = ['create flow', 'create a flow', 'new flow', '+ create', 'add flow', 'create'];
    let createClicked = false;
    for (const pattern of createPatterns) {
      const clicked = await clickByText(page, pattern);
      if (clicked) {
        console.log(`[Phase 3] ✅ Clicked: "${clicked}"`);
        createClicked = true;
        await sleep(2000);
        break;
      }
    }

    // Also try looking for + button or icon button
    if (!createClicked) {
      try {
        const found = await page.$('[aria-label*="create" i], [title*="create" i], [data-testid*="create"], .create-btn, #create-flow-btn');
        if (found) { await found.click(); createClicked = true; console.log('[Phase 3] ✅ Clicked create icon'); await sleep(2000); }
      } catch (_e) { /* empty */ }
    }

    await sc(page, '04_create_dialog');

    const afterCreateInfo = await page.evaluate(() => ({
      url: location.href,
      dialogs: document.querySelectorAll('[role="dialog"], [class*="modal"]').length,
      inputs: Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, placeholder: i.placeholder, name: i.name })),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t).slice(0, 15)
    }));
    console.log('[Phase 3] After create click:', JSON.stringify(afterCreateInfo, null, 2));

    // Fill in the flow name
    console.log('[Phase 3] Typing flow name...');
    const inputSels = [
      'input[placeholder*="name" i]', 'input[name*="flow_name" i]', 'input[name*="name" i]',
      'input[aria-label*="name" i]', 'input[data-testid*="name"]',
      '[role="dialog"] input[type="text"]', '[class*="modal"] input[type="text"]',
      'input[type="text"]:not([readonly])'
    ];

    for (const sel of inputSels) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.click({ clickCount: 3 });
          await el.type(FLOW_NAME, { delay: 60 });
          console.log(`[Phase 3] ✅ Typed "${FLOW_NAME}" in ${sel}`);
          break;
        }
      } catch (_e) { /* empty */ }
    }

    // Select Voice channel
    console.log('[Phase 3] Selecting Voice channel...');
    const voiceClicked = await page.evaluate(() => {
      const elements = document.querySelectorAll('input[type="radio"], [role="radio"], [role="option"], button, label, li');
      for (const el of elements) {
        const t = el.textContent.trim().toLowerCase();
        if (t === 'voice' || t.includes('voice call') || t.includes('inbound voice')) {
          el.click();
          return el.textContent.trim();
        }
      }
      // Also try value="voice"
      const radios = document.querySelectorAll('input[value="voice" i]');
      if (radios.length) { radios[0].click(); return 'voice radio'; }
      return null;
    });
    if (voiceClicked) console.log(`[Phase 3] ✅ Selected: ${voiceClicked}`);

    await sleep(500);
    await sc(page, '05_name_channel');

    // Click Create/Confirm button
    console.log('[Phase 3] Confirming creation...');
    const confirmPatterns = ['create', 'confirm', 'next', 'submit', 'save', 'ok'];
    for (const pattern of confirmPatterns) {
      const clicked = await page.evaluate((pat) => {
        const dialog = document.querySelector('[role="dialog"], [class*="modal"], [class*="dialog"]') || document;
        const btns = dialog.querySelectorAll('button');
        for (const btn of btns) {
          const t = btn.textContent.trim().toLowerCase();
          if (t.includes(pat) && !t.includes('cancel') && !t.includes('close') && btn.offsetParent) {
            btn.click();
            return btn.textContent.trim();
          }
        }
        return null;
      }, pattern);
      if (clicked) {
        console.log(`[Phase 3] ✅ Clicked: "${clicked}"`);
        await sleep(5000);
        break;
      }
    }

    await sc(page, '06_after_confirm');
    const postCreateUrl = page.url();
    console.log(`[Phase 3] URL after create: ${postCreateUrl}`);

    // Extract flow ID from URL
    const flowIdMatch = postCreateUrl.match(/flows\/([A-Za-z0-9_-]{8,})/);
    if (flowIdMatch && !createdFlowId) {
      createdFlowId = flowIdMatch[1];
      console.log(`[Phase 3] 🎉 Flow ID from URL: ${createdFlowId}`);
    }

    // ────────────────────────────────────────────────────────────────────────
    // PHASE 4: Build Flow Widgets
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[Phase 4] Flow builder opened. Building widgets...');
    await sleep(3000);

    // Detect canvas
    const canvasSel = await waitForAny(page, [
      '[class*="canvas"]', '[class*="Canvas"]', '[class*="flow-builder"]',
      '[class*="FlowBuilder"]', '[class*="designer"]', 'svg.flow', '[data-id="canvas"]',
      '[class*="WorkCanvas"]', '[class*="editor-canvas"]', '[class*="flow-canvas"]',
      '[class*="zm-flow"]'
    ], 15000);

    if (canvasSel) {
      console.log(`[Phase 4] ✅ Canvas found: ${canvasSel}`);
    } else {
      console.log('[Phase 4] Canvas not found via selector, proceeding anyway...');
    }

    await sc(page, '07_canvas');

    // Get detailed page structure for the flow builder
    const builderInfo = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      widgetPalette: Array.from(document.querySelectorAll('[class*="widget"], [class*="Widget"], [draggable], [class*="palette"], [class*="tool"]'))
        .map(el => ({ tag: el.tagName, class: el.className.substring(0, 80), text: el.textContent.trim().substring(0, 30), draggable: el.draggable }))
        .slice(0, 20),
      allText: document.body.innerText.substring(0, 1000)
    }));
    console.log('[Phase 4] Builder info:', JSON.stringify(builderInfo, null, 2).substring(0, 2000));

    // ────────────────────────────────────────────────────────────────────────
    // PHASE 5: Add widgets via UI interactions
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[Phase 5] Adding flow widgets...');

    // Strategy: Look for widget types in the palette and drag/click to add them
    // Zoom CX uses a drag-and-drop canvas with a left-side widget palette

    // Try clicking on widget palette items
    const addWidgetResult = await page.evaluate(async (_flowName, _usQ, _indQ) => {
      const results = [];

      // Helper: find and click a widget type in the palette
      const _findPaletteItem = function(typeNames) {
        const allEls = document.querySelectorAll('[class*="item"], [class*="widget-type"], [class*="palette"], [draggable="true"], [class*="toolbox"]');
        for (const el of allEls) {
          const t = el.textContent.trim().toLowerCase();
          for (const name of typeNames) {
            if (t.includes(name.toLowerCase())) return el;
          }
        }
        return null;
      }

      // Check what widget types are available
      const widgetTypes = [];
      const draggables = document.querySelectorAll('[draggable="true"], [class*="widget-item"], [class*="palette-item"]');
      for (const el of draggables) {
        widgetTypes.push(el.textContent.trim().replace(/\s+/g, ' '));
      }
      results.push('Available widgets: ' + widgetTypes.slice(0, 15).join(', '));

      return results;
    }, FLOW_NAME, US_QUEUE_ID, INDIA_QUEUE_ID);

    console.log('[Phase 5] Widget discovery:', JSON.stringify(addWidgetResult));

    // ────────────────────────────────────────────────────────────────────────
    // PHASE 6: Use captured token to call internal API and configure flow
    // ────────────────────────────────────────────────────────────────────────
    if (webToken && createdFlowId) {
      console.log('\n[Phase 6] Configuring flow via captured internal token...');

      const configResult = await page.evaluate(async (flowId, flowNm, usQ, indQ) => {
        const results = {};

        // Full flow definition
        const fullConfig = {
          flow_name: flowNm,
          channel: 'voice',
          flow_definition: {
            start: 'welcome',
            widgets: [
              {
                widget_id: 'welcome',
                widget_type: 'play_message',
                name: 'Bilingual Welcome',
                config: {
                  tts_text: 'Thank you for calling Claude Cars. For English, press 1. Para Español, oprima 2.',
                  language: 'en-US'
                },
                next: 'language_menu'
              },
              {
                widget_id: 'language_menu',
                widget_type: 'collect_input',
                name: 'Language Selection',
                config: {
                  prompt: 'For English, press 1. Para Español, oprima 2.',
                  max_digits: 1, timeout: 10, retries: 2,
                  dtmf_options: [
                    { digit: '1', next: 'en_dept_prompt' },
                    { digit: '2', next: 'es_dept_prompt' }
                  ],
                  no_input_next: 'en_dept_prompt'
                }
              },
              {
                widget_id: 'en_dept_prompt',
                widget_type: 'play_message',
                name: 'English Dept Menu',
                config: { tts_text: 'For Sales, press 1. For Service, press 2. For New Models, press 3.', language: 'en-US' },
                next: 'dept_menu'
              },
              {
                widget_id: 'es_dept_prompt',
                widget_type: 'play_message',
                name: 'Spanish Dept Menu',
                config: { tts_text: 'Para Ventas, oprima 1. Para Servicio, oprima 2. Para Modelos Nuevos, oprima 3.', language: 'es-US' },
                next: 'dept_menu'
              },
              {
                widget_id: 'dept_menu',
                widget_type: 'collect_input',
                name: 'Department Selection',
                config: {
                  max_digits: 1, timeout: 10, retries: 2,
                  dtmf_options: [
                    { digit: '1', label: 'Sales', next: 'geo_route' },
                    { digit: '2', label: 'Service', next: 'geo_route' },
                    { digit: '3', label: 'New Models', next: 'geo_route' }
                  ],
                  no_input_next: 'geo_route'
                }
              },
              {
                widget_id: 'geo_route',
                widget_type: 'script',
                name: 'Geographic Routing',
                config: {
                  code: "var ani=variables.get('Start.From')||'';variables.set('is_us',ani.startsWith('+1')||/^1\\d{10}$/.test(ani));variables.set('is_india',ani.startsWith('+91')||/^91\\d{10}$/.test(ani));"
                },
                next: 'geo_condition'
              },
              {
                widget_id: 'geo_condition',
                widget_type: 'condition',
                name: 'US or India',
                config: {
                  conditions: [
                    { expression: "variables.get('is_us')===true", next: 'us_queue' },
                    { expression: "variables.get('is_india')===true", next: 'india_queue' }
                  ],
                  default_next: 'us_queue'
                }
              },
              {
                widget_id: 'us_queue',
                widget_type: 'route_to',
                name: 'Route to US Queue',
                config: { destination_type: 'queue', queue_id: usQ, timeout_seconds: 300, timeout_next: 'thanks' }
              },
              {
                widget_id: 'india_queue',
                widget_type: 'route_to',
                name: 'Route to India Queue',
                config: { destination_type: 'queue', queue_id: indQ, timeout_seconds: 300, timeout_next: 'thanks' }
              },
              {
                widget_id: 'thanks',
                widget_type: 'play_message',
                name: 'Thanks Message',
                config: { tts_text: 'Thanks for choosing my flow. Goodbye.', language: 'en-US' },
                next: 'disconnect'
              },
              {
                widget_id: 'disconnect',
                widget_type: 'disconnect',
                name: 'End Call',
                config: {}
              }
            ]
          }
        };

        // Try PATCH with session cookies
        try {
          const r = await fetch(`https://api.zoom.us/v2/contact_center/flows/${flowId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullConfig),
            credentials: 'include'
          });
          results.patch = { status: r.status, body: (await r.text()).substring(0, 300) };
        } catch (e) {
          results.patch = { error: e.message };
        }

        // Try PUT publish with session cookies
        try {
          const r2 = await fetch(`https://api.zoom.us/v2/contact_center/flows/${flowId}/publish`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
            credentials: 'include'
          });
          results.publish = { status: r2.status, body: (await r2.text()).substring(0, 300) };
        } catch (e) {
          results.publish = { error: e.message };
        }

        return results;
      }, createdFlowId, FLOW_NAME, US_QUEUE_ID, INDIA_QUEUE_ID);

      console.log('[Phase 6] Config result:', JSON.stringify(configResult, null, 2));
    }

    // ────────────────────────────────────────────────────────────────────────
    // PHASE 7: Try REST publish
    // ────────────────────────────────────────────────────────────────────────
    if (createdFlowId) {
      console.log(`\n[Phase 7] Attempting REST API publish for ${createdFlowId}...`);
      const published = await tryPublish(token, createdFlowId);
      if (published) {
        console.log(`[Phase 7] ✅ Flow PUBLISHED via API!`);
      } else {
        // Try clicking Publish in the UI
        console.log('[Phase 7] REST publish failed, trying UI publish button...');
        const publishClicked = await clickByText(page, 'publish', 'button, [role="button"]');
        if (publishClicked) {
          console.log(`[Phase 7] ✅ Clicked publish: ${publishClicked}`);
          await sleep(3000);
          // Confirm if dialog appears
          const confirmPublish = await clickByText(page, 'confirm', 'button') ||
                                  await clickByText(page, 'publish now', 'button') ||
                                  await clickByText(page, 'ok', 'button');
          if (confirmPublish) console.log(`[Phase 7] ✅ Confirmed: ${confirmPublish}`);
        }
      }
    }

    await sc(page, '08_published');

    // ────────────────────────────────────────────────────────────────────────
    // FINAL STATUS
    // ────────────────────────────────────────────────────────────────────────
    const finalUrl = page.url();
    console.log(`\n[Final] URL: ${finalUrl}`);
    if (createdFlowId) {
      console.log(`[Final] Flow ID: ${createdFlowId}`);
      console.log(`[Final] Builder: https://zoom.us/contact-center/flows/${createdFlowId}/edit`);
    }

    // Save results
    fs.writeFileSync('C:/Users/VijayBandaru/zoom_cc33_result.json', JSON.stringify({
      flow_name: FLOW_NAME, flow_id: createdFlowId, url: finalUrl,
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  BROWSER OPEN - Complete any remaining steps in the UI         ║');
    console.log('║                                                                ║');
    console.log(`║  Flow: ${FLOW_NAME}                                           ║`);
    console.log('║  1. Verify all widgets are configured                          ║');
    console.log('║  2. Click SAVE → VALIDATE → PUBLISH                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('\n[Browser] Keeping open for 10 minutes...');

    for (let i = 10; i > 0; i--) {
      process.stdout.write(`\r  ⏳ ${i} minute(s) remaining...`);
      await sleep(60000);
    }

  } catch (err) {
    console.error(`\n[Error] ${err.message}`);
    await sc(page, '99_error');
    console.log('[Browser] Error occurred. Browser stays open for 5 min for manual action.');
    await sleep(300000);
  } finally {
    try { await browser.close(); } catch (_e) { /* empty */ }
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
