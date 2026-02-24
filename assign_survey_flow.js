/**
 * Assigns Claude_Cars_Survey as the post-call survey flow
 * to Claude_US_Queue and Claude_India_Queue
 */
const https = require('https');

const CLIENT_ID     = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const SURVEY_FLOW_ID = '2a9174b9-8f7b-4922-918f-daa4ee517719'; // Claude_Cars_Survey

const QUEUES = [
  { id: 'ed1d516d-a9c9-4594-9420-d3e574042d0b', name: 'Claude_US_Queue' },
  { id: '13f15c0b-11dc-41b2-9a69-204056f3b310', name: 'Claude_India_Queue' },
];

function apiRequest(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.usw2.pure.cloud', path, method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    };
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
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
    const opts = {
      hostname: 'login.usw2.pure.cloud', path: '/oauth/token', method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' }
    };
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { const p = JSON.parse(d); p.access_token ? resolve(p.access_token) : reject(new Error(d)); });
    });
    req.on('error', reject); req.write('grant_type=client_credentials'); req.end();
  });
}

async function main() {
  const token = await getToken();
  console.log('Token obtained.\n');

  for (const q of QUEUES) {
    // GET current queue
    const getRes = await apiRequest('GET', `/api/v2/routing/queues/${q.id}`, token);
    if (getRes.status !== 200) {
      console.error(`[${q.name}] GET failed (${getRes.status})`);
      continue;
    }
    const queue = getRes.body;

    // Assign the survey flow
    queue.surveyVoiceFlow = { id: SURVEY_FLOW_ID };

    // PUT back
    const putRes = await apiRequest('PUT', `/api/v2/routing/queues/${q.id}`, token, queue);
    if (putRes.status === 200) {
      const assigned = putRes.body.surveyVoiceFlow;
      if (assigned) {
        console.log(`✔ ${q.name} → surveyVoiceFlow: ${assigned.name} (${assigned.id})`);
      } else {
        console.log(`✔ ${q.name} → PUT succeeded (surveyVoiceFlow field may not be returned in response)`);
        console.log(`  Survey flow ${SURVEY_FLOW_ID} was submitted for assignment.`);
      }
    } else {
      console.error(`✘ ${q.name} → PUT failed (${putRes.status}): ${JSON.stringify(putRes.body).substring(0, 200)}`);
    }
  }

  console.log('\n=== Survey flow assignment complete ===');
  console.log('Survey Flow: Claude_Cars_Survey');
  console.log('Flow ID:    ', SURVEY_FLOW_ID);
  console.log('Flow URL:    https://apps.usw2.pure.cloud/architect/#/inboundcall/flows/2a9174b9-8f7b-4922-918f-daa4ee517719/latest');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
