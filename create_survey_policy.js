const https = require('https');
const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const BASE_URL = 'usw2.pure.cloud';
const PUBLISHED_FORM_ID = '76a9fbea-17b4-4fca-90bc-45fde3df3699';
const SURVEY_FLOW_ID = '8e0c7faf-39b7-4257-9494-20a93624189b';
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

  // Check if policy already exists
  const listR = await apiCall(token, 'GET', '/api/v2/recording/mediaretentionpolicies?pageSize=50');
  if (listR.body.entities) {
    const existing = listR.body.entities.find(p => p.name === 'Claude_Cars_Survey_Policy');
    if (existing) {
      console.log('Policy already exists - ID:', existing.id);
      return;
    }
  }

  // Create media retention policy with assignSurveys
  const policyBody = {
    name: 'Claude_Cars_Survey_Policy',
    description: 'Auto-send post-call survey after Claude Cars voice interactions',
    enabled: true,
    mediaPolicies: {
      callPolicy: {
        actions: {
          assignSurveys: [
            {
              surveyForm: {
                id: PUBLISHED_FORM_ID,
                name: 'Claude_Cars_Quality_Survey',
                contextId: '6987074c-47ca-4539-bf3b-e729d87943a3'
              },
              flow: {
                id: SURVEY_FLOW_ID,
                name: 'Claude_Cars_Survey_Invite'
              },
              inviteTimeInterval: 'R1/PT5M',
              sendingDomain: 'DisfrutaGlobal1234.pure.cloud'
            }
          ]
        },
        conditions: {
          forQueues: [
            { id: US_QUEUE_ID },
            { id: INDIA_QUEUE_ID }
          ],
          directions: ['INBOUND']
        }
      }
    }
  };

  console.log('Creating media retention policy...');
  const polR = await apiCall(token, 'POST', '/api/v2/recording/mediaretentionpolicies', policyBody);
  console.log('HTTP Status:', polR.status);
  if (polR.status === 200 || polR.status === 201) {
    console.log('Policy created!');
    console.log('  Name:', polR.body.name);
    console.log('  ID:', polR.body.id);
    console.log('  Enabled:', polR.body.enabled);
    const cp = polR.body.mediaPolicies && polR.body.mediaPolicies.callPolicy;
    const surveys = cp && cp.actions && cp.actions.assignSurveys;
    console.log('  assignSurveys present:', surveys ? 'YES' : 'NO');
    if (surveys && surveys.length > 0) {
      console.log('  Survey form:', surveys[0].surveyForm && surveys[0].surveyForm.name);
      console.log('  Flow:', surveys[0].flow && surveys[0].flow.name);
    }
  } else {
    console.log('Failed:', JSON.stringify(polR.body).substring(0, 500));
  }
}
main().catch(e => { console.error('Error:', e.message || e); process.exit(1); });
