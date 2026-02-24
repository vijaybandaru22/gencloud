const https = require('https');
const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const BASE_URL = 'usw2.pure.cloud';
const FORM_ID = '76a9fbea-17b4-4fca-90bc-45fde3df3699';

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

async function main() {
  const creds = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
  const body = 'grant_type=client_credentials';
  const r = await httpsRequest({
    hostname: 'login.' + BASE_URL, path: '/oauth/token', method: 'POST',
    headers: { 'Authorization': 'Basic ' + creds, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
  }, body);
  const token = r.body.access_token;

  const formR = await httpsRequest({
    hostname: 'api.' + BASE_URL, path: '/api/v2/quality/forms/surveys/' + FORM_ID, method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
  });

  console.log('Form:', formR.body.name);
  console.log('ID:', formR.body.id);
  console.log('contextId:', formR.body.contextId);
  console.log('\nQuestion Groups:');
  (formR.body.questionGroups || []).forEach(g => {
    console.log('  Group:', g.name, '| ID:', g.id);
    (g.questions || []).forEach(q => {
      console.log('    Question:', q.text);
      console.log('    Type:', q.type);
      console.log('    ID:', q.id);
      if (q.answerOptions) {
        q.answerOptions.forEach(a => console.log('      Answer:', a.text, '| Value:', a.value, '| ID:', a.id));
      }
      console.log();
    });
  });
}
main().catch(e => { console.error('Error:', e.message || e); process.exit(1); });
