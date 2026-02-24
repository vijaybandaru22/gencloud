// Inspect the flowSequenceItemList and find transferToAcd actions
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

// Recursively collect all objects that mention a keyword in their keys/values
function collectMatching(obj, keyword, path, results) {
  path = path || 'root';
  results = results || [];
  if (!obj || typeof obj !== 'object') return results;
  const str = JSON.stringify(obj);
  if (str.length < 5000 && str.toLowerCase().includes(keyword.toLowerCase())) {
    // Check if this specific object directly contains the keyword
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase().includes(keyword.toLowerCase()) ||
          (typeof v === 'string' && v.toLowerCase().includes(keyword.toLowerCase()))) {
        results.push({ path: path + '.' + k, key: k, value: v });
      }
    }
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') collectMatching(v, keyword, path + '.' + k, results);
  }
  return results;
}

async function main() {
  const creds = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
  const tr = await req({
    hostname: 'login.' + BASE_URL, path: '/oauth/token', method: 'POST',
    headers: { 'Authorization': 'Basic ' + creds, 'Content-Type': 'application/x-www-form-urlencoded' }
  }, 'grant_type=client_credentials');
  const token = tr.body.access_token;

  const cr = await req({
    hostname: 'api.' + BASE_URL,
    path: '/api/v2/flows/' + MAIN_FLOW_ID + '/latestconfiguration',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const config = cr.body;

  // Find all "sequence" references containing "transfer" or "acd"
  const transferRefs = collectMatching(config, 'transfer', 'config', []);
  const acdRefs      = collectMatching(config, 'acd', 'config', []);
  const queueRefs    = collectMatching(config, 'queue', 'config', []);

  console.log('=== "transfer" references ===');
  transferRefs.slice(0,15).forEach(r => console.log(`  ${r.path}: ${JSON.stringify(r.value).substring(0,120)}`));

  console.log('\n=== "acd" references ===');
  acdRefs.slice(0,10).forEach(r => console.log(`  ${r.path}: ${JSON.stringify(r.value).substring(0,120)}`));

  console.log('\n=== "queue" references ===');
  queueRefs.slice(0,10).forEach(r => console.log(`  ${r.path}: ${JSON.stringify(r.value).substring(0,120)}`));

  // Look at flowSequenceItemList structure
  const seqList = config.flowSequenceItemList;
  if (Array.isArray(seqList)) {
    console.log('\n=== flowSequenceItemList items (first 3) ===');
    seqList.slice(0,3).forEach((item, i) => {
      console.log('Item', i+1, ':', JSON.stringify(item).substring(0, 300));
    });
  } else if (seqList && typeof seqList === 'object') {
    console.log('\n=== flowSequenceItemList keys ===', Object.keys(seqList));
  }

  // Search for any "id" matching our queue IDs or survey flow ID
  const usQueueRefs = collectMatching(config, 'ed1d516d', 'config', []);
  const surveyRefs  = collectMatching(config, '2a9174b9', 'config', []);
  console.log('\n=== US Queue ID references ===');
  usQueueRefs.slice(0,5).forEach(r => console.log(`  ${r.path}: ${JSON.stringify(r.value).substring(0,120)}`));
  console.log('\n=== Survey flow ID references ===');
  if (surveyRefs.length > 0) {
    surveyRefs.forEach(r => console.log(`  ✅ ${r.path}: ${JSON.stringify(r.value).substring(0,120)}`));
  } else {
    console.log('  ❌ Survey flow ID NOT found in published config');
  }
}
main().catch(console.error);
