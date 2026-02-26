const https = require('https');
const CLIENT_ID = '6806e356-c4e9-4494-91e1-0950a50bcb50';
const CLIENT_SECRET = '6BFUImDXumK2y2-ZlB5yJngFCGABv526UyEioPrZmH8';
const creds = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');

const getToken = () => new Promise((res, rej) => {
  const body = 'grant_type=client_credentials';
  const r = https.request({
    hostname: 'login.usw2.pure.cloud', path: '/oauth/token', method: 'POST',
    headers: { 'Authorization': 'Basic ' + creds, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': body.length }
  }, resp => {
    let d = ''; resp.on('data', c => d += c);
    resp.on('end', () => { const j = JSON.parse(d); j.access_token ? res(j.access_token) : rej(j); });
  });
  r.on('error', rej); r.write(body); r.end();
});

const api = (token, method, path, body) => new Promise((res, rej) => {
  const bodyStr = body ? JSON.stringify(body) : null;
  const r = https.request({
    hostname: 'api.usw2.pure.cloud', path, method,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
    }
  }, resp => {
    let d = ''; resp.on('data', c => d += c);
    resp.on('end', () => {
      try { res({ s: resp.statusCode, b: JSON.parse(d) }); }
      catch (e) { res({ s: resp.statusCode, b: d }); }
    });
  });
  r.on('error', rej);
  if (bodyStr) r.write(bodyStr);
  r.end();
});

async function main() {
  const token = await getToken();
  console.log('Token OK');

  const assignments = [
    {
      queueId: 'c145390d-d8b7-40c9-ad2f-5e593507757b',
      flowId:  'a71c82a8-3bfb-41cf-8ab8-de631ec90f0b',
      flowName: 'ORS_Driver_InQueue'
    },
    {
      queueId: '57516f74-26d6-4b0c-baa2-49092fcf08c8',
      flowId:  'fc18e5a3-fc0e-4464-b070-b508ab04eb8a',
      flowName: 'ORS_CustomerCare_InQueue'
    }
  ];

  for (const a of assignments) {
    // GET current queue config
    const get = await api(token, 'GET', '/api/v2/routing/queues/' + a.queueId);
    if (get.s !== 200) {
      console.log('GET failed for queue ' + a.queueId + ': status', get.s, JSON.stringify(get.b).substring(0, 150));
      continue;
    }

    const q = get.b;
    console.log('Got queue:', q.name);

    // PUT back with queueFlow added, preserving required fields
    const payload = {
      name: q.name,
      division: q.division ? { id: q.division.id } : undefined,
      mediaSettings: q.mediaSettings,
      queueFlow: { id: a.flowId }
    };

    const put = await api(token, 'PUT', '/api/v2/routing/queues/' + a.queueId, payload);
    if (put.s === 200 || put.s === 202) {
      const assignedFlow = put.b.queueFlow ? put.b.queueFlow.name : a.flowName;
      console.log('SUCCESS: ' + q.name + ' assigned to ' + assignedFlow);
    } else {
      console.log('FAILED: ' + q.name + ' status ' + put.s + ': ' + JSON.stringify(put.b).substring(0, 200));
    }
  }
}

main().catch(e => { console.error('ERR', e); process.exit(1); });
