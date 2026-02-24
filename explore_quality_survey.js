/**
 * explore_quality_survey.js
 * Explores Genesys Cloud Quality Management survey APIs:
 *  - Lists existing survey forms and their questions
 *  - Lists survey policies / scheduled surveys
 *  - Checks what delivery options (email/SMS) are available
 */

const https = require('https');

const CLIENT_ID     = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const BASE_URL      = 'usw2.pure.cloud';

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
  if (!r.body.access_token) throw new Error('Auth failed');
  return r.body.access_token;
}

async function get(token, path) {
  return httpsRequest({
    hostname: `api.${BASE_URL}`, path, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
}

async function main() {
  console.log('=== Genesys Cloud Quality Survey API Explorer ===\n');
  const token = await getToken();
  console.log('✓ Authenticated\n');

  // 1. List survey forms
  console.log('━━━ [1] Survey Forms (/api/v2/quality/forms/surveys) ━━━');
  const formsR = await get(token, '/api/v2/quality/forms/surveys?pageSize=25&expand=questionGroups');
  if (formsR.status === 200 && formsR.body.entities) {
    console.log(`  Found ${formsR.body.entities.length} form(s):\n`);
    formsR.body.entities.forEach(f => {
      console.log(`  Form: "${f.name}" | ID: ${f.id} | Published: ${f.published}`);
      if (f.questionGroups) {
        f.questionGroups.forEach(qg => {
          console.log(`    Group: "${qg.name}"`);
          if (qg.questions) {
            qg.questions.forEach(q => console.log(`      Q: "${q.text}" | type: ${q.type}`));
          }
        });
      }
      console.log('');
    });
  } else {
    console.log(`  HTTP ${formsR.status}:`, JSON.stringify(formsR.body).substring(0, 200));
  }

  // 2. List survey schedules / policies
  console.log('━━━ [2] Survey Schedules (/api/v2/quality/surveys/scorable) ━━━');
  const schedR = await get(token, '/api/v2/quality/surveys/scorable?pageSize=25');
  console.log(`  HTTP ${schedR.status}:`, JSON.stringify(schedR.body).substring(0, 300));

  // 3. Check survey sending schedules
  console.log('\n━━━ [3] Survey Invites (/api/v2/quality/surveyforms) ━━━');
  const invR = await get(token, '/api/v2/quality/surveyforms?pageSize=25');
  console.log(`  HTTP ${invR.status}:`, JSON.stringify(invR.body).substring(0, 300));

  // 4. Check scheduled surveys / campaigns
  console.log('\n━━━ [4] Scheduled Surveys (/api/v2/quality/forms/surveys?sortBy=name) ━━━');
  const ssR = await get(token, '/api/v2/quality/forms/surveys?sortBy=name&pageSize=25');
  console.log(`  HTTP ${ssR.status}, total: ${ssR.body.total || 'N/A'}`);

  // 5. Check if there is a survey invite configuration endpoint
  console.log('\n━━━ [5] Survey Invitations (/api/v2/quality/surveys) ━━━');
  const survR = await get(token, '/api/v2/quality/surveys?pageSize=10');
  console.log(`  HTTP ${survR.status}:`, JSON.stringify(survR.body).substring(0, 400));

  // 6. Check flows/survey type
  console.log('\n━━━ [6] Survey-type Flows (/api/v2/flows?type=surveyinvite) ━━━');
  const sfR = await get(token, '/api/v2/flows?type=surveyinvite&pageSize=25&deleted=false');
  console.log(`  HTTP ${sfR.status}:`, JSON.stringify(sfR.body).substring(0, 400));

  // 7. Check quality policy (evaluations/surveys on queues)
  console.log('\n━━━ [7] Quality Policies (/api/v2/quality/policies) ━━━');
  const polR = await get(token, '/api/v2/quality/policies?pageSize=25');
  console.log(`  HTTP ${polR.status}:`, JSON.stringify(polR.body).substring(0, 400));

  // 8. Check VJ_Survey form in detail
  const VJ_SURVEY_ID = 'ce0c54d9-a428-4c11-b88b-be42340f5924';
  console.log('\n━━━ [8] VJ_Survey form detail ━━━');
  const vjR = await get(token, `/api/v2/quality/forms/surveys/${VJ_SURVEY_ID}`);
  if (vjR.status === 200) {
    console.log('  Name:', vjR.body.name);
    console.log('  Published:', vjR.body.published);
    console.log('  Keys:', Object.keys(vjR.body).join(', '));
    if (vjR.body.questionGroups) {
      vjR.body.questionGroups.forEach(qg => {
        console.log('  Group:', qg.name);
        (qg.questions || []).forEach(q =>
          console.log('    Q:', q.text, '| type:', q.type));
      });
    }
  } else {
    console.log(`  HTTP ${vjR.status}`);
  }

  console.log('\n=== Done ===');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
