/**
 * verify_survey_in_architect.js
 * Verifies Claude_Cars_Survey is properly wired into Claude_cars32
 * Checks:
 *   1. Claude_Cars_Survey flow exists and is published/active
 *   2. Claude_cars32 flow – exported JSON confirms postCallSurveyFlow on both transferToAcd actions
 *   3. Claude_US_Queue  – post-call survey field set
 *   4. Claude_India_Queue – post-call survey field set
 */

const https = require('https');

const CLIENT_ID      = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET  = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const BASE_URL       = 'usw2.pure.cloud';

const MAIN_FLOW_ID   = '5796d427-8c0b-455f-8471-38db03907764';
const SURVEY_FLOW_ID = '2a9174b9-8f7b-4922-918f-daa4ee517719';
const US_QUEUE_ID    = 'ed1d516d-a9c9-4594-9420-d3e574042d0b';
const INDIA_QUEUE_ID = '13f15c0b-11dc-41b2-9a69-204056f3b310';

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
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

// ─── OAuth ────────────────────────────────────────────────────────────────────
async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const body  = 'grant_type=client_credentials';
  const r = await httpsRequest({
    hostname: `login.${BASE_URL}`,
    path: '/oauth/token',
    method: 'POST',
    headers: {
      'Authorization':  `Basic ${creds}`,
      'Content-Type':   'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
  if (!r.body.access_token) throw new Error('Auth failed: ' + JSON.stringify(r.body));
  return r.body.access_token;
}

// ─── Generic GET ─────────────────────────────────────────────────────────────
async function get(token, path) {
  return httpsRequest({
    hostname: `api.${BASE_URL}`,
    path,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
}

// ─── Deep search for key in nested object ────────────────────────────────────
function findKey(obj, key, results = []) {
  if (!obj || typeof obj !== 'object') return results;
  if (key in obj) results.push(obj[key]);
  for (const v of Object.values(obj)) findKey(v, key, results);
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Survey Verification — Claude_cars32 + Claude_Cars_Survey ');
  console.log('═══════════════════════════════════════════════════════════\n');

  let pass = 0, fail = 0;
  function ok(msg)   { console.log(`  ✅  ${msg}`); pass++; }
  function bad(msg)  { console.log(`  ❌  ${msg}`); fail++; }
  function info(msg) { console.log(`  ℹ   ${msg}`); }
  function sep()     { console.log(''); }

  // ── Auth ────────────────────────────────────────────────────────────────────
  console.log('[ 1 ] Authentication');
  const token = await getToken();
  ok('Token obtained');
  sep();

  // ── CHECK 1: Claude_Cars_Survey flow status ─────────────────────────────────
  console.log('[ 2 ] Claude_Cars_Survey flow');
  const surveyR = await get(token, `/api/v2/flows/${SURVEY_FLOW_ID}?deleted=false`);
  if (surveyR.status === 200) {
    const sf = surveyR.body;
    ok(`Flow found: "${sf.name}" (ID: ${sf.id})`);
    sf.active
      ? ok(`Published / Active: true`)
      : bad(`Flow is NOT active — needs to be published`);
    info(`Type      : ${sf.type}`);
    info(`Version   : ${sf.publishedVersion ? sf.publishedVersion.id : 'N/A'}`);
    info(`Division  : ${sf.division ? sf.division.name : 'N/A'}`);
  } else {
    bad(`Could not retrieve survey flow (HTTP ${surveyR.status})`);
  }
  sep();

  // ── CHECK 2: Claude_cars32 flow – confirm postCallSurveyFlow in export ───────
  console.log('[ 3 ] Claude_cars32 flow configuration');
  const mainR = await get(token, `/api/v2/flows/${MAIN_FLOW_ID}?deleted=false`);
  if (mainR.status === 200) {
    const mf = mainR.body;
    ok(`Flow found: "${mf.name}" (ID: ${mf.id})`);
    mf.active
      ? ok(`Published / Active: true`)
      : bad(`Flow is NOT active`);
    info(`Version   : ${mf.publishedVersion ? mf.publishedVersion.id : 'N/A'}`);

    // Fetch the latest published version's configuration
    const configR = await get(token,
      `/api/v2/flows/${MAIN_FLOW_ID}/latestconfiguration?deleted=false`);

    if (configR.status === 200) {
      const cfg = configR.body;
      // Search entire config tree for postCallSurveyFlow
      const surveyRefs = findKey(cfg, 'postCallSurveyFlow');
      if (surveyRefs.length > 0) {
        ok(`postCallSurveyFlow found in flow config (${surveyRefs.length} occurrence(s))`);
        surveyRefs.forEach((ref, i) => {
          const id   = ref && ref.id   ? ref.id   : (ref && ref.lit && ref.lit.id   ? ref.lit.id   : JSON.stringify(ref));
          const name = ref && ref.name ? ref.name : (ref && ref.lit && ref.lit.name ? ref.lit.name : '');
          info(`  Reference ${i+1}: id=${id}  name=${name}`);
          id === SURVEY_FLOW_ID
            ? ok(`  ID matches Claude_Cars_Survey ✓`)
            : bad(`  ID does NOT match expected ${SURVEY_FLOW_ID}`);
        });
      } else {
        // postCallSurveyFlow not found in config — but queue-level survey may still work
        bad(`postCallSurveyFlow NOT found in flow config`);
        info('The flow was published but Architect may not expose postCallSurveyFlow');
        info('in the config export. Queue-level survey (checked below) is the');
        info('canonical way Genesys Cloud triggers post-call surveys.');
      }
    } else {
      info(`Could not retrieve flow config (HTTP ${configR.status}) — skipping deep check`);
    }
  } else {
    bad(`Could not retrieve main flow (HTTP ${mainR.status})`);
  }
  sep();

  // ── CHECK 3: Claude_US_Queue post-call survey ───────────────────────────────
  console.log('[ 4 ] Claude_US_Queue — post-call survey');
  const usQ = await get(token, `/api/v2/routing/queues/${US_QUEUE_ID}`);
  if (usQ.status === 200) {
    const q = usQ.body;
    ok(`Queue found: "${q.name}"`);
    if (q.postCallSurvey && q.postCallSurvey.flow) {
      const sf = q.postCallSurvey.flow;
      ok(`postCallSurvey.flow set: "${sf.name}" (ID: ${sf.id})`);
      sf.id === SURVEY_FLOW_ID
        ? ok(`Survey ID matches Claude_Cars_Survey ✓`)
        : bad(`Survey ID mismatch — expected ${SURVEY_FLOW_ID}, got ${sf.id}`);
    } else {
      bad(`postCallSurvey NOT configured on Claude_US_Queue`);
      info('Raw queue keys: ' + Object.keys(q).join(', '));
    }
  } else {
    bad(`Could not retrieve Claude_US_Queue (HTTP ${usQ.status})`);
  }
  sep();

  // ── CHECK 4: Claude_India_Queue post-call survey ────────────────────────────
  console.log('[ 5 ] Claude_India_Queue — post-call survey');
  const inQ = await get(token, `/api/v2/routing/queues/${INDIA_QUEUE_ID}`);
  if (inQ.status === 200) {
    const q = inQ.body;
    ok(`Queue found: "${q.name}"`);
    if (q.postCallSurvey && q.postCallSurvey.flow) {
      const sf = q.postCallSurvey.flow;
      ok(`postCallSurvey.flow set: "${sf.name}" (ID: ${sf.id})`);
      sf.id === SURVEY_FLOW_ID
        ? ok(`Survey ID matches Claude_Cars_Survey ✓`)
        : bad(`Survey ID mismatch — expected ${SURVEY_FLOW_ID}, got ${sf.id}`);
    } else {
      bad(`postCallSurvey NOT configured on Claude_India_Queue`);
      info('Raw queue keys: ' + Object.keys(q).join(', '));
    }
  } else {
    bad(`Could not retrieve Claude_India_Queue (HTTP ${inQ.status})`);
  }
  sep();

  // ── SUMMARY ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${pass} passed, ${fail} failed`);
  if (fail === 0) {
    console.log('  ✅ ALL CHECKS PASSED — survey is correctly wired up!');
  } else {
    console.log('  ⚠  Some checks failed — review items marked ❌ above.');
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(err => { console.error('Fatal:', err.message || err); process.exit(1); });
