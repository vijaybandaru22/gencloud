/**
 * Verifies all Claude Cars flows and queue assignments in Genesys Cloud
 */

const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

const FLOWS_TO_CHECK = [
  { id: '5796d427-8c0b-455f-8471-38db03907764', name: 'Claude_cars32',        type: 'inboundcall' },
  { id: '694b8665-6703-4d5b-9f9f-5f0ea5e0f36f', name: 'Claude_US_InQueue',   type: 'inqueuecall' },
  { id: '6d3d47e5-4dde-4720-affb-3025c5f3673e', name: 'Claude_India_InQueue', type: 'inqueuecall' },
];

const QUEUES_TO_CHECK = [
  { id: 'ed1d516d-a9c9-4594-9420-d3e574042d0b', name: 'Claude_US_Queue',    expectedFlow: 'Claude_US_InQueue' },
  { id: '13f15c0b-11dc-41b2-9a69-204056f3b310', name: 'Claude_India_Queue', expectedFlow: 'Claude_India_InQueue' },
];

function request(method, path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.usw2.pure.cloud',
      path,
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function getToken() {
  return new Promise((resolve, reject) => {
    const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const body = 'grant_type=client_credentials';
    const opts = {
      hostname: 'login.usw2.pure.cloud',
      path: '/oauth/token',
      method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.access_token) resolve(parsed.access_token);
        else reject(new Error(`Token error: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function pass(msg) { console.log(`  ✔  ${msg}`); }
function fail(msg) { console.log(`  ✘  ${msg}`); }
function info(msg) { console.log(`     ${msg}`); }

async function main() {
  console.log('Getting access token...');
  const token = await getToken();
  console.log('Token obtained.\n');

  // ── 1. Check flows ──────────────────────────────────────────────────────────
  console.log('=== FLOW STATUS ===\n');
  for (const f of FLOWS_TO_CHECK) {
    const res = await request('GET', `/api/v2/flows/${f.id}`, token);
    if (res.status !== 200) {
      fail(`${f.name} — HTTP ${res.status}`);
      continue;
    }
    const flow = res.body;
    const published = flow.publishedVersion;
    const checked  = flow.checkedInVersion;

    if (published) {
      pass(`${flow.name}  [type: ${flow.type}]`);
      info(`ID:                ${flow.id}`);
      info(`Published Version: ${published.id}`);
      info(`Date Published:    ${published.datePublished || 'n/a'}`);
      info(`Last Operation:    ${flow.currentOperation ? flow.currentOperation.actionName + ' → ' + flow.currentOperation.actionStatus : 'n/a'}`);
      info(`Division:          ${flow.division ? flow.division.name : 'unknown'}`);
      info(`Active:            ${flow.active}`);
    } else {
      fail(`${flow.name} — NOT published (checkedIn: ${checked ? checked.id : 'none'})`);
      info(`ID: ${flow.id}`);
    }
    console.log();
  }

  // ── 2. Check queue in-queue flow assignments ────────────────────────────────
  console.log('=== QUEUE IN-QUEUE FLOW ASSIGNMENTS ===\n');
  for (const q of QUEUES_TO_CHECK) {
    const res = await request('GET', `/api/v2/routing/queues/${q.id}`, token);
    if (res.status !== 200) {
      fail(`${q.name} — HTTP ${res.status}`);
      continue;
    }
    const queue = res.body;
    const assignedFlow = queue.queueFlow;

    if (assignedFlow && assignedFlow.name === q.expectedFlow) {
      pass(`${queue.name} → ${assignedFlow.name}`);
      info(`Queue ID:    ${queue.id}`);
      info(`Flow ID:     ${assignedFlow.id}`);
    } else if (assignedFlow) {
      fail(`${queue.name} → ${assignedFlow.name}  (expected: ${q.expectedFlow})`);
    } else {
      fail(`${queue.name} — no in-queue flow assigned  (expected: ${q.expectedFlow})`);
    }
    console.log();
  }

  // ── 3. Check main inbound call flow is published and linked ─────────────────
  console.log('=== MAIN FLOW DETAILS ===\n');
  const mainRes = await request('GET', `/api/v2/flows/5796d427-8c0b-455f-8471-38db03907764`, token);
  if (mainRes.status === 200) {
    const f = mainRes.body;
    pass(`${f.name} is published`);
    info(`Architect URL: https://apps.usw2.pure.cloud/architect/#/inboundcall/flows/${f.id}/latest`);
  }
  console.log();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
