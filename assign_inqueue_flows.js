/**
 * Assigns the published in-queue flows to their respective queues
 * Claude_US_InQueue  -> Claude_US_Queue
 * Claude_India_InQueue -> Claude_India_Queue
 */

const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const BASE_URL = 'api.usw2.pure.cloud';

const US_QUEUE_ID = 'ed1d516d-a9c9-4594-9420-d3e574042d0b';
const INDIA_QUEUE_ID = '13f15c0b-11dc-41b2-9a69-204056f3b310';
const US_INQUEUE_FLOW_ID = '694b8665-6703-4d5b-9f9f-5f0ea5e0f36f';
const INDIA_INQUEUE_FLOW_ID = '6d3d47e5-4dde-4720-affb-3025c5f3673e';

function request(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: BASE_URL,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
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
    if (body) req.write(JSON.stringify(body));
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
      headers: {
        'Authorization': `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
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

async function assignInQueueFlow(token, queueId, flowId, label) {
  // GET current queue data
  console.log(`[${label}] Getting current queue config...`);
  const getRes = await request('GET', `/api/v2/routing/queues/${queueId}`, token, null);
  if (getRes.status !== 200) {
    throw new Error(`[${label}] GET queue failed (${getRes.status}): ${JSON.stringify(getRes.body)}`);
  }
  const queue = getRes.body;
  console.log(`[${label}] Got queue: ${queue.name}`);

  // Set the queueFlow
  queue.queueFlow = { id: flowId };

  // PUT back with full queue object
  const putRes = await request('PUT', `/api/v2/routing/queues/${queueId}`, token, queue);
  if (putRes.status === 200) {
    console.log(`[${label}] SUCCESS - queueFlow set to: ${JSON.stringify(putRes.body.queueFlow)}`);
  } else {
    throw new Error(`[${label}] PUT queue failed (${putRes.status}): ${JSON.stringify(putRes.body)}`);
  }
}

async function main() {
  console.log('Getting access token...');
  const token = await getToken();
  console.log('Token obtained.\n');

  await assignInQueueFlow(token, US_QUEUE_ID, US_INQUEUE_FLOW_ID, 'US');
  console.log();
  await assignInQueueFlow(token, INDIA_QUEUE_ID, INDIA_INQUEUE_FLOW_ID, 'India');

  console.log('\n=== BOTH IN-QUEUE FLOWS ASSIGNED TO QUEUES ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
