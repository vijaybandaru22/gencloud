/**
 * deep_verify_survey.js
 * Deep inspection of:
 *  1. Actual published flow JSON config — search every node for survey refs
 *  2. Queue objects with expand parameters — find the correct survey field
 *  3. Quality/survey API endpoints
 *  4. YAML file — confirm postCallSurveyFlow is present locally
 */

const https = require('https');
const fs    = require('fs');

const CLIENT_ID      = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET  = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const BASE_URL       = 'usw2.pure.cloud';

const MAIN_FLOW_ID   = '5796d427-8c0b-455f-8471-38db03907764';
const SURVEY_FLOW_ID = '2a9174b9-8f7b-4922-918f-daa4ee517719';
const US_QUEUE_ID    = 'ed1d516d-a9c9-4594-9420-d3e574042d0b';
const _INDIA_QUEUE_ID = '13f15c0b-11dc-41b2-9a69-204056f3b310';

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(_e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const body  = 'grant_type=client_credentials';
  const r = await httpsRequest({
    hostname: `login.${BASE_URL}`, path: '/oauth/token', method: 'POST',
    headers: { 'Authorization': `Basic ${creds}`,
               'Content-Type': 'application/x-www-form-urlencoded',
               'Content-Length': Buffer.byteLength(body) }
  }, body);
  if (!r.body.access_token) throw new Error('Auth: ' + JSON.stringify(r.body));
  return r.body.access_token;
}

async function get(token, path) {
  return httpsRequest({
    hostname: `api.${BASE_URL}`, path, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
}

async function put(token, path, body) {
  const bs = JSON.stringify(body);
  return httpsRequest({
    hostname: `api.${BASE_URL}`, path, method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json',
               'Content-Length': Buffer.byteLength(bs) }
  }, bs);
}

// Search any nested object for a string value
function searchObj(obj, searchStr, path='', found=[]) {
  if (!obj || typeof obj !== 'object') return found;
  for (const [k, v] of Object.entries(obj)) {
    const cur = `${path}.${k}`;
    if (typeof v === 'string' && v.toLowerCase().includes(searchStr.toLowerCase())) {
      found.push({ path: cur, value: v });
    } else if (typeof v === 'object') {
      searchObj(v, searchStr, cur, found);
    }
  }
  return found;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Deep Survey Verification');
  console.log('═══════════════════════════════════════════════════\n');

  const token = await getToken();
  console.log('✓ Authenticated\n');

  // ── 1. Check YAML file locally ─────────────────────────────────────────────
  console.log('━━━ [A] YAML File Check ━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const yaml = fs.readFileSync('C:\\Users\\VijayBandaru\\Claude_cars32_final.yaml', 'utf8');
  const surveyLines = yaml.split(/\r?\n/).filter(l =>
    l.includes('postCallSurveyFlow') || l.includes('Claude_Cars_Survey') ||
    l.includes('2a9174b9'));
  if (surveyLines.length > 0) {
    console.log('  ✅ postCallSurveyFlow found in YAML:');
    surveyLines.forEach(l => console.log(`    ${l.trim()}`));
  } else {
    console.log('  ❌ postCallSurveyFlow NOT found in YAML');
  }

  // ── 2. Flow config export — search for survey ID ───────────────────────────
  console.log('\n━━━ [B] Claude_cars32 Published Config ━━━━━━━━━━━━');
  const cfgR = await get(token,
    `/api/v2/flows/${MAIN_FLOW_ID}/latestconfiguration?deleted=false`);
  if (cfgR.status === 200) {
    const hits = searchObj(cfgR.body, 'survey');
    const idHits = searchObj(cfgR.body, SURVEY_FLOW_ID);
    const nameHits = searchObj(cfgR.body, 'Claude_Cars_Survey');
    console.log(`  Config keys (top-level): ${Object.keys(cfgR.body).join(', ')}`);
    if (hits.length)     { console.log(`\n  Paths containing "survey":`); hits.forEach(h => console.log(`    ${h.path} = ${h.value}`)); }
    else                 { console.log('  No "survey" references found in published config'); }
    if (idHits.length)   { console.log(`\n  Paths containing survey flow ID:`); idHits.forEach(h => console.log(`    ${h.path} = ${h.value}`)); }
    if (nameHits.length) { console.log(`\n  Paths containing "Claude_Cars_Survey":`); nameHits.forEach(h => console.log(`    ${h.path} = ${h.value}`)); }
  } else {
    console.log(`  Config fetch returned HTTP ${cfgR.status}`);
    console.log(`  Body: ${JSON.stringify(cfgR.body).substring(0, 200)}`);
  }

  // ── 3. Queue — try with expand ─────────────────────────────────────────────
  console.log('\n━━━ [C] Claude_US_Queue (with expand) ━━━━━━━━━━━━━');
  const usExpR = await get(token,
    `/api/v2/routing/queues/${US_QUEUE_ID}?expand=queueFlow,callerSurvey,postCallSurvey`);
  if (usExpR.status === 200) {
    const q = usExpR.body;
    console.log(`  All keys: ${Object.keys(q).join(', ')}`);
    const surveyHits = searchObj(q, 'survey');
    const idHits2    = searchObj(q, SURVEY_FLOW_ID);
    if (surveyHits.length) { console.log('\n  Survey-related fields:'); surveyHits.forEach(h => console.log(`    ${h.path} = ${h.value}`)); }
    else                   { console.log('  No survey fields found in queue'); }
    if (idHits2.length)    { console.log('\n  Survey flow ID matches:'); idHits2.forEach(h => console.log(`    ${h.path} = ${h.value}`)); }

    // Check queueFlow
    if (q.queueFlow) {
      console.log(`\n  queueFlow: ${q.queueFlow.name || JSON.stringify(q.queueFlow)}`);
    }
  } else {
    console.log(`  HTTP ${usExpR.status}: ${JSON.stringify(usExpR.body).substring(0,200)}`);
  }

  // ── 4. Quality surveys API ─────────────────────────────────────────────────
  console.log('\n━━━ [D] Quality Survey Forms ━━━━━━━━━━━━━━━━━━━━━━');
  const qualR = await get(token, `/api/v2/quality/forms/surveys?pageSize=25`);
  if (qualR.status === 200 && qualR.body.entities) {
    if (qualR.body.entities.length === 0) {
      console.log('  No Quality survey forms found (different feature from Architect flows)');
    } else {
      qualR.body.entities.forEach(s =>
        console.log(`  Survey form: ${s.name} (ID: ${s.id})`));
    }
  } else {
    console.log(`  Quality surveys API: HTTP ${qualR.status}`);
  }

  // ── 5. Check flow versions to see if v5 has our changes ───────────────────
  console.log('\n━━━ [E] Claude_cars32 Version History ━━━━━━━━━━━━━');
  const versR = await get(token,
    `/api/v2/flows/${MAIN_FLOW_ID}/versions?pageSize=5`);
  if (versR.status === 200 && versR.body.entities) {
    versR.body.entities.forEach(v =>
      console.log(`  Version ${v.id}, publishedBy: ${v.createdBy ? v.createdBy.name : 'N/A'}, date: ${v.dateCreated}`));
  }

  // ── 6. Attempt to set survey via queue callerSurvey / postCallSurvey ────────
  console.log('\n━━━ [F] Re-configure Queue Survey (correct field) ━━');
  // Try fetching the full queue and checking what fields are writable
  const usQ2 = await get(token, `/api/v2/routing/queues/${US_QUEUE_ID}`);
  const qData = usQ2.body;

  // Try setting survey via the "callerSurvey" field (alternate name)
  const updateBody = {
    ...qData,
    callerSurvey: {
      flow: { id: SURVEY_FLOW_ID, name: 'Claude_Cars_Survey' }
    },
    postCallSurvey: {
      flow: { id: SURVEY_FLOW_ID, name: 'Claude_Cars_Survey' }
    }
  };
  delete updateBody.selfUri;

  const putR = await put(token, `/api/v2/routing/queues/${US_QUEUE_ID}`, updateBody);
  console.log(`  PUT Claude_US_Queue: HTTP ${putR.status}`);
  if (putR.status === 200) {
    const updated = putR.body;
    const surveyCheck = searchObj(updated, 'survey');
    if (surveyCheck.length) {
      console.log('  ✅ Survey fields in updated queue:');
      surveyCheck.forEach(h => console.log(`    ${h.path} = ${h.value}`));
    } else {
      console.log('  ⚠ Queue updated but no survey field in response');
    }
  } else {
    console.log(`  Response: ${JSON.stringify(putR.body).substring(0, 300)}`);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Deep verification complete. See findings above.');
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
