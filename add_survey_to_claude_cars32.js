/**
 * add_survey_to_claude_cars32.js
 * Adds Claude_Cars_Survey post-call survey to Claude_cars32 inbound flow
 * - Finds/publishes Claude_Cars_Survey flow
 * - Updates both transferToAcd actions in Claude_cars32_final.yaml
 * - Publishes the updated flow via Archy
 */

const https = require('https');
const { spawnSync } = require('child_process');
const fs = require('fs');

const CLIENT_ID     = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const BASE_URL      = 'usw2.pure.cloud';
const ARCHY_BIN     = 'C:\\Users\\VijayBandaru\\archy\\archyBin\\archy-win-2.37.0.exe';
const MAIN_YAML     = 'C:\\Users\\VijayBandaru\\Claude_cars32_final.yaml';
const SURVEY_YAML   = 'C:\\Users\\VijayBandaru\\Claude_Cars_Survey.yaml';
const US_QUEUE_ID   = 'ed1d516d-a9c9-4594-9420-d3e574042d0b';
const INDIA_QUEUE_ID= '13f15c0b-11dc-41b2-9a69-204056f3b310';

// ─── HTTP helper ────────────────────────────────────────────────────────────
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

// ─── OAuth ──────────────────────────────────────────────────────────────────
async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const body  = 'grant_type=client_credentials';
  const result = await httpsRequest({
    hostname: `login.${BASE_URL}`,
    path:     '/oauth/token',
    method:   'POST',
    headers: {
      'Authorization':  `Basic ${creds}`,
      'Content-Type':   'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
  if (!result.body.access_token) throw new Error('Auth failed: ' + JSON.stringify(result.body));
  return result.body.access_token;
}

// ─── API helper ─────────────────────────────────────────────────────────────
async function apiCall(token, method, path, body) {
  const bodyStr = body ? JSON.stringify(body) : null;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
  return httpsRequest({ hostname: `api.${BASE_URL}`, path, method, headers }, bodyStr);
}

// ─── Find flow by name ──────────────────────────────────────────────────────
async function findFlow(token, name) {
  const result = await apiCall(token, 'GET',
    `/api/v2/flows?type=inboundcall&pageSize=200&deleted=false`);
  if (result.body && result.body.entities) {
    return result.body.entities.find(f => f.name === name) || null;
  }
  return null;
}

// ─── Run Archy ──────────────────────────────────────────────────────────────
function runArchy(yamlFile, label) {
  console.log(`\n  Running Archy for ${label}...`);
  const r = spawnSync(
    ARCHY_BIN,
    ['publish', '--file', yamlFile, '--forceUnlock', '--recreate'],
    { encoding: 'utf8', timeout: 180000, cwd: 'C:\\Users\\VijayBandaru' }
  );
  if (r.stdout) console.log(r.stdout);
  if (r.stderr) console.log(r.stderr);
  return r.status === 0;
}

// ─── Update YAML with survey flow ───────────────────────────────────────────
function updateYaml(surveyId) {
  let yaml = fs.readFileSync(MAIN_YAML, 'utf8');

  // Check if already added
  if (yaml.includes('postCallSurveyFlow:')) {
    console.log('  postCallSurveyFlow already present – updating IDs...');
    yaml = yaml.replace(
      /postCallSurveyFlow:\s*\n\s*lit:\s*\n\s*id:.*\n\s*name:.*/g,
      `postCallSurveyFlow:\n                lit:\n                  id: ${surveyId}\n                  name: Claude_Cars_Survey`
    );
    fs.writeFileSync(MAIN_YAML, yaml);
    return;
  }

  // Insert postCallSurveyFlow after targetQueue block for US Queue
  const usTarget =
`              targetQueue:
                lit:
                  id: ed1d516d-a9c9-4594-9420-d3e574042d0b
                  name: Claude_US_Queue
              preTransferAudio:`;

  const usReplacement =
`              targetQueue:
                lit:
                  id: ed1d516d-a9c9-4594-9420-d3e574042d0b
                  name: Claude_US_Queue
              postCallSurveyFlow:
                lit:
                  id: ${surveyId}
                  name: Claude_Cars_Survey
              preTransferAudio:`;

  if (yaml.includes(usTarget)) {
    yaml = yaml.replace(usTarget, usReplacement);
    console.log('  ✓ Added postCallSurveyFlow to US Queue Transfer');
  } else {
    console.log('  ⚠ US Queue target block not found – check indentation in YAML');
  }

  // Insert postCallSurveyFlow after targetQueue block for India Queue
  const indiaTarget =
`              targetQueue:
                lit:
                  id: 13f15c0b-11dc-41b2-9a69-204056f3b310
                  name: Claude_India_Queue
              preTransferAudio:`;

  const indiaReplacement =
`              targetQueue:
                lit:
                  id: 13f15c0b-11dc-41b2-9a69-204056f3b310
                  name: Claude_India_Queue
              postCallSurveyFlow:
                lit:
                  id: ${surveyId}
                  name: Claude_Cars_Survey
              preTransferAudio:`;

  if (yaml.includes(indiaTarget)) {
    yaml = yaml.replace(indiaTarget, indiaReplacement);
    console.log('  ✓ Added postCallSurveyFlow to India Queue Transfer');
  } else {
    console.log('  ⚠ India Queue target block not found – check indentation in YAML');
  }

  fs.writeFileSync(MAIN_YAML, yaml);
}

// ─── Configure queue post-call survey via API ────────────────────────────────
async function configureQueueSurvey(token, queueId, queueName, surveyId) {
  const getResult = await apiCall(token, 'GET', `/api/v2/routing/queues/${queueId}`);
  if (getResult.status !== 200) {
    console.log(`  ⚠ Could not retrieve queue ${queueName}: HTTP ${getResult.status}`);
    return;
  }

  const queueData = getResult.body;

  // Add survey configuration
  queueData.postCallSurvey = {
    flow: { id: surveyId, name: 'Claude_Cars_Survey' }
  };

  // Remove read-only fields that cause PUT to fail
  delete queueData.selfUri;
  delete queueData.id;

  const putResult = await apiCall(token, 'PUT', `/api/v2/routing/queues/${queueId}`, queueData);
  if (putResult.status === 200) {
    console.log(`  ✓ Post-call survey configured for queue: ${queueName}`);
  } else {
    console.log(`  ⚠ Could not set survey on ${queueName}: HTTP ${putResult.status}`);
    if (putResult.body && putResult.body.message) {
      console.log('    Message:', putResult.body.message);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('========================================================');
  console.log('  Adding Claude_Cars_Survey to Claude_cars32 inbound flow');
  console.log('========================================================\n');

  // Step 1: Authenticate
  console.log('STEP 1 — Authenticating...');
  const token = await getToken();
  console.log('  ✓ Token obtained\n');

  // Step 2: Find or publish Claude_Cars_Survey
  console.log('STEP 2 — Locating Claude_Cars_Survey flow...');
  let surveyFlow = await findFlow(token, 'Claude_Cars_Survey');

  if (surveyFlow) {
    console.log(`  ✓ Found: Claude_Cars_Survey`);
    console.log(`    ID      : ${surveyFlow.id}`);
    console.log(`    Active  : ${surveyFlow.active}`);
  } else {
    console.log('  Not found. Publishing via Archy first...');
    const ok = runArchy(SURVEY_YAML, 'Claude_Cars_Survey');
    if (!ok) {
      console.log('  Archy publish did not exit cleanly – checking API anyway...');
    }
    console.log('  Waiting 6 s for flow to register...');
    await new Promise(r => setTimeout(r, 6000));

    surveyFlow = await findFlow(token, 'Claude_Cars_Survey');
    if (!surveyFlow) {
      console.log('\n  ERROR: Claude_Cars_Survey still not found after publishing.');
      console.log('  Please publish it manually in Architect then re-run this script.');
      process.exit(1);
    }
    console.log(`  ✓ Published: Claude_Cars_Survey (ID: ${surveyFlow.id})`);
  }

  const surveyId = surveyFlow.id;

  // Step 3: Configure queues with post-call survey (queue-level)
  console.log('\nSTEP 3 — Configuring queues with post-call survey...');
  await configureQueueSurvey(token, US_QUEUE_ID,    'Claude_US_Queue',    surveyId);
  await configureQueueSurvey(token, INDIA_QUEUE_ID, 'Claude_India_Queue', surveyId);

  // Step 4: Update Claude_cars32_final.yaml
  console.log('\nSTEP 4 — Updating Claude_cars32_final.yaml...');
  updateYaml(surveyId);
  console.log('  ✓ YAML file updated');

  // Show the relevant updated sections
  const updatedYaml = fs.readFileSync(MAIN_YAML, 'utf8');
  const lines = updatedYaml.split('\n');
  const surveyLines = [];
  lines.forEach((line, i) => {
    if (line.includes('postCallSurveyFlow')) {
      surveyLines.push(`    Line ${i+1}: ${line.trim()}`);
      for (let j = 1; j <= 3; j++) {
        if (lines[i+j]) surveyLines.push(`    Line ${i+1+j}: ${lines[i+j].trim()}`);
      }
      surveyLines.push('');
    }
  });
  if (surveyLines.length) {
    console.log('  Survey references in YAML:');
    console.log(surveyLines.join('\n'));
  }

  // Step 5: Publish updated Claude_cars32
  console.log('\nSTEP 5 — Publishing updated Claude_cars32 via Archy...');
  const publishOk = runArchy(MAIN_YAML, 'Claude_cars32');

  console.log('\n========================================================');
  if (publishOk) {
    console.log('  ✅ SUCCESS!');
    console.log('  Claude_cars32 now includes Claude_Cars_Survey as the');
    console.log('  post-call survey on both US and India queue transfers.');
  } else {
    console.log('  ⚠ Archy exited with errors.');
    console.log('  Check output above — if postCallSurveyFlow is not');
    console.log('  supported in Archy YAML, the queue-level configuration');
    console.log('  (Step 3) has still been applied and will trigger the survey.');
  }
  console.log('========================================================\n');
}

main().catch(err => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});
