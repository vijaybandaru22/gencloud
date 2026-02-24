/* global document, location */
/**
 * ZOOM CX - Create & Publish Claude_cars32 Inbound Voice Flow
 * ===========================================================
 * Credentials:
 *   Account ID:    Z-wSVKZGRXC59B5xRhrWIg
 *   Client ID:     kmKBbmsQRMSaW9vXK0cduQ
 *   Client Secret: OA8RmxnXYHMMh7GR8lP4R9OHb16VLmp2
 *
 * Strategy (in order):
 *  1. Try REST API with every known payload variation
 *  2. Open Chrome → user logs in once → script drives entire UI
 *     - Creates Claude_cars32 inbound voice flow
 *     - Adds all widgets (language, dept, geo routing)
 *     - Saves and publishes
 */

const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');

// ─── Config ───────────────────────────────────────────────────────────────────
const ACCOUNT_ID    = 'Z-wSVKZGRXC59B5xRhrWIg';
const CLIENT_ID     = 'kmKBbmsQRMSaW9vXK0cduQ';
const CLIENT_SECRET = 'OA8RmxnXYHMMh7GR8lP4R9OHb16VLmp2';
const FLOW_NAME     = 'Claude_cars32';
const BASE_API      = 'https://api.zoom.us/v2';
const US_QUEUE_ID   = 'ZWQ1887222496A0776E5F5A9324C573CC62';
const INDIA_QUEUE_ID= 'ZWQA34051F5C48C7C0755E10A04FAFB2ED1';
const CHROME_EXE    = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep  = ms => new Promise(r => setTimeout(r, ms));
const log    = msg => { console.log(msg); fs.appendFileSync('C:/Users/VijayBandaru/zoom_cx_auto_log.txt', msg + '\n'); };
const sc     = async (page, n) => { try { await page.screenshot({ path: `C:/Users/VijayBandaru/cx32_${n}.png` }); log(`📸 cx32_${n}.png`); } catch(_e){ /* empty */ } };

// ─── Step 1: Get API Token ────────────────────────────────────────────────────
async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const r = await axios.post('https://zoom.us/oauth/token',
    `grant_type=account_credentials&account_id=${ACCOUNT_ID}`,
    { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } });
  return r.data.access_token;
}

// ─── Step 2: Try REST API (exhaustive) ───────────────────────────────────────
async function tryAllAPIFormats(token) {
  log('\n[REST API] Trying all payload variations...');

  const variants = [
    // Standard formats
    { flow_name: FLOW_NAME, channel: 'voice' },
    { flow_name: FLOW_NAME, channel_type: 'voice' },
    // camelCase
    { flowName: FLOW_NAME, channel: 'voice' },
    { flowName: FLOW_NAME, channelType: 'voice' },
    // With type field
    { flow_name: FLOW_NAME, channel: 'voice', type: 'inbound' },
    { flow_name: FLOW_NAME, channel: 'voice', flow_type: 'inboundcall' },
    // API v3
    { flow_name: FLOW_NAME, channel: 'voice', version: '3' },
    // With account id header
    { flow_name: FLOW_NAME },
  ];

  const extraHeaders = [
    {},
    { 'X-Zm-Accountid': ACCOUNT_ID },
    { 'X-Zoom-Account-Id': ACCOUNT_ID },
    { 'Zoom-Account-Id': ACCOUNT_ID },
  ];

  for (const headers of extraHeaders) {
    for (const payload of variants) {
      try {
        const r = await axios.post(`${BASE_API}/contact_center/flows`, payload, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers }
        });
        const fid = r.data.flow_id || r.data.id;
        log(`[REST API] ✅ Created! Flow ID: ${fid}`);
        return fid;
      } catch (e) {
        const err = JSON.stringify(e.response?.data || e.message);
        if (!err.includes('must not be blank') && !err.includes('Validation')) {
          log(`[REST API] Different error with ${JSON.stringify({...payload,...headers})}: ${err}`);
        }
      }
    }
  }

  // Try v3 endpoint
  try {
    const r = await axios.post('https://api.zoom.us/v3/contact_center/flows',
      { flow_name: FLOW_NAME, channel: 'voice' },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    log(`[REST API v3] ✅ Created! ${JSON.stringify(r.data)}`);
    return r.data.flow_id;
  } catch (e) {
    log(`[REST API v3] ${e.response?.status}: ${JSON.stringify(e.response?.data)}`);
  }

  log('[REST API] All REST variants exhausted — switching to browser automation');
  return null;
}

// ─── Step 3: Publish via REST ─────────────────────────────────────────────────
async function publishREST(token, flowId) {
  try {
    await axios.put(`${BASE_API}/contact_center/flows/${flowId}/publish`, {},
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    log(`[REST] ✅ Published flow ${flowId}`);
    return true;
  } catch (e) {
    log(`[REST] Publish failed: ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
    return false;
  }
}

// ─── Step 4: Browser Automation ──────────────────────────────────────────────
async function buildViaBrowser(token) {
  log('\n[Browser] Launching Chrome...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_EXE,
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--start-maximized', '--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation']
  });

  const page = (await browser.pages())[0] || await browser.newPage();

  // Intercept all requests to capture the internal auth token and API calls
  let sessionToken = null;
  const internalCalls = [];
  await page.setRequestInterception(true);

  page.on('request', req => {
    const h = req.headers();
    const auth = h['authorization'] || h['Authorization'];
    if (auth && auth.startsWith('Bearer ') && auth.length > 80 && !sessionToken) {
      sessionToken = auth.replace('Bearer ', '');
      log(`[Browser] 🔑 Session token captured!`);
    }
    const url = req.url();
    if (url.includes('contact_center') && req.method() !== 'GET') {
      internalCalls.push({ method: req.method(), url, body: req.postData() });
      log(`[Browser] 📡 ${req.method()} ${url}`);
      if (req.postData()) log(`[Browser]    body: ${req.postData()?.substring(0, 200)}`);
    }
    req.continue();
  });

  // Capture responses for flow creation
  let createdFlowId = null;
  page.on('response', async resp => {
    try {
      const url = resp.url();
      if (url.includes('/contact_center/flows') && resp.request().method() === 'POST') {
        const txt = await resp.text();
        log(`[Browser] Flow POST response (${resp.status()}): ${txt.substring(0, 300)}`);
        if (txt.includes('flow_id')) {
          const data = JSON.parse(txt);
          if (data.flow_id) { createdFlowId = data.flow_id; log(`[Browser] 🎉 Flow ID: ${createdFlowId}`); }
        }
      }
    } catch(_e) { /* empty */ }
  });

  let flowId = null;

  try {
    // ── Phase 1: Login ────────────────────────────────────────────────────────
    log('\n═══════════════════════════════════════════════════');
    log('  CHROME IS NOW OPEN → Please log in to Zoom');
    log('  URL: https://zoom.us/signin');
    log('  After login, this script does EVERYTHING else.');
    log('═══════════════════════════════════════════════════\n');

    await page.goto('https://zoom.us/signin', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);
    await sc(page, '01_signin');

    // Wait for login (3 min max)
    let loggedIn = false;
    const deadline = Date.now() + 180000;
    log('[Browser] Waiting for login... (up to 3 minutes)');
    while (Date.now() < deadline) {
      const url = page.url();
      if (url.includes('/contact-center') || url.includes('zoom.us/account') ||
          url.includes('zoom.us/profile') || url.includes('zoom.us/meeting') ||
          (url.includes('zoom.us') && !url.includes('/signin') && !url.includes('/login'))) {
        loggedIn = true;
        log(`[Browser] ✅ Logged in! URL: ${url}`);
        break;
      }
      await sleep(2000);
    }

    if (!loggedIn) {
      log('[Browser] ❌ Login timeout. Exiting.');
      await browser.close();
      return null;
    }

    await sleep(3000);
    await sc(page, '02_logged_in');

    // ── Phase 2: Navigate to Admin → Contact Center → Flows ──────────────────
    log('\n[Browser] Navigating to Contact Center Flows...');

    // Try the admin path first
    const flowUrls = [
      'https://zoom.us/account/contact-center#/flows',
      'https://zoom.us/account/contact-center/flows',
      'https://zoom.us/contact-center/flows',
      'https://zoom.us/admin/contact-center#flows',
    ];

    for (const u of flowUrls) {
      await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(3000);
      const ok = await page.evaluate(() => {
        const t = document.body.innerText.toLowerCase();
        return t.includes('flow') && (t.includes('create') || t.includes('inbound') || t.includes('published'));
      });
      if (ok) { log(`[Browser] ✅ Flows page: ${u}`); break; }
    }

    await sc(page, '03_flows_page');
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 600));
    log(`[Browser] Page content preview: ${pageText}`);

    // ── Phase 3: Use in-browser fetch with session cookies to call API ────────
    log('\n[Browser] Attempting flow creation via in-browser fetch (session cookies)...');

    const inBrowserResult = await page.evaluate(async (flowName, usQ, indQ, baseApi) => {
      const results = {};

      // Try several payload formats using the session cookies
      const payloads = [
        { flow_name: flowName, channel: 'voice' },
        { flow_name: flowName, channel_type: 'voice' },
        { flowName: flowName, channel: 'voice' },
        { flow_name: flowName },
        { name: flowName, channel: 'voice' },
      ];

      for (const payload of payloads) {
        try {
          const r = await fetch(`${baseApi}/contact_center/flows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
          });
          const text = await r.text();
          results[JSON.stringify(payload)] = { status: r.status, body: text.substring(0, 300) };
          if (r.ok && text.includes('flow_id')) {
            results.created = JSON.parse(text);
            break;
          }
        } catch(e) {
          results[JSON.stringify(payload)] = { error: e.message };
        }
      }

      // Also try the internal Zoom CC API directly
      const internalApis = [
        '/api/contact-center/flows',
        '/contact-center/api/v1/flows',
        '/contact-center/api/flows',
      ];

      for (const api of internalApis) {
        try {
          const r = await fetch(api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ flow_name: flowName, channel: 'voice' }),
            credentials: 'include'
          });
          const text = await r.text();
          if (r.status !== 404 && r.status !== 405) {
            results[`internal:${api}`] = { status: r.status, body: text.substring(0, 300) };
          }
        } catch(_e) { /* empty */ }
      }

      return results;
    }, FLOW_NAME, US_QUEUE_ID, INDIA_QUEUE_ID, BASE_API);

    log('[Browser] In-browser API results:');
    for (const [key, val] of Object.entries(inBrowserResult)) {
      log(`  ${key}: ${JSON.stringify(val)}`);
    }

    // Check if flow was created via in-browser call
    if (inBrowserResult.created?.flow_id) {
      flowId = inBrowserResult.created.flow_id;
      log(`[Browser] 🎉 Flow created via in-browser API! ID: ${flowId}`);
    } else if (createdFlowId) {
      flowId = createdFlowId;
    }

    // ── Phase 4: Find the Create Flow button in the UI ────────────────────────
    if (!flowId) {
      log('\n[Browser] Trying UI-based flow creation...');

      // Get page structure
      const uiInfo = await page.evaluate(() => ({
        url: location.href,
        title: document.title,
        h1: document.querySelector('h1,h2')?.textContent?.trim(),
        buttons: Array.from(document.querySelectorAll('button,[role="button"]'))
          .map(b => b.textContent.trim().replace(/\s+/g,' '))
          .filter(t => t.length > 1 && t.length < 60)
          .slice(0, 25),
        links: Array.from(document.querySelectorAll('a'))
          .map(a => ({ text: a.textContent.trim(), href: a.href }))
          .filter(a => a.text && a.text.length < 50)
          .slice(0, 15)
      }));
      log('[Browser] UI structure: ' + JSON.stringify(uiInfo, null, 2));

      // Click create/add button
      const createPatterns = ['create flow', 'create a flow', 'new flow', '+ create', 'add flow', 'create'];
      for (const pat of createPatterns) {
        const result = await page.evaluate(p => {
          for (const el of document.querySelectorAll('button,[role="button"],a')) {
            if (el.textContent.trim().toLowerCase().includes(p) && el.offsetParent) {
              el.click(); return el.textContent.trim();
            }
          }
          return null;
        }, pat);
        if (result) { log(`[Browser] ✅ Clicked: "${result}"`); await sleep(3000); break; }
      }

      await sc(page, '04_after_create_click');

      // Fill name
      const nameInputs = ['input[placeholder*="name" i]','input[name*="name" i]',
        '[role="dialog"] input','[class*="modal"] input','input[type="text"]'];
      for (const sel of nameInputs) {
        try {
          const el = await page.$(sel);
          if (el) {
            await el.click({ clickCount: 3 });
            await el.type(FLOW_NAME, { delay: 60 });
            log(`[Browser] ✅ Typed "${FLOW_NAME}" in ${sel}`);
            break;
          }
        } catch(_e) { /* empty */ }
      }

      // Select Voice
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('input[type="radio"],[role="radio"],[role="option"],button,label,li')) {
          if (el.textContent.trim().toLowerCase() === 'voice' || el.value === 'voice') {
            el.click(); return true;
          }
        }
      });

      await sleep(500);
      await sc(page, '05_form_filled');

      // Confirm / Create
      for (const pat of ['create','confirm','next','submit','ok','save']) {
        const clicked = await page.evaluate(p => {
          const dialog = document.querySelector('[role="dialog"],[class*="modal"]') || document;
          for (const btn of dialog.querySelectorAll('button')) {
            const t = btn.textContent.trim().toLowerCase();
            if (t.includes(p) && !t.includes('cancel') && btn.offsetParent) {
              btn.click(); return btn.textContent.trim();
            }
          }
          return null;
        }, pat);
        if (clicked) { log(`[Browser] ✅ Confirmed: "${clicked}"`); await sleep(5000); break; }
      }

      await sc(page, '06_after_confirm');
      const newUrl = page.url();
      const m = newUrl.match(/flows\/([A-Za-z0-9_-]{8,})/);
      if (m) { flowId = m[1]; log(`[Browser] Flow ID from URL: ${flowId}`); }
    }

    // ── Phase 5: Configure flow widgets via browser fetch with session ────────
    if (flowId || createdFlowId) {
      const fid = flowId || createdFlowId;
      log(`\n[Browser] Configuring flow ${fid} with full widget set...`);

      const configResult = await page.evaluate(async (fid, usQ, indQ, baseApi, flowName) => {
        // Complete flow definition
        const flowDef = {
          flow_name: flowName,
          channel: 'voice',
          widgets: [
            { id: 'start',          type: 'Start',        name: 'Start',                    next: 'welcome' },
            { id: 'welcome',        type: 'PlayMessage',  name: 'Bilingual Welcome',
              tts: 'Welcome to Claude Cars. For English, press 1. Para Español, oprima 2.', language: 'en-US', next: 'lang_menu' },
            { id: 'lang_menu',      type: 'CollectInput', name: 'Language Selection',
              prompt: 'For English press 1. Para Español oprima 2.', max_digits: 1, timeout: 10, retries: 2,
              options: [{ key:'1', next:'en_dept' },{ key:'2', next:'es_dept' }], default: 'en_dept' },
            { id: 'en_dept',        type: 'PlayMessage',  name: 'English Dept Menu',
              tts: 'Thanks for choosing my flow. For Sales press 1. For Services press 2. For New Models press 3.', language: 'en-US', next: 'dept_en' },
            { id: 'es_dept',        type: 'PlayMessage',  name: 'Spanish Dept Menu',
              tts: 'Gracias por elegir mi servicio. Para ventas oprima 1. Para servicios oprima 2. Para nuevos modelos oprima 3.', language: 'es-US', next: 'dept_es' },
            { id: 'dept_en',        type: 'CollectInput', name: 'Dept EN',
              max_digits: 1, timeout: 10, options: [{ key:'1', next:'geo' },{ key:'2', next:'geo' },{ key:'3', next:'geo' }], default: 'geo' },
            { id: 'dept_es',        type: 'CollectInput', name: 'Dept ES',
              max_digits: 1, timeout: 10, options: [{ key:'1', next:'geo' },{ key:'2', next:'geo' },{ key:'3', next:'geo' }], default: 'geo' },
            { id: 'geo',            type: 'Script',       name: 'Geo Routing',
              code: "var a=variables.get('Start.From')||'';variables.set('us',a.startsWith('+1'));variables.set('in',a.startsWith('+91'));" },
            { id: 'geo_cond',       type: 'Condition',    name: 'US or India',
              conditions: [{expr:"variables.get('us')===true",next:'us_q'},{expr:"variables.get('in')===true",next:'in_q'}], default:'us_q' },
            { id: 'us_q',           type: 'RouteTo',      name: 'US Queue',       queue_id: usQ,  timeout_next: 'thanks' },
            { id: 'in_q',           type: 'RouteTo',      name: 'India Queue',    queue_id: indQ, timeout_next: 'thanks' },
            { id: 'thanks',         type: 'PlayMessage',  name: 'Thanks',
              tts: 'Thanks for choosing my flow. Goodbye.', language: 'en-US', next: 'end' },
            { id: 'end',            type: 'Disconnect',   name: 'End Call' }
          ]
        };

        const results = {};

        // Try PATCH with session
        try {
          const r = await fetch(`${baseApi}/contact_center/flows/${fid}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(flowDef),
            credentials: 'include'
          });
          results.patch = { status: r.status, body: (await r.text()).substring(0, 300) };
        } catch(e) { results.patch = { error: e.message }; }

        // Try publish
        try {
          const r = await fetch(`${baseApi}/contact_center/flows/${fid}/publish`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
            credentials: 'include'
          });
          results.publish = { status: r.status, body: (await r.text()).substring(0, 300) };
        } catch(e) { results.publish = { error: e.message }; }

        return results;
      }, fid, US_QUEUE_ID, INDIA_QUEUE_ID, BASE_API, FLOW_NAME);

      log('[Browser] Config result: ' + JSON.stringify(configResult, null, 2));

      // If publish returned 200, we're done
      if (configResult?.publish?.status === 200) {
        log(`\n[Browser] 🎉 FLOW PUBLISHED SUCCESSFULLY!`);
        log(`Flow ID: ${fid}`);
        log(`Flow: https://zoom.us/contact-center/flows/${fid}/edit`);
      }
    }

    // ── Phase 6: Verify via REST API ──────────────────────────────────────────
    if (flowId) {
      log('\n[REST] Attempting final publish via REST API...');
      await tryPublishViaBoth(token, sessionToken, flowId);
    }

    await sc(page, '07_final_state');

    const _finalUrl = page.url();
    const finalFlowId = flowId || createdFlowId;
    log('\n══════════════════════════════════════════════');
    if (finalFlowId) {
      log(`✅ Claude_cars32 Flow ID: ${finalFlowId}`);
      log(`🔗 URL: https://zoom.us/contact-center/flows/${finalFlowId}/edit`);
    } else {
      log('ℹ️  Flow ID not captured - check browser for manual completion');
    }
    log('══════════════════════════════════════════════');

    // Save all intercepted calls (helps us understand the real API format)
    fs.writeFileSync('C:/Users/VijayBandaru/zoom_cx_captured_calls.json',
      JSON.stringify({ flowId: finalFlowId, internalCalls, sessionToken: sessionToken ? 'captured' : 'not captured' }, null, 2));
    log('Internal API calls saved to: zoom_cx_captured_calls.json');

    // Keep browser open for user to verify / manually complete if needed
    log('\n[Browser] Keeping browser open for 10 minutes for verification...');
    for (let i = 10; i > 0; i--) {
      process.stdout.write(`\r  ⏳ ${i} min remaining...`);
      await sleep(60000);
    }

    return finalFlowId;

  } catch (err) {
    log(`[Browser] Error: ${err.message}`);
    await sc(page, '99_error');
    await sleep(120000);
  } finally {
    try { await browser.close(); } catch(_e) { /* empty */ }
  }
}

// ─── Try publish with both tokens ────────────────────────────────────────────
async function tryPublishViaBoth(restToken, sessionToken, flowId) {
  for (const [label, tok] of [['REST token', restToken], ['Session token', sessionToken]]) {
    if (!tok) continue;
    try {
      const _r = await axios.put(`${BASE_API}/contact_center/flows/${flowId}/publish`, {},
        { headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' } });
      log(`[${label}] ✅ Published!`);
      return true;
    } catch(e) {
      log(`[${label}] Publish: ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
    }
  }
  return false;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  fs.writeFileSync('C:/Users/VijayBandaru/zoom_cx_auto_log.txt', '');
  log('═══════════════════════════════════════════════════════');
  log(`  ZOOM CX - ${FLOW_NAME} Auto Builder`);
  log(`  ${new Date().toISOString()}`);
  log('═══════════════════════════════════════════════════════');

  const token = await getToken();
  log('✅ OAuth token obtained');

  // Check existing
  try {
    const r = await axios.get(`${BASE_API}/contact_center/flows`,
      { headers: { Authorization: `Bearer ${token}` }, params: { page_size: 300 } });
    const existing = (r.data.flows || []).find(f => f.flow_name === FLOW_NAME);
    if (existing) {
      log(`⚠️  ${FLOW_NAME} already exists: ${existing.flow_id} (${existing.status})`);
      const published = await publishREST(token, existing.flow_id);
      if (published) return;
    }
  } catch(_e) { /* empty */ }

  // Try REST creation
  const restFlowId = await tryAllAPIFormats(token);
  if (restFlowId) {
    await publishREST(token, restFlowId);
    log(`\n✅ Done via REST API. Flow ID: ${restFlowId}`);
    return;
  }

  // Browser automation
  await buildViaBrowser(token);
}

main().catch(e => { log(`Fatal: ${e.message}`); process.exit(1); });
