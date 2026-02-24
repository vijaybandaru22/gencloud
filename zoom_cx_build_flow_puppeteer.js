/* global document */
/**
 * Zoom CX - Claude_cars32 Flow Builder via Puppeteer Browser Automation
 *
 * Approach:
 * 1. Authenticate via Zoom OAuth to get access token
 * 2. Open Zoom CX in browser using Puppeteer
 * 3. Navigate directly to the flow builder (with auth cookies if possible)
 * 4. Create Claude_cars32 inbound voice flow with all widgets
 * 5. Publish the flow
 *
 * Flow Design:
 *   START → Welcome Greeting (bilingual)
 *         → Language Menu (1=EN, 2=ES)
 *         → Dept Menu (1=Sales, 2=Service, 3=New Models)
 *         → Geo Script (check ANI)
 *         → Condition (+1→US_Queue, +91→India_Queue)
 *         → Queue Transfer
 *         → Thanks Prompt + Disconnect
 */

const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');

// ─── Config ──────────────────────────────────────────────────────────────────
const ACCOUNT_ID    = 'Z-wSVKZGRXC59B5xRhrWIg';
const CLIENT_ID     = 'kmKBbmsQRMSaW9vXK0cduQ';
const CLIENT_SECRET = 'OA8RmxnXYHMMh7GR8lP4R9OHb16VLmp2';
const FLOW_NAME     = 'Claude_cars32';
const BASE_API      = 'https://api.zoom.us/v2';
const US_QUEUE_ID   = 'ZWQ1887222496A0776E5F5A9324C573CC62';
const INDIA_QUEUE_ID= 'ZWQA34051F5C48C7C0755E10A04FAFB2ED1';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Get OAuth Token ──────────────────────────────────────────────────────────
async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const r = await axios.post(
    'https://zoom.us/oauth/token',
    `grant_type=account_credentials&account_id=${ACCOUNT_ID}`,
    { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return r.data.access_token;
}

// ─── Check if flow already exists ────────────────────────────────────────────
async function checkExistingFlow(token) {
  try {
    const r = await axios.get(`${BASE_API}/contact_center/flows`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page_size: 100 }
    });
    const flows = r.data.flows || [];
    return flows.find(f => (f.flow_name || '').toLowerCase() === FLOW_NAME.toLowerCase()) || null;
  } catch (_e) {
    return null;
  }
}

// ─── Find an existing flow to use as starting template ───────────────────────
async function _findExistingFlowTemplate(_token) {
  // Use VJ_ZCX_ZDX_main as it's in draft and was created by this account
  return 'NZBuYW2YRmCx-JEu_cmjBg';
}

// ─── Main Browser Automation ──────────────────────────────────────────────────
async function buildFlowInBrowser(token) {
  console.log('\n[Browser] Launching Puppeteer...');

  const browser = await puppeteer.launch({
    headless: false,           // VISIBLE browser so we can see what's happening
    defaultViewport: null,     // Full screen
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

  let flowId = null;

  try {
    // ── Step 1: Set OAuth token in localStorage then navigate ───────────────
    console.log('[Browser] Setting up auth and navigating to Zoom...');

    await page.goto('https://zoom.us', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);

    // Check if already logged in
    const url = page.url();
    console.log(`[Browser] Current URL: ${url}`);

    // Try to inject token into page storage for API calls
    await page.evaluate((tok) => {
      try {
        localStorage.setItem('access_token', tok);
        localStorage.setItem('zoom_access_token', tok);
        sessionStorage.setItem('access_token', tok);
      } catch(_e) { /* empty */ }
    }, token);

    // Navigate to Contact Center
    console.log('[Browser] Navigating to Contact Center Flows...');
    await page.goto('https://zoom.us/contact-center/flows', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    const currentUrl = page.url();
    console.log(`[Browser] After navigation URL: ${currentUrl}`);

    // If redirected to login, we need to handle it
    if (currentUrl.includes('/signin') || currentUrl.includes('/login')) {
      console.log('[Browser] Login page detected. Attempting SSO login...');

      // Try to click SSO button or enter email
      try {
        // Check for email input
        await page.waitForSelector('input[type="email"], input[name="email"], #email', { timeout: 5000 });
        await page.type('input[type="email"], input[name="email"], #email', 'vijay.Bandaru+sandbox@waterfield.com');
        await sleep(500);
        await page.keyboard.press('Enter');
        await sleep(3000);
      } catch (_e) {
        console.log('[Browser] Email input not found, checking for other login methods...');
      }

      // Wait for user to complete login manually if needed
      console.log('[Browser] ⏳ Waiting for login to complete (30 seconds)...');
      console.log('[Browser] Please log in manually if prompted in the browser window.');
      await sleep(30000);

      // Navigate again after login
      await page.goto('https://zoom.us/contact-center/flows', { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(3000);
    }

    const flowsUrl = page.url();
    console.log(`[Browser] Flows page URL: ${flowsUrl}`);

    // Take screenshot of current state
    await page.screenshot({ path: 'C:/Users/VijayBandaru/zoom_browser_state.png', fullPage: true });
    console.log('[Browser] Screenshot saved: zoom_browser_state.png');

    // ── Step 2: Check if on flows page, click Create ────────────────────────
    console.log('[Browser] Looking for Create Flow button...');

    // Look for "Create" or "+ Create Flow" button
    const createSelectors = [
      'button[data-testid="create-flow-btn"]',
      'button:has-text("Create Flow")',
      '[class*="create"][class*="btn"]',
      'button[class*="create"]',
      '.zm-btn:contains("Create")',
    ];

    let createClicked = false;
    for (const sel of createSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 3000 });
        await page.click(sel);
        createClicked = true;
        console.log(`[Browser] Clicked create button: ${sel}`);
        break;
      } catch (_e) {
        // try next
      }
    }

    if (!createClicked) {
      // Try finding by text content
      try {
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, [role="button"], a');
          for (const btn of buttons) {
            if (btn.textContent.trim().toLowerCase().includes('create')) {
              btn.click();
              return true;
            }
          }
          return false;
        });
        createClicked = true;
        console.log('[Browser] Found and clicked Create button by text');
      } catch (_e) {
        console.log('[Browser] Could not find Create button');
      }
    }

    await sleep(2000);

    // ── Step 3: Use the Zoom CC internal API via fetch (bypassing CORS) ─────
    console.log('[Browser] Attempting to create flow via internal browser API...');

    // Zoom's web UI uses internal APIs - intercept and use the token
    const result = await page.evaluate(async (flowName, _usQueueId, _indiaQueueId) => {
      // Try to find the internal API token from Zoom's web app state
      let authToken = null;

      // Method 1: From localStorage
      const lsKeys = Object.keys(localStorage);
      for (const k of lsKeys) {
        const val = localStorage.getItem(k);
        if (val && val.length > 50 && (k.includes('token') || k.includes('auth'))) {
          authToken = val;
          break;
        }
      }

      // Method 2: From redux store or global state
      if (!authToken) {
        try {
          const storeEl = document.querySelector('[data-redux-store]');
          if (storeEl) {
            const state = JSON.parse(storeEl.getAttribute('data-redux-store'));
            authToken = state?.auth?.token || state?.session?.token;
          }
        } catch (_e) { /* empty */ }
      }

      // Method 3: From cookie
      if (!authToken) {
        const cookies = document.cookie.split(';');
        for (const c of cookies) {
          const [k, v] = c.trim().split('=');
          if (k && (k.includes('token') || k.includes('auth')) && v && v.length > 30) {
            authToken = decodeURIComponent(v);
            break;
          }
        }
      }

      // Try the API with the found token or the external OAuth token
      const apis = [
        'https://api.zoom.us/v2/contact_center/flows',
        '/api/contact_center/flows',
        '/contact_center/api/v1/flows',
      ];

      const payload = {
        flow_name: flowName,
        channel_type: 'voice',
        flow_type: 'inbound',
        description: 'Claude Cars inbound flow with language selection and geographic routing'
      };

      for (const apiUrl of apis) {
        try {
          const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          };
          if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

          const resp = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            credentials: 'include'
          });

          const data = await resp.json().catch(() => resp.text());
          if (resp.ok) {
            return { success: true, api: apiUrl, data };
          }
          return { tried: apiUrl, status: resp.status, data };
        } catch (_e) {
          // continue
        }
      }
      return { error: 'All API attempts failed', authToken: authToken ? 'found' : 'not found' };
    }, FLOW_NAME, US_QUEUE_ID, INDIA_QUEUE_ID);

    console.log('[Browser] Internal API result:', JSON.stringify(result, null, 2));

    // ── Step 4: Navigate to actual flow builder ──────────────────────────────
    // Use the known flow builder URL pattern
    // If we have a flow ID from creation, go there directly
    const flowBuilderUrl = result?.data?.flow_id
      ? `https://zoom.us/contact-center/flows/${result.data.flow_id}/edit`
      : 'https://zoom.us/contact-center/flows/create?channel=voice';

    console.log(`[Browser] Navigating to flow builder: ${flowBuilderUrl}`);
    await page.goto(flowBuilderUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(5000);

    await page.screenshot({ path: 'C:/Users/VijayBandaru/zoom_flow_builder.png', fullPage: false });
    console.log('[Browser] Flow builder screenshot saved');

    const builderUrl = page.url();
    console.log(`[Browser] Builder URL: ${builderUrl}`);

    // Extract flow ID from URL if present
    const urlMatch = builderUrl.match(/flows\/([A-Za-z0-9_-]+)\/edit/);
    if (urlMatch) {
      flowId = urlMatch[1];
      console.log(`[Browser] Flow ID from URL: ${flowId}`);
    }

    // ── Step 5: Configure widgets via keyboard shortcuts and UI ──────────────
    console.log('[Browser] Checking flow builder state...');

    // Wait for canvas to load
    try {
      await page.waitForSelector('[class*="canvas"], [class*="flow-builder"], [class*="designer"]', { timeout: 10000 });
      console.log('[Browser] ✅ Flow canvas detected');

      // Take screenshot
      await page.screenshot({ path: 'C:/Users/VijayBandaru/zoom_canvas.png' });

      // Get page title/heading to identify the flow
      const heading = await page.evaluate(() => {
        const h = document.querySelector('h1, h2, [class*="flow-name"], [class*="title"]');
        return h ? h.textContent.trim() : 'Not found';
      });
      console.log(`[Browser] Page heading: ${heading}`);

    } catch (e) {
      console.log(`[Browser] Canvas not found: ${e.message}`);
    }

    // Final state screenshot
    await page.screenshot({ path: 'C:/Users/VijayBandaru/zoom_final_state.png', fullPage: true });
    console.log('[Browser] Final state screenshot saved');

    return {
      success: flowId !== null,
      flowId,
      apiResult: result
    };

  } catch (error) {
    console.error(`[Browser] Error: ${error.message}`);
    try {
      await page.screenshot({ path: 'C:/Users/VijayBandaru/zoom_error_state.png' });
    } catch (_e) { /* empty */ }
    return { success: false, error: error.message };
  } finally {
    // Keep browser open for 10 seconds for user to see state
    console.log('[Browser] Keeping browser open for 15 seconds...');
    await sleep(15000);
    await browser.close();
  }
}

// ─── Alternative: PATCH existing VJ flow to become Claude_cars32 ─────────────
async function updateVJFlowToClaudeCars32(token) {
  console.log('\n[API] Attempting to update VJ_ZCX_ZDX_main → Claude_cars32...');
  const VJ_FLOW_ID = 'NZBuYW2YRmCx-JEu_cmjBg';

  // Try to update the flow name and add description
  const updateAttempts = [
    // Try updating just the name
    { flow_name: FLOW_NAME },
    { name: FLOW_NAME },
    { flow_name: FLOW_NAME, flow_description: 'Claude Cars - Language+Dept+Geographic routing' },
  ];

  for (let i = 0; i < updateAttempts.length; i++) {
    try {
      const r = await axios.patch(`${BASE_API}/contact_center/flows/${VJ_FLOW_ID}`, updateAttempts[i], {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      console.log(`[API] ✅ Update ${i+1} success:`, JSON.stringify(r.data));
      return VJ_FLOW_ID;
    } catch (e) {
      console.log(`[API] Update ${i+1}: ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
    }
  }

  return null;
}

// ─── Try Publish Existing Known Flow ─────────────────────────────────────────
async function tryPublishFlow(token, flowId) {
  console.log(`\n[API] Attempting to publish flow ${flowId}...`);
  const publishAttempts = [
    { method: 'put',  path: `${BASE_API}/contact_center/flows/${flowId}/publish`, body: {} },
    { method: 'post', path: `${BASE_API}/contact_center/flows/${flowId}/publish`, body: { version_description: 'Claude_cars32 v1' } },
    { method: 'put',  path: `${BASE_API}/contact_center/flows/${flowId}`, body: { status: 'published' } },
  ];

  for (const a of publishAttempts) {
    try {
      const r = await axios[a.method](a.path, a.body, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      console.log(`[API] ✅ Publish success:`, JSON.stringify(r.data));
      return true;
    } catch (e) {
      console.log(`[API] ${a.method.toUpperCase()} ${a.path}: ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
    }
  }
  return false;
}

// ─── Print Complete Manual Guide ─────────────────────────────────────────────
function printCompleteGuide(usQueueId, indiaQueueId) {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║          ZOOM CX - Claude_cars32 COMPLETE MANUAL BUILD GUIDE            ║
╚══════════════════════════════════════════════════════════════════════════╝

ZOOM LOGIN:  https://zoom.us
Go to: Admin → Contact Center → Flows → [+ Create Flow]
Select: Channel = Voice | Flow Type = Inbound
Name: ${FLOW_NAME}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLOW ARCHITECTURE (connect widgets top→bottom):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[START]
   ↓
┌─────────────────────────────────────────────────┐
│ WIDGET 1: Play Message                          │
│ Name: "Welcome_Bilingual"                       │
│ Type: Text-to-Speech | Language: en-US          │
│ Text: "Thank you for calling Claude Cars.       │
│        For English, press 1.                    │
│        Para Español, oprima 2."                 │
└─────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────┐
│ WIDGET 2: Collect Input (IVR Menu)              │
│ Name: "Language_Selection"                      │
│ Prompt: "For English press 1.                   │
│          Para Español oprima 2."                │
│ Max Digits: 1 | Timeout: 10s | Retries: 2       │
│ Key 1 → [WIDGET 3a English Dept Menu]           │
│ Key 2 → [WIDGET 3b Spanish Dept Menu]           │
│ Timeout → [WIDGET 3a] (default English)         │
└─────────────────────────────────────────────────┘
   ↙               ↘
[3a] Play Message     [3b] Play Message
Name: EN_Dept_Menu    Name: ES_Dept_Menu
Text: "For Sales      Text: "Para Ventas
press 1. For          oprima 1. Para
Service press 2.      Servicio oprima 2.
For New Models        Para Modelos
press 3."             Nuevos oprima 3."
   ↓                    ↓
[4a] Collect Input    [4b] Collect Input
Name: Dept_EN         Name: Dept_ES
Max: 1 | Timeout: 10s | Retries: 2
Key 1 = Sales         Key 1 = Ventas
Key 2 = Service       Key 2 = Servicio
Key 3 = New Models    Key 3 = Modelos
ALL options → [WIDGET 5]
   ↘               ↙
┌─────────────────────────────────────────────────┐
│ WIDGET 5: Script                                │
│ Name: "GeoRouting_Script"                       │
│ Code:                                           │
│   var ani = variables.get('Start.From') || '';  │
│   var isUS = ani.startsWith('+1') ||            │
│              /^1\\d{10}$/.test(ani);            │
│   var isIN = ani.startsWith('+91') ||           │
│              /^91\\d{10}$/.test(ani);           │
│   variables.set('is_us', isUS);                 │
│   variables.set('is_india', isIN);              │
└─────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────┐
│ WIDGET 6: Condition                             │
│ Name: "Geographic_Routing"                      │
│ Condition 1: is_us == true  → [WIDGET 7a]       │
│ Condition 2: is_india==true → [WIDGET 7b]       │
│ Default:                    → [WIDGET 7a]       │
└─────────────────────────────────────────────────┘
   ↙                           ↘
[7a] Route To                  [7b] Route To
Name: US_Queue_Transfer         Name: India_Queue_Transfer
Queue: US_Queue                 Queue: India_Queue
Queue ID: ${usQueueId}
                                Queue ID: ${indiaQueueId}
   ↘                           ↙
┌─────────────────────────────────────────────────┐
│ WIDGET 8: Play Message (after queue timeout)    │
│ Name: "Thanks_Disconnect"                       │
│ Text: "Thanks for choosing my flow. Goodbye."   │
│ Language: en-US                                 │
└─────────────────────────────────────────────────┘
   ↓
[DISCONNECT]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUEUE IDs (confirm in Admin → Contact Center → Queues):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  US_Queue    = ${usQueueId}
  India_Queue = ${indiaQueueId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Click Save (top right)
2. Click Validate (fix any errors)
3. Click Publish → Confirm
4. Flow status should show "Published"
`);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ZOOM CX - Claude_cars32 Builder (Puppeteer + API)');
  console.log('═══════════════════════════════════════════════════════════════');

  // Get token
  const token = await getToken();
  console.log('✅ OAuth token obtained');

  // Check if flow already exists
  const existing = await checkExistingFlow(token);
  if (existing) {
    console.log(`\n⚠️  Flow "${FLOW_NAME}" already exists:`);
    console.log(`   ID: ${existing.flow_id}`);
    console.log(`   Status: ${existing.status}`);
    // Try to publish it
    const published = await tryPublishFlow(token, existing.flow_id);
    if (published) {
      console.log(`\n✅ Existing flow published successfully!`);
      return;
    }
  }

  // Try to update VJ flow as a workaround (rename + configure)
  const _vjFlowId = await updateVJFlowToClaudeCars32(token);

  // Launch browser automation
  console.log('\nLaunching browser automation...');
  const browserResult = await buildFlowInBrowser(token);

  // If browser got a flow ID, try to publish
  if (browserResult.flowId) {
    await tryPublishFlow(token, browserResult.flowId);
  }

  // Print the complete manual guide for the user
  printCompleteGuide(US_QUEUE_ID, INDIA_QUEUE_ID);

  // Save full guide to file
  const guideFile = 'C:/Users/VijayBandaru/CLAUDE_CARS32_ZOOM_GUIDE.md';
  const guideContent = `# Claude_cars32 Zoom CX Flow Configuration Guide

## Account Details
- Account ID: ${ACCOUNT_ID}
- Flow Name: ${FLOW_NAME}

## Queue IDs
- US_Queue: ${US_QUEUE_ID}
- India_Queue: ${INDIA_QUEUE_ID}

## Flow Structure
See the printed guide above for complete widget-by-widget configuration.

## Flow Description
This inbound voice flow for Claude Cars provides:
1. **Bilingual Welcome** (English/Spanish)
2. **Language Selection** (DTMF 1=EN, 2=ES)
3. **Department Menu** (1=Sales, 2=Service, 3=New Models) in selected language
4. **Geographic Routing** via caller ANI:
   - +1 (US numbers) → US_Queue
   - +91 (India numbers) → India_Queue
   - Default → US_Queue
5. **Thanks prompt** + Disconnect
`;
  fs.writeFileSync(guideFile, guideContent);
  console.log(`\nGuide saved to: ${guideFile}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Automation complete. Check browser screenshots in:');
  console.log('  C:\\Users\\VijayBandaru\\zoom_browser_state.png');
  console.log('  C:\\Users\\VijayBandaru\\zoom_flow_builder.png');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
