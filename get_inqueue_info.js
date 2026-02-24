const https = require('https');
const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const BASE_URL = 'usw2.pure.cloud';
const US_QUEUE_ID    = 'ed1d516d-a9c9-4594-9420-d3e574042d0b';
const INDIA_QUEUE_ID = '13f15c0b-11dc-41b2-9a69-204056f3b310';

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
  console.log('Token OK\n');

  for (const [id, name] of [[US_QUEUE_ID, 'Claude_US_Queue'], [INDIA_QUEUE_ID, 'Claude_India_Queue']]) {
    const r = await req({
      hostname: 'api.' + BASE_URL, path: '/api/v2/routing/queues/' + id, method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const q = r.body;
    console.log(name + ':');
    console.log('  queueFlow:', JSON.stringify(q.queueFlow));
    console.log('');
  }

  const fr = await req({
    hostname: 'api.' + BASE_URL, path: '/api/v2/flows?type=inqueuecall&pageSize=50&deleted=false', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('InQueue flows:');
  if (fr.body.entities) {
    fr.body.entities.forEach(f => console.log(' -', f.name, '| ID:', f.id, '| Active:', f.active));
  }
}
main().catch(console.error);
