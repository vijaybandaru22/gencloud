const https = require('https');
const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const BASE_URL = 'usw2.pure.cloud';
const MAIN_FLOW_ID = '5796d427-8c0b-455f-8471-38db03907764';

function req(opts, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(opts, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => {
        try { resolve({status: resp.statusCode, body: JSON.parse(d)}); }
        catch(_e) { resolve({status: resp.statusCode, body: d}); }
      });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

function _findByType(obj, typeStr, results) {
  results = results || [];
  if (!obj || typeof obj !== 'object') return results;
  const t = obj.actionType || obj.type || '';
  if (t.toLowerCase().includes('transfertoacd') || t.toLowerCase().includes('transfer_to_acd')) {
    results.push(obj);
  }
  Object.values(obj).forEach(v => _findByType(v, typeStr, results));
  return results;
}

async function main() {
  const creds = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
  const tr = await req({
    hostname: 'login.' + BASE_URL, path: '/oauth/token', method: 'POST',
    headers: { 'Authorization': 'Basic ' + creds, 'Content-Type': 'application/x-www-form-urlencoded' }
  }, 'grant_type=client_credentials');
  const token = tr.body.access_token;
  console.log('Token OK');

  const cr = await req({
    hostname: 'api.' + BASE_URL,
    path: '/api/v2/flows/' + MAIN_FLOW_ID + '/latestconfiguration',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });

  const config = cr.body;
  console.log('\nFlow config top-level keys:', Object.keys(config).join(', '));

  // Search raw JSON string for "survey" and "transferToAcd"
  const raw = JSON.stringify(config);
  const surveyIdx = [];
  let idx = 0;
  while ((idx = raw.indexOf('survey', idx)) !== -1) {
    surveyIdx.push(raw.substring(Math.max(0, idx-20), idx+60));
    idx += 6;
  }
  if (surveyIdx.length > 0) {
    console.log('\n=== Raw "survey" occurrences in config ===');
    surveyIdx.slice(0, 10).forEach((s, i) => console.log(i+1 + '.', s.replace(/\n/g, ' ')));
  } else {
    console.log('\nNo "survey" string found in published config JSON');
  }

  // Look for transferToAcd
  const xfIdx = [];
  idx = 0;
  while ((idx = raw.indexOf('transferToAcd', idx)) !== -1) {
    xfIdx.push(raw.substring(Math.max(0, idx-5), idx+200));
    idx += 13;
  }
  console.log('\n=== transferToAcd occurrences ===');
  if (xfIdx.length > 0) {
    xfIdx.slice(0, 4).forEach((s, i) => console.log(i+1 + '.', s.replace(/\n/g, ' ').substring(0, 200)));
  } else {
    console.log('None found');
  }

  // Check flowSequenceItemList
  if (config.flowSequenceItemList) {
    console.log('\n=== flowSequenceItemList type ===', typeof config.flowSequenceItemList);
  }
}

main().catch(console.error);
