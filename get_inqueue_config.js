// Fetch current Claude_US_InQueue flow config and show its structure
const https = require('https');
const fs = require('fs');
const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const BASE_URL = 'usw2.pure.cloud';
const US_IQ_ID    = '694b8665-6703-4d5b-9f9f-5f0ea5e0f36f';
const INDIA_IQ_ID = '6d3d47e5-4dde-4720-affb-3025c5f3673e';

function req(opts, body) {
  return new Promise((res, rej) => {
    const r = https.request(opts, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => {
        try { res({status: resp.statusCode, body: JSON.parse(d)}); }
        catch(_e) { res({status: resp.statusCode, body: d}); }
      });
    });
    r.on('error', rej);
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  const creds = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
  const tr = await req({
    hostname: 'login.' + BASE_URL, path: '/oauth/token', method: 'POST',
    headers: { 'Authorization': 'Basic ' + creds, 'Content-Type': 'application/x-www-form-urlencoded' }
  }, 'grant_type=client_credentials');
  const token = tr.body.access_token;
  console.log('Token OK');

  // Get Claude_US_InQueue config
  const cr = await req({
    hostname: 'api.' + BASE_URL,
    path: '/api/v2/flows/' + US_IQ_ID + '/latestconfiguration',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });

  const config = cr.body;
  console.log('\nUS InQueue Config top-level keys:', Object.keys(config).join(', '));
  console.log('Type:', config.type);

  // Save full config to file for inspection
  fs.writeFileSync('us_inqueue_config.json', JSON.stringify(config, null, 2));
  console.log('\nFull config saved to us_inqueue_config.json');

  // Show flowSequenceItemList structure
  const seqList = config.flowSequenceItemList;
  if (Array.isArray(seqList)) {
    console.log('\nflowSequenceItemList items count:', seqList.length);
    seqList.forEach((item, i) => {
      console.log('\nItem', i+1, ':');
      console.log('  name:', item.name);
      console.log('  __type:', item.__type);
      console.log('  id:', item.id);
      if (item.actionList) {
        console.log('  actions:', item.actionList.map(a => a.__type || a.type || 'unknown').join(', '));
      }
    });
  }

  // Get the initial/startup sequence info
  const _raw = JSON.stringify(config);
  console.log('\n\nMenu-related items:');
  const menuItems = seqList ? seqList.filter(item => item.__type && item.__type.toLowerCase().includes('menu')) : [];
  menuItems.forEach(item => {
    console.log('  Menu item:', item.name, '| type:', item.__type);
  });

  // Get India config too
  const cr2 = await req({
    hostname: 'api.' + BASE_URL,
    path: '/api/v2/flows/' + INDIA_IQ_ID + '/latestconfiguration',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  fs.writeFileSync('india_inqueue_config.json', JSON.stringify(cr2.body, null, 2));
  console.log('\nIndia InQueue config saved to india_inqueue_config.json');
}
main().catch(console.error);
