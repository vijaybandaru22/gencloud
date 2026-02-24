const https = require('https');
const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const BASE_URL = 'usw2.pure.cloud';
const VOICE_SURVEY_FLOW_ID = 'a0c88d4e-570a-40a6-8feb-8090869df003';
const US_QUEUE_ID = 'ed1d516d-a9c9-4594-9420-d3e574042d0b';
const INDIA_QUEUE_ID = '13f15c0b-11dc-41b2-9a69-204056f3b310';

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function apiCall(token, method, path, body) {
  const bs = body ? JSON.stringify(body) : null;
  const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  if (bs) headers['Content-Length'] = Buffer.byteLength(bs);
  return httpsRequest({ hostname: 'api.' + BASE_URL, path, method, headers }, bs);
}

async function main() {
  // Auth
  const creds = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
  const body = 'grant_type=client_credentials';
  const r = await httpsRequest({
    hostname: 'login.' + BASE_URL, path: '/oauth/token', method: 'POST',
    headers: { 'Authorization': 'Basic ' + creds, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
  }, body);
  const token = r.body.access_token;
  console.log('Authenticated OK');

  // Inspect queue fields to find survey-related props
  console.log('\n--- Inspecting Claude_US_Queue fields ---');
  const qR = await apiCall(token, 'GET', '/api/v2/routing/queues/' + US_QUEUE_ID);
  const fields = Object.keys(qR.body).filter(k => /survey|flow|post|voice/i.test(k));
  console.log('Survey/flow-related fields:', fields);
  console.log('Full queue (survey fields):');
  fields.forEach(f => console.log(' ', f, '=', JSON.stringify(qR.body[f])));

  // Show all queue fields to find the right one
  console.log('\nAll queue fields:', Object.keys(qR.body).join(', '));

  // Build full queue body with voiceSurveyFlow added, for PUT
  const queueBody = Object.assign({}, qR.body, {
    voiceSurveyFlow: { id: VOICE_SURVEY_FLOW_ID }
  });

  console.log('\n--- Assigning voice survey to Claude_US_Queue (PUT) ---');
  const usR = await apiCall(token, 'PUT', '/api/v2/routing/queues/' + US_QUEUE_ID, queueBody);
  console.log('Status:', usR.status);
  if (usR.status === 200) {
    console.log('[OK] Claude_US_Queue updated');
    const sf = usR.body.voiceSurveyFlow;
    console.log('voiceSurveyFlow:', sf ? sf.id : 'not set');
  } else {
    console.log('Response:', JSON.stringify(usR.body).substring(0, 300));
  }

  // Get India queue and update it too
  const indQ = await apiCall(token, 'GET', '/api/v2/routing/queues/' + INDIA_QUEUE_ID);
  const indQueueBody = Object.assign({}, indQ.body, {
    voiceSurveyFlow: { id: VOICE_SURVEY_FLOW_ID }
  });
  console.log('\n--- Assigning voice survey to Claude_India_Queue (PUT) ---');
  const indR = await apiCall(token, 'PUT', '/api/v2/routing/queues/' + INDIA_QUEUE_ID, indQueueBody);
  console.log('Status:', indR.status);
  if (indR.status === 200) {
    console.log('[OK] Claude_India_Queue updated');
    const sf = indR.body.voiceSurveyFlow;
    console.log('voiceSurveyFlow:', sf ? sf.id : 'not set');
  } else {
    console.log('Response:', JSON.stringify(indR.body).substring(0, 300));
  }
}
main().catch(e => { console.error('Error:', e.message || e); process.exit(1); });
