/**
 * setup_qm_survey.js
 * Full Option C — Quality Management web survey setup:
 *  Step 1: Create Claude_Cars_Quality_Survey form via API
 *  Step 2: Publish the survey form
 *  Step 3: Create a surveyInvite Architect flow via Archy YAML
 *  Step 4: Assign the survey invite flow to both queues
 */

const https = require('https');
const { spawnSync } = require('child_process');
const fs = require('fs');

const CLIENT_ID      = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET  = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const BASE_URL       = 'usw2.pure.cloud';
const ARCHY_BIN      = 'C:\\Users\\VijayBandaru\\archy\\archyBin\\archy-win-2.37.0.exe';
const US_QUEUE_ID    = 'ed1d516d-a9c9-4594-9420-d3e574042d0b';
const INDIA_QUEUE_ID = '13f15c0b-11dc-41b2-9a69-204056f3b310';

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
  if (!r.body.access_token) throw new Error('Auth failed: ' + JSON.stringify(r.body));
  return r.body.access_token;
}

async function apiCall(token, method, path, body) {
  const bs = body ? JSON.stringify(body) : null;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (bs) headers['Content-Length'] = Buffer.byteLength(bs);
  return httpsRequest({ hostname: `api.${BASE_URL}`, path, method, headers }, bs);
}

function runArchy(yamlFile) {
  const r = spawnSync(ARCHY_BIN,
    ['publish', '--file', yamlFile, '--forceUnlock'],
    { encoding: 'utf8', timeout: 180000, cwd: 'C:\\Users\\VijayBandaru' });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status === 0;
}

async function main() {
  console.log('=== Claude Cars — Quality Management Survey Setup ===\n');

  // ── Auth ─────────────────────────────────────────────────────────────────
  const token = await getToken();
  console.log('✓ Authenticated\n');

  // ── STEP 1: Create survey form ────────────────────────────────────────────
  console.log('STEP 1 — Creating Claude_Cars_Quality_Survey form...');

  // Check if it already exists
  const formsR = await apiCall(token, 'GET', '/api/v2/quality/forms/surveys?pageSize=50');
  let surveyForm = formsR.body.entities
    ? formsR.body.entities.find(f => f.name === 'Claude_Cars_Quality_Survey')
    : null;

  if (surveyForm) {
    console.log('  Survey form already exists — ID:', surveyForm.id, '| Published:', surveyForm.published);
  } else {
    const formBody = {
      name: 'Claude_Cars_Quality_Survey',
      language: 'en-US',
      header: 'Claude Cars — Post-Call Customer Survey',
      footer: 'Thank you for your feedback! Your response helps us improve.',
      questionGroups: [
        {
          name: 'Agent Performance',
          type: 'questionGroup',
          questions: [
            {
              text: 'How would you rate the agent\'s knowledge and ability to answer your questions? (1 = Very Poor, 5 = Excellent)',
              type: 'multipleChoiceQuestion',
              isKill: false,
              isMandatory: false,
              answerOptions: [
                { text: '1 - Very Poor',       value: 1 },
                { text: '2 - Below Average',   value: 2 },
                { text: '3 - Average',          value: 3 },
                { text: '4 - Good',             value: 4 },
                { text: '5 - Excellent',        value: 5 }
              ]
            }
          ]
        },
        {
          name: 'Overall Satisfaction',
          type: 'questionGroup',
          questions: [
            {
              text: 'How satisfied were you with your overall call experience with Claude Cars?',
              type: 'multipleChoiceQuestion',
              isKill: false,
              isMandatory: false,
              answerOptions: [
                { text: '1 - Very Dissatisfied', value: 1 },
                { text: '2 - Dissatisfied',      value: 2 },
                { text: '3 - Neutral',           value: 3 },
                { text: '4 - Satisfied',         value: 4 },
                { text: '5 - Very Satisfied',    value: 5 }
              ]
            },
            {
              text: 'Would you recommend Claude Cars to a friend or colleague?',
              type: 'multipleChoiceQuestion',
              isKill: false,
              isMandatory: false,
              answerOptions: [
                { text: 'Yes', value: 1 },
                { text: 'No',  value: 2 }
              ]
            }
          ]
        },
        {
          name: 'Additional Comments',
          type: 'questionGroup',
          questions: [
            {
              text: 'Please share any additional comments or suggestions for improvement.',
              type: 'freeTextQuestion',
              isKill: false,
              isMandatory: false,
              maxResponseCharacters: 500
            }
          ]
        }
      ]
    };

    const createR = await apiCall(token, 'POST', '/api/v2/quality/forms/surveys', formBody);
    if (createR.status === 200 || createR.status === 201) {
      surveyForm = createR.body;
      console.log('  ✓ Survey form created — ID:', surveyForm.id);
    } else {
      console.log('  ✗ Failed to create survey form:', createR.status,
        JSON.stringify(createR.body).substring(0, 300));
      process.exit(1);
    }
  }

  const FORM_ID   = surveyForm.id;
  const FORM_NAME = surveyForm.name;

  // ── STEP 2: Publish the survey form ──────────────────────────────────────
  console.log('\nSTEP 2 — Publishing survey form...');
  if (surveyForm.published) {
    console.log('  Already published — skipping.');
  } else {
    // Publish by POST to /api/v2/quality/publishedforms/surveys
    const pubR = await apiCall(token, 'POST', '/api/v2/quality/publishedforms/surveys', {
      id: FORM_ID,
      published: true
    });
    if (pubR.status === 200 || pubR.status === 201) {
      console.log('  ✓ Survey form published — ID:', pubR.body.id || FORM_ID);
      // Update FORM_ID in case a new published form ID is returned
    } else {
      console.log('  HTTP', pubR.status, JSON.stringify(pubR.body).substring(0, 300));
      // Try PUT approach
      const pubR2 = await apiCall(token, 'PUT',
        `/api/v2/quality/forms/surveys/${FORM_ID}`,
        { ...surveyForm, published: true });
      if (pubR2.status === 200) {
        console.log('  ✓ Survey form published via PUT');
      } else {
        console.log('  ⚠ Could not publish form:', pubR2.status);
      }
    }
  }

  // Fetch the published form ID (may differ from draft ID)
  let publishedFormId = FORM_ID;
  const pubFormsR = await apiCall(token, 'GET', '/api/v2/quality/publishedforms/surveys?pageSize=50');
  if (pubFormsR.status === 200 && pubFormsR.body.entities) {
    const pf = pubFormsR.body.entities.find(f =>
      f.name === FORM_NAME || f.contextId === surveyForm.contextId);
    if (pf) {
      publishedFormId = pf.id;
      console.log('  Published form ID:', publishedFormId);
    }
  }

  // ── STEP 3: Create surveyInvite Architect flow ────────────────────────────
  console.log('\nSTEP 3 — Creating surveyInvite Architect flow via Archy...');

  const surveyInviteYaml = `surveyInvite:
  name: Claude_Cars_Survey_Invite
  description: Post-call web survey invite for Claude Cars — sent after voice interactions
  division: Claude_Exploration_Vijay
  defaultLanguage: en-us

  surveyForm:
    lit:
      id: ${publishedFormId}
      name: ${FORM_NAME}

  sendingDomain: genesyscloud.com

  inviteIdentifiers:
    - customerIdentifier:
        emailAddress:
          exp: "Call.CustomerDefinedVariable1"
      preferredDeliveryChannel: email

  logic:
    always: true
`;

  const inviteYamlPath = 'C:\\Users\\VijayBandaru\\Claude_Cars_Survey_Invite.yaml';
  fs.writeFileSync(inviteYamlPath, surveyInviteYaml);
  console.log('  YAML written to', inviteYamlPath);

  const archyOk = runArchy(inviteYamlPath);
  if (archyOk) {
    console.log('  ✓ surveyInvite flow published via Archy');
  } else {
    console.log('  ⚠ Archy did not exit cleanly — checking API...');
  }

  // Get the surveyInvite flow ID
  await new Promise(r => setTimeout(r, 3000));
  const invFlowR = await apiCall(token, 'GET',
    '/api/v2/flows?type=surveyinvite&pageSize=50&deleted=false');
  let invFlow = null;
  if (invFlowR.body.entities) {
    invFlow = invFlowR.body.entities.find(f => f.name === 'Claude_Cars_Survey_Invite');
  }
  if (invFlow) {
    console.log('  ✓ surveyInvite flow found — ID:', invFlow.id);
  } else {
    console.log('  Survey invite flow not found via Archy. Will try direct queue survey policy instead.');
  }

  // ── STEP 4: Configure queues to use the survey ────────────────────────────
  console.log('\nSTEP 4 — Configuring queues with survey invite...');

  for (const [qId, qName] of [
    [US_QUEUE_ID,    'Claude_US_Queue'],
    [INDIA_QUEUE_ID, 'Claude_India_Queue']
  ]) {
    // Try setting survey at queue level via different field names
    const qR = await apiCall(token, 'GET', `/api/v2/routing/queues/${qId}`);
    if (qR.status !== 200) { console.log('  Could not get', qName); continue; }

    const qData = qR.body;
    delete qData.selfUri;

    // Try with survey flow reference (surveyInvite flow)
    if (invFlow) {
      qData.survey = { flow: { id: invFlow.id, name: invFlow.name } };
    }

    // Also add the survey form directly at queue level
    qData.surveyForm = { id: publishedFormId, name: FORM_NAME };

    const putR = await apiCall(token, 'PUT', `/api/v2/routing/queues/${qId}`, qData);
    if (putR.status === 200) {
      // Check what survey-related fields are in the response
      const raw = JSON.stringify(putR.body);
      const hasSurvey = raw.includes('survey') || raw.includes('Survey');
      console.log(`  ✓ ${qName} updated | Survey fields present: ${hasSurvey}`);
    } else {
      console.log(`  HTTP ${putR.status} on ${qName}:`, JSON.stringify(putR.body).substring(0, 200));
    }
  }

  // ── STEP 5: Create quality survey policy (direct approach) ───────────────
  console.log('\nSTEP 5 — Creating Quality Survey Policy...');
  const policyBody = {
    name: 'Claude_Cars_Survey_Policy',
    order: 0,
    description: 'Auto-send survey after Claude Cars voice interactions',
    enabled: true,
    mediaPolicies: {
      callPolicy: {
        actions: {
          assignSurveys: [
            {
              surveyForm: { id: publishedFormId, name: FORM_NAME },
              flow: invFlow ? { id: invFlow.id, name: invFlow.name } : undefined,
              sendingUser: null,
              sendingDomain: 'genesyscloud.com'
            }
          ]
        },
        conditions: {
          forQueues: [
            { id: US_QUEUE_ID,    name: 'Claude_US_Queue' },
            { id: INDIA_QUEUE_ID, name: 'Claude_India_Queue' }
          ],
          duration: { durationTarget: 'DURATION', operator: 'GREATER_THAN', durationSeconds: 0 }
        }
      }
    }
  };

  const polR = await apiCall(token, 'POST', '/api/v2/quality/policies', policyBody);
  if (polR.status === 200 || polR.status === 201) {
    console.log('  ✓ Quality policy created — ID:', polR.body.id);
    console.log('    Name:', polR.body.name);
    console.log('    Enabled:', polR.body.enabled);
  } else {
    console.log('  HTTP', polR.status, JSON.stringify(polR.body).substring(0, 400));
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n=================================================');
  console.log('  SETUP SUMMARY');
  console.log('=================================================');
  console.log('  Survey Form   :', FORM_NAME, '(', publishedFormId, ')');
  console.log('  Invite Flow   :', invFlow ? invFlow.name + ' (' + invFlow.id + ')' : 'Not created via Archy');
  console.log('  Queues        : Claude_US_Queue, Claude_India_Queue');
  console.log('=================================================\n');
}

main().catch(e => { console.error('Fatal:', e.message || e); process.exit(1); });
