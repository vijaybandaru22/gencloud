const https = require('https');
const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const BASE_URL = 'usw2.pure.cloud';

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

async function apiCall(token, method, path) {
  const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  return httpsRequest({ hostname: 'api.' + BASE_URL, path, method, headers });
}

async function main() {
  // Auth
  const creds = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
  const body = 'grant_type=client_credentials';
  const r = await httpsRequest({
    hostname: 'login.' + BASE_URL, path: '/oauth/token', method: 'POST',
    headers: {
      'Authorization': 'Basic ' + creds,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);

  if (!r.body.access_token) {
    console.error('Auth failed:', JSON.stringify(r.body));
    process.exit(1);
  }
  const token = r.body.access_token;
  console.log('Authenticated OK\n');

  let allOk = true;

  // 1. Verify survey form
  console.log('=== 1. Survey Form ===');
  const formR = await apiCall(token, 'GET', '/api/v2/quality/publishedforms/surveys?pageSize=25');
  if (formR.status === 200 && formR.body.entities) {
    const form = formR.body.entities.find(f => f.name === 'Claude_Cars_Quality_Survey');
    if (form) {
      console.log('  [OK] Claude_Cars_Quality_Survey found');
      console.log('       ID:', form.id);
      console.log('       Published:', form.published);
      console.log('       Status:', form.status || 'active');
    } else {
      console.log('  [FAIL] Claude_Cars_Quality_Survey NOT found in published forms');
      allOk = false;
    }
  } else {
    console.log('  [FAIL] Could not list published survey forms. Status:', formR.status);
    allOk = false;
  }

  // 2. Verify survey invite flow
  console.log('\n=== 2. Survey Invite Flow ===');
  const flowR = await apiCall(token, 'GET', '/api/v2/flows?type=surveyinvite&pageSize=25');
  if (flowR.status === 200 && flowR.body.entities) {
    const flow = flowR.body.entities.find(f => f.name === 'Claude_Cars_Survey_Invite');
    if (flow) {
      console.log('  [OK] Claude_Cars_Survey_Invite found');
      console.log('       ID:', flow.id);
      console.log('       Published:', flow.publishedVersion ? 'YES (v' + flow.publishedVersion.version + ')' : 'NO');
      console.log('       Active:', flow.active);
    } else {
      console.log('  [FAIL] Claude_Cars_Survey_Invite NOT found');
      allOk = false;
    }
  } else {
    console.log('  [FAIL] Could not list flows. Status:', flowR.status);
    allOk = false;
  }

  // 3. Verify media retention policy
  console.log('\n=== 3. Media Retention Policy ===');
  const polR = await apiCall(token, 'GET', '/api/v2/recording/mediaretentionpolicies?pageSize=50');
  if (polR.status === 200 && polR.body.entities) {
    const pol = polR.body.entities.find(p => p.name === 'Claude_Cars_Survey_Policy');
    if (pol) {
      console.log('  [OK] Claude_Cars_Survey_Policy found');
      console.log('       ID:', pol.id);
      console.log('       Enabled:', pol.enabled);

      const cp = pol.mediaPolicies && pol.mediaPolicies.callPolicy;
      const surveys = cp && cp.actions && cp.actions.assignSurveys;
      if (surveys && surveys.length > 0) {
        console.log('  [OK] assignSurveys present (' + surveys.length + ' entry)');
        const s = surveys[0];
        console.log('       Survey form:', s.surveyForm && s.surveyForm.name);
        console.log('       Survey flow:', s.flow && s.flow.name);
        console.log('       Invite interval:', s.inviteTimeInterval);
        console.log('       Sending domain:', s.sendingDomain);
      } else {
        console.log('  [FAIL] assignSurveys NOT present in policy');
        allOk = false;
      }

      const conds = cp && cp.conditions;
      if (conds) {
        const queues = conds.forQueues || [];
        console.log('  [OK] Conditions: directions=' + JSON.stringify(conds.directions));
        console.log('       Queue count:', queues.length);
        queues.forEach(q => console.log('         Queue ID:', q.id));
      }
    } else {
      console.log('  [FAIL] Claude_Cars_Survey_Policy NOT found');
      allOk = false;
    }
  } else {
    console.log('  [FAIL] Could not list policies. Status:', polR.status);
    allOk = false;
  }

  // 4. Verify queues
  console.log('\n=== 4. Queues ===');
  const qR = await apiCall(token, 'GET', '/api/v2/routing/queues?name=Claude_US_Queue&pageSize=5');
  const qR2 = await apiCall(token, 'GET', '/api/v2/routing/queues?name=Claude_India_Queue&pageSize=5');
  const usQ = qR.body.entities && qR.body.entities[0];
  const indQ = qR2.body.entities && qR2.body.entities[0];
  if (usQ) {
    console.log('  [OK] Claude_US_Queue:', usQ.id);
  } else {
    console.log('  [FAIL] Claude_US_Queue not found');
    allOk = false;
  }
  if (indQ) {
    console.log('  [OK] Claude_India_Queue:', indQ.id);
  } else {
    console.log('  [FAIL] Claude_India_Queue not found');
    allOk = false;
  }

  // 5. Verify main inbound flow
  console.log('\n=== 5. Main Inbound Flow ===');
  const mainR = await apiCall(token, 'GET', '/api/v2/flows?type=inboundcall&pageSize=25&name=Claude_cars32');
  if (mainR.status === 200 && mainR.body.entities) {
    const mf = mainR.body.entities.find(f => f.name === 'Claude_cars32');
    if (mf) {
      console.log('  [OK] Claude_cars32 inbound flow found');
      console.log('       ID:', mf.id);
      console.log('       Published:', mf.publishedVersion ? 'YES (v' + mf.publishedVersion.version + ')' : 'NO');
    } else {
      console.log('  [WARN] Claude_cars32 not found by name filter (may still exist)');
    }
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  if (allOk) {
    console.log('[ALL OK] QM Survey setup is complete and verified!');
    console.log('\nWhat happens when a call comes in:');
    console.log('  1. Call arrives -> Claude_cars32 inbound flow routes to US/India queue');
    console.log('  2. Agent handles call and ends it');
    console.log('  3. Media retention policy detects ended INBOUND call from those queues');
    console.log('  4. Policy triggers Claude_Cars_Survey_Invite flow (surveyInvite type)');
    console.log('  5. Survey invite email sent to customer using Claude_Cars_Quality_Survey form');
    console.log('  6. Customer clicks link -> completes web survey');
    console.log('  7. Results appear in Genesys Quality Management dashboard');
  } else {
    console.log('[ISSUES FOUND] Some components need attention (see above)');
  }
}

main().catch(e => { console.error('Error:', e.message || e); process.exit(1); });
