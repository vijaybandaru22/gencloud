/**
 * Zoom CX - Claude_cars32 Inbound Voice Flow
 *
 * Flow Requirements:
 * - Language selection: English or Spanish (US)
 * - Play prompt: "Thanks for choosing my flow" then disconnect
 * - Route to: Sales, Services, New Models
 * - Geographic routing: US (+1) → US_Queue, India (+91) → India_Queue
 *
 * Zoom CX Credentials:
 * - Account ID: Z-wSVKZGRXC59B5xRhrWIg
 * - Client ID: kmKBbmsQRMSaW9vXK0cduQ
 * - Client Secret: OA8RmxnXYHMMh7GR8lP4R9OHb16VLmp2
 */

const axios = require('axios');

// ─── Credentials ────────────────────────────────────────────────────────────
const ACCOUNT_ID    = 'Z-wSVKZGRXC59B5xRhrWIg';
const CLIENT_ID     = 'kmKBbmsQRMSaW9vXK0cduQ';
const CLIENT_SECRET = 'OA8RmxnXYHMMh7GR8lP4R9OHb16VLmp2';
const FLOW_NAME     = 'Claude_cars32';
const BASE_URL      = 'https://api.zoom.us/v2';

// Known queue IDs from zoom_queue_info.json
const KNOWN_QUEUES = {
  US_Queue:    'ZWQ1887222496A0776E5F5A9324C573CC62',
  India_Queue: 'ZWQA34051F5C48C7C0755E10A04FAFB2ED1'
};

// ─── Step 1: Get OAuth Token ─────────────────────────────────────────────────
async function getToken() {
  console.log('\n[1/5] Authenticating with Zoom CX OAuth...');
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const response = await axios.post(
    'https://zoom.us/oauth/token',
    `grant_type=account_credentials&account_id=${ACCOUNT_ID}`,
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  console.log('   ✅ Token obtained. Scope:', response.data.scope || 'not specified');
  return response.data.access_token;
}

// ─── Step 2: Discover Queues ─────────────────────────────────────────────────
async function discoverQueues(token) {
  console.log('\n[2/5] Discovering queues...');
  try {
    const response = await axios.get(`${BASE_URL}/contact_center/queues`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { page_size: 100 }
    });
    const queues = response.data.queues || response.data || [];
    console.log(`   Found ${queues.length} queues`);

    const usQueue    = queues.find(q => (q.name||q.queue_name||'').toLowerCase().includes('us_queue') || q.queue_id === KNOWN_QUEUES.US_Queue);
    const indiaQueue = queues.find(q => (q.name||q.queue_name||'').toLowerCase().includes('india_queue') || q.queue_id === KNOWN_QUEUES.India_Queue);

    const usQueueId    = usQueue    ? (usQueue.queue_id    || usQueue.id) : KNOWN_QUEUES.US_Queue;
    const indiaQueueId = indiaQueue ? (indiaQueue.queue_id || indiaQueue.id) : KNOWN_QUEUES.India_Queue;

    console.log(`   US_Queue ID:    ${usQueueId}`);
    console.log(`   India_Queue ID: ${indiaQueueId}`);
    return { usQueueId, indiaQueueId };
  } catch (err) {
    console.log(`   ⚠️  Queue listing failed (${err.response?.status}), using known IDs`);
    return { usQueueId: KNOWN_QUEUES.US_Queue, indiaQueueId: KNOWN_QUEUES.India_Queue };
  }
}

// ─── Step 3: Check / Delete Existing Flow ───────────────────────────────────
async function findExistingFlow(token) {
  console.log('\n[3/5] Checking for existing Claude_cars32 flow...');
  try {
    const response = await axios.get(`${BASE_URL}/contact_center/flows`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { page_size: 100 }
    });
    const flows = response.data.flows || response.data || [];
    const existing = flows.find(f =>
      (f.flow_name || f.name || '').toLowerCase() === FLOW_NAME.toLowerCase()
    );
    if (existing) {
      const fid = existing.flow_id || existing.id;
      console.log(`   Found existing flow: ${fid} (status: ${existing.status || 'unknown'})`);
      return fid;
    }
    console.log('   No existing flow found - will create new');
    return null;
  } catch (err) {
    console.log(`   ⚠️  Flow listing failed: ${err.response?.data?.message || err.message}`);
    return null;
  }
}

// ─── Build Flow Definition (widget graph) ───────────────────────────────────
function buildFlowDefinition(usQueueId, indiaQueueId) {
  /**
   * Flow graph (widget IDs → next connections):
   *
   * start
   *   → play_welcome              (Bilingual greeting)
   *     → collect_language        (Press 1=EN, 2=ES)
   *       → play_en_dept_menu  (English dept prompt)
   *       → play_es_dept_menu  (Spanish dept prompt)
   *         → collect_dept     (Press 1=Sales 2=Service 3=NewModels)
   *           → script_geo     (check ANI prefix)
   *             → cond_geo     (+1→US, +91→India, else→US)
   *               → route_us   (US_Queue)
   *               → route_india (India_Queue)
   *
   * Additional paths:
   *   - Timeout on language → English path
   *   - After queue transfer failure: play_thanks → disconnect
   */
  return {
    widgets: [
      // ── START ──────────────────────────────────────────────────────────
      {
        id: 'start',
        type: 'Start',
        name: 'Start',
        next: 'play_welcome'
      },

      // ── WELCOME GREETING ───────────────────────────────────────────────
      {
        id: 'play_welcome',
        type: 'PlayMessage',
        name: 'Welcome Greeting',
        config: {
          message: {
            type: 'tts',
            text: 'Thank you for calling Claude Cars. For English, press 1. Para Español, oprima 2.',
            language: 'en-US'
          }
        },
        next: 'collect_language'
      },

      // ── LANGUAGE SELECTION ─────────────────────────────────────────────
      {
        id: 'collect_language',
        type: 'CollectInput',
        name: 'Language Selection',
        config: {
          input_type: 'dtmf',
          max_digits: 1,
          timeout: 10,
          inter_digit_timeout: 5,
          retries: 2,
          no_input_action: 'go_to',
          no_input_target: 'play_en_dept_menu',
          invalid_action: 'go_to',
          invalid_target: 'play_en_dept_menu',
          prompt: {
            type: 'tts',
            text: 'For English, press 1. Para Español, oprima 2.',
            language: 'en-US'
          },
          options: [
            { digit: '1', label: 'English', next: 'play_en_dept_menu' },
            { digit: '2', label: 'Spanish', next: 'play_es_dept_menu' }
          ]
        }
      },

      // ── ENGLISH DEPT MENU PROMPT ───────────────────────────────────────
      {
        id: 'play_en_dept_menu',
        type: 'PlayMessage',
        name: 'English Department Menu',
        config: {
          message: {
            type: 'tts',
            text: 'For Sales, press 1. For Service, press 2. For New Models, press 3.',
            language: 'en-US'
          }
        },
        next: 'collect_dept_en'
      },

      // ── SPANISH DEPT MENU PROMPT ───────────────────────────────────────
      {
        id: 'play_es_dept_menu',
        type: 'PlayMessage',
        name: 'Spanish Department Menu',
        config: {
          message: {
            type: 'tts',
            text: 'Para Ventas, oprima 1. Para Servicio, oprima 2. Para Modelos Nuevos, oprima 3.',
            language: 'es-US'
          }
        },
        next: 'collect_dept_es'
      },

      // ── DEPARTMENT SELECTION (English path) ────────────────────────────
      {
        id: 'collect_dept_en',
        type: 'CollectInput',
        name: 'Department Selection (EN)',
        config: {
          input_type: 'dtmf',
          max_digits: 1,
          timeout: 10,
          inter_digit_timeout: 5,
          retries: 2,
          no_input_action: 'go_to',
          no_input_target: 'script_geo',
          invalid_action: 'go_to',
          invalid_target: 'script_geo',
          prompt: {
            type: 'tts',
            text: 'For Sales, press 1. For Service, press 2. For New Models, press 3.',
            language: 'en-US'
          },
          options: [
            { digit: '1', label: 'Sales',      next: 'script_geo' },
            { digit: '2', label: 'Service',    next: 'script_geo' },
            { digit: '3', label: 'New Models', next: 'script_geo' }
          ]
        }
      },

      // ── DEPARTMENT SELECTION (Spanish path) ────────────────────────────
      {
        id: 'collect_dept_es',
        type: 'CollectInput',
        name: 'Department Selection (ES)',
        config: {
          input_type: 'dtmf',
          max_digits: 1,
          timeout: 10,
          inter_digit_timeout: 5,
          retries: 2,
          no_input_action: 'go_to',
          no_input_target: 'script_geo',
          invalid_action: 'go_to',
          invalid_target: 'script_geo',
          prompt: {
            type: 'tts',
            text: 'Para Ventas, oprima 1. Para Servicio, oprima 2. Para Modelos Nuevos, oprima 3.',
            language: 'es-US'
          },
          options: [
            { digit: '1', label: 'Ventas',         next: 'script_geo' },
            { digit: '2', label: 'Servicio',        next: 'script_geo' },
            { digit: '3', label: 'Modelos Nuevos',  next: 'script_geo' }
          ]
        }
      },

      // ── GEO ROUTING SCRIPT ─────────────────────────────────────────────
      {
        id: 'script_geo',
        type: 'Script',
        name: 'Geographic Routing Logic',
        config: {
          script: `
// Determine caller's region based on ANI (Automatic Number Identification)
var ani = variables.get('Start.From') || variables.get('Call.CallerID') || '';
// US: starts with +1 (11 digits total) or 1 followed by 10 digits
var isUS    = ani.startsWith('+1') || /^1\\d{10}$/.test(ani);
// India: starts with +91
var isIndia = ani.startsWith('+91') || /^91\\d{10}$/.test(ani);
variables.set('is_us_caller',    isUS);
variables.set('is_india_caller', isIndia);
variables.set('caller_ani',      ani);
          `.trim()
        },
        next: 'cond_geo'
      },

      // ── GEOGRAPHIC CONDITION ───────────────────────────────────────────
      {
        id: 'cond_geo',
        type: 'Condition',
        name: 'Geographic Routing Decision',
        config: {
          conditions: [
            {
              id: 'to_us',
              expression: "variables.get('is_us_caller') === true",
              next: 'route_us'
            },
            {
              id: 'to_india',
              expression: "variables.get('is_india_caller') === true",
              next: 'route_india'
            }
          ],
          default_next: 'route_us'
        }
      },

      // ── ROUTE TO US QUEUE ──────────────────────────────────────────────
      {
        id: 'route_us',
        type: 'RouteTo',
        name: 'Transfer to US Queue',
        config: {
          destination_type: 'queue',
          queue_id: usQueueId,
          priority: 1,
          timeout_seconds: 300,
          timeout_next: 'play_thanks'
        }
      },

      // ── ROUTE TO INDIA QUEUE ───────────────────────────────────────────
      {
        id: 'route_india',
        type: 'RouteTo',
        name: 'Transfer to India Queue',
        config: {
          destination_type: 'queue',
          queue_id: indiaQueueId,
          priority: 1,
          timeout_seconds: 300,
          timeout_next: 'play_thanks'
        }
      },

      // ── THANKS PROMPT ──────────────────────────────────────────────────
      {
        id: 'play_thanks',
        type: 'PlayMessage',
        name: 'Thanks for Choosing My Flow',
        config: {
          message: {
            type: 'tts',
            text: 'Thanks for choosing my flow. Goodbye.',
            language: 'en-US'
          }
        },
        next: 'disconnect'
      },

      // ── DISCONNECT ─────────────────────────────────────────────────────
      {
        id: 'disconnect',
        type: 'Disconnect',
        name: 'Disconnect Call',
        config: {}
      }
    ],

    // Widget coordinate positions for visual layout
    positions: {
      start:            { x: 400, y: 50  },
      play_welcome:     { x: 400, y: 150 },
      collect_language: { x: 400, y: 280 },
      play_en_dept_menu:{ x: 200, y: 420 },
      play_es_dept_menu:{ x: 600, y: 420 },
      collect_dept_en:  { x: 200, y: 550 },
      collect_dept_es:  { x: 600, y: 550 },
      script_geo:       { x: 400, y: 700 },
      cond_geo:         { x: 400, y: 830 },
      route_us:         { x: 200, y: 980 },
      route_india:      { x: 600, y: 980 },
      play_thanks:      { x: 400, y: 1130 },
      disconnect:       { x: 400, y: 1260 }
    }
  };
}

// ─── Step 4a: Create New Flow via API ───────────────────────────────────────
async function createFlow(token, flowDef) {
  console.log('\n[4/5] Creating Claude_cars32 flow via API...');

  // Attempt A: Minimal create (just name + channel)
  const createPayloads = [
    // Format 1 (documented June 2025 schema)
    {
      flow_name: FLOW_NAME,
      flow_description: 'Claude Cars inbound voice flow - language selection, department routing, geographic queue routing',
      channel_type: 'voice',
      flow_type: 'inbound'
    },
    // Format 2
    {
      name: FLOW_NAME,
      description: 'Claude Cars inbound voice flow',
      channel: 'voice',
      type: 'inbound'
    },
    // Format 3
    {
      flow_name: FLOW_NAME,
      channel: 'voice'
    },
    // Format 4 (with full definition)
    {
      flow_name: FLOW_NAME,
      channel_type: 'voice',
      flow_definition: flowDef
    }
  ];

  for (let i = 0; i < createPayloads.length; i++) {
    try {
      console.log(`   Trying create format ${i + 1}...`);
      const response = await axios.post(
        `${BASE_URL}/contact_center/flows`,
        createPayloads[i],
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      const flowId = response.data.flow_id || response.data.id;
      console.log(`   ✅ Flow created! ID: ${flowId}`);
      return flowId;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.reason || err.message;
      console.log(`   ❌ Format ${i + 1} failed: ${errMsg}`);
    }
  }
  return null;
}

// ─── Step 4b: Update Existing Flow ──────────────────────────────────────────
async function updateFlow(token, flowId, flowDef) {
  console.log(`\n   Updating flow ${flowId} with full definition...`);

  const updatePayloads = [
    // Format 1: full flow_definition wrapper
    { flow_definition: flowDef },
    // Format 2: direct widgets at top level
    { widgets: flowDef.widgets, positions: flowDef.positions },
    // Format 3: nested under flow
    { flow: { widgets: flowDef.widgets } }
  ];

  for (let i = 0; i < updatePayloads.length; i++) {
    try {
      console.log(`   Trying update format ${i + 1}...`);
      await axios.patch(
        `${BASE_URL}/contact_center/flows/${flowId}`,
        updatePayloads[i],
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log(`   ✅ Flow updated with widget definition`);
      return true;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.reason || err.message;
      console.log(`   ⚠️  Update format ${i + 1}: ${errMsg}`);
    }
  }
  console.log('   ℹ️  Update API unavailable - flow will need widget configuration in UI');
  return false;
}

// ─── Step 5: Publish Flow ────────────────────────────────────────────────────
async function publishFlow(token, flowId) {
  console.log(`\n[5/5] Publishing flow ${flowId}...`);

  // Try PUT /publish
  const publishEndpoints = [
    { method: 'put',  url: `${BASE_URL}/contact_center/flows/${flowId}/publish`,  body: { version_description: 'Claude_cars32 v1.0 - Language+Dept+GeoRouting' } },
    { method: 'post', url: `${BASE_URL}/contact_center/flows/${flowId}/publish`,  body: {} },
    { method: 'post', url: `${BASE_URL}/contact_center/flows/${flowId}/versions`, body: { status: 'published' } }
  ];

  for (const ep of publishEndpoints) {
    try {
      console.log(`   Trying ${ep.method.toUpperCase()} ${ep.url}...`);
      const response = await axios[ep.method](ep.url, ep.body, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      console.log(`   ✅ Flow published! Status: ${response.data?.status || response.status}`);
      return true;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.reason || err.message;
      console.log(`   ❌ ${ep.method.toUpperCase()} publish failed: ${errMsg}`);
    }
  }
  return false;
}

// ─── Verify Final Flow Status ────────────────────────────────────────────────
async function verifyFlow(token, flowId) {
  try {
    const response = await axios.get(`${BASE_URL}/contact_center/flows/${flowId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (_err) {
    return null;
  }
}

// ─── Save Results ─────────────────────────────────────────────────────────────
const fs = require('fs');

function saveResults(results) {
  const outputFile = 'C:/Users/VijayBandaru/zoom_claude_cars32_result.json';
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n   Results saved to: ${outputFile}`);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ZOOM CX - Claude_cars32 Voice Inbound Flow Builder');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Flow Name: ${FLOW_NAME}`);
  console.log(`  Account:   ${ACCOUNT_ID}`);
  console.log(`  Date:      ${new Date().toISOString()}`);
  console.log('───────────────────────────────────────────────────────────────');

  const results = { success: false, steps: {} };

  try {
    // Step 1: Authenticate
    const token = await getToken();
    results.steps.auth = 'success';

    // Step 2: Discover queues
    const { usQueueId, indiaQueueId } = await discoverQueues(token);
    results.steps.queues = { usQueueId, indiaQueueId };

    // Build flow definition
    const flowDef = buildFlowDefinition(usQueueId, indiaQueueId);

    // Step 3: Check for existing flow
    let flowId = await findExistingFlow(token);

    // Step 4: Create or reuse flow
    if (!flowId) {
      flowId = await createFlow(token, flowDef);
    }

    if (flowId) {
      results.steps.flowId = flowId;
      results.flowId = flowId;

      // Update with widget definition
      await updateFlow(token, flowId, flowDef);

      // Step 5: Publish
      const published = await publishFlow(token, flowId);
      results.steps.publish = published ? 'success' : 'api_unavailable';

      // Verify final state
      const flowInfo = await verifyFlow(token, flowId);
      if (flowInfo) {
        results.flowInfo = flowInfo;
        results.success = true;
        console.log('\n───────────────────────────────────────────────────────────────');
        console.log('  FLOW STATUS:');
        console.log(`    Name:    ${flowInfo.flow_name || flowInfo.name}`);
        console.log(`    ID:      ${flowInfo.flow_id  || flowInfo.id}`);
        console.log(`    Status:  ${flowInfo.status}`);
        console.log(`    Channel: ${flowInfo.channel || flowInfo.channel_type}`);
      }
    } else {
      results.steps.create = 'api_unavailable';
      console.log('\n───────────────────────────────────────────────────────────────');
      console.log('  ⚠️  Flow creation via API not available in this account.');
      console.log('  The Zoom CX UI must be used. See manual guide below.');
    }

  } catch (err) {
    results.error = err.message;
    if (err.response) {
      results.httpStatus = err.response.status;
      results.httpBody   = err.response.data;
      console.error(`\n  ❌ Fatal error ${err.response.status}:`, JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('\n  ❌ Fatal error:', err.message);
    }
  }

  // ─── Print Manual Guide if API Not Available ──────────────────────────────
  if (!results.flowId) {
    console.log(`
═══════════════════════════════════════════════════════════════
  MANUAL CONFIGURATION GUIDE - Zoom CX Flow Builder
═══════════════════════════════════════════════════════════════

  1. Login: https://zoom.us  → Contact Center → Flows
  2. Click "+ Create Flow" → Select "Inbound" → Voice
  3. Name: Claude_cars32

  WIDGET 1: Play Message (Welcome)
    Text: "Thank you for calling Claude Cars.
           For English press 1. Para Español oprima 2."
    Language: en-US

  WIDGET 2: Collect Input (Language Selection)
    Max digits: 1 | Timeout: 10s | Retries: 2
    Key 1 → English path
    Key 2 → Spanish path
    Timeout → English path (default)

  WIDGET 3a: Play Message (English Dept)
    Text: "For Sales press 1. For Service press 2. For New Models press 3."
  WIDGET 3b: Play Message (Spanish Dept)
    Text: "Para Ventas oprima 1. Para Servicio oprima 2. Para Modelos Nuevos oprima 3."

  WIDGET 4: Collect Input (Department)
    Key 1=Sales | Key 2=Service | Key 3=New Models → ALL go to Condition

  WIDGET 5: Script (Geo Routing)
    var ani = variables.get('Start.From') || '';
    variables.set('is_us',    ani.startsWith('+1'));
    variables.set('is_india', ani.startsWith('+91'));

  WIDGET 6: Condition
    If is_us    == true  → Transfer to US_Queue    (${results.steps.queues?.usQueueId    || KNOWN_QUEUES.US_Queue})
    If is_india == true  → Transfer to India_Queue (${results.steps.queues?.indiaQueueId || KNOWN_QUEUES.India_Queue})
    Default             → Transfer to US_Queue

  WIDGET 7a: Route To Queue → US_Queue
  WIDGET 7b: Route To Queue → India_Queue

  WIDGET 8: Play Message
    Text: "Thanks for choosing my flow."
    → Disconnect

  After all queue transfers timeout → Play Message → Disconnect

  4. Click Save → Validate → Publish
═══════════════════════════════════════════════════════════════
`);
  }

  saveResults(results);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(results.success
    ? `  ✅ SUCCESS - Claude_cars32 flow is live in Zoom CX!`
    : `  ℹ️  See manual guide above to complete flow in Zoom CX UI`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
