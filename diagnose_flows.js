/**
 * Diagnoses flow visibility and configuration issues
 */
const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

function apiRequest(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.usw2.pure.cloud', path, method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getToken() {
  return new Promise((resolve, reject) => {
    const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const opts = {
      hostname: 'login.usw2.pure.cloud', path: '/oauth/token', method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' }
    };
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { const p = JSON.parse(d); p.access_token ? resolve(p.access_token) : reject(new Error(d)); });
    });
    req.on('error', reject); req.write('grant_type=client_credentials'); req.end();
  });
}

async function main() {
  const token = await getToken();
  console.log('Token OK\n');

  // ── 1. Search all Claude flows across all divisions ─────────────────────────
  console.log('=== Searching all flows named "Claude*" across all divisions ===\n');
  const searchRes = await apiRequest('GET',
    '/api/v2/flows?name=Claude*&pageSize=50&deleted=false', token);
  if (searchRes.status === 200) {
    const flows = searchRes.body.entities || [];
    console.log(`Found ${flows.length} flow(s):\n`);
    for (const f of flows) {
      const pub = f.publishedVersion ? `published v${f.publishedVersion.id}` : 'NOT published';
      console.log(`  ${f.name}`);
      console.log(`    Type:     ${f.type}`);
      console.log(`    ID:       ${f.id}`);
      console.log(`    Division: ${f.division ? f.division.name : 'unknown'}`);
      console.log(`    Status:   ${pub}`);
      console.log(`    Active:   ${f.active}`);
      console.log();
    }
  } else {
    console.log(`Search failed: ${searchRes.status} ${JSON.stringify(searchRes.body)}`);
  }

  // ── 2. Check InQueue flow configuration content ─────────────────────────────
  console.log('=== Checking InQueue flow configurations ===\n');
  const iqFlows = [
    { id: '694b8665-6703-4d5b-9f9f-5f0ea5e0f36f', name: 'Claude_US_InQueue' },
    { id: '6d3d47e5-4dde-4720-affb-3025c5f3673e', name: 'Claude_India_InQueue' },
  ];
  for (const f of iqFlows) {
    console.log(`--- ${f.name} ---`);
    const cfgRes = await apiRequest('GET',
      `/api/v2/flows/${f.id}/versions/1.0/configuration?deleted=false`, token);
    console.log(`Config HTTP status: ${cfgRes.status}`);
    if (cfgRes.status === 200) {
      const cfg = cfgRes.body;
      // Check if there's actual content
      const keys = Object.keys(cfg);
      console.log(`Config keys: ${keys.join(', ')}`);
      if (cfg.inQueueCall) {
        const iq = cfg.inQueueCall;
        console.log(`  name: ${iq.name}`);
        const states = iq.states || [];
        const tasks = iq.tasks || [];
        console.log(`  states count: ${states.length}`);
        console.log(`  tasks count:  ${tasks.length}`);
        if (states.length > 0) {
          const s = states[0];
          console.log(`  first state actions: ${JSON.stringify((s.actions || []).map(a => a.type))}`);
        }
      } else {
        console.log(`  Raw keys at top level: ${keys.slice(0, 10).join(', ')}`);
      }
    } else {
      console.log(`  Body: ${JSON.stringify(cfgRes.body).substring(0, 200)}`);
    }
    console.log();
  }

  // ── 3. Check all divisions accessible ──────────────────────────────────────
  console.log('=== Accessible divisions ===\n');
  const divRes = await apiRequest('GET', '/api/v2/authorization/divisions?pageSize=50', token);
  if (divRes.status === 200) {
    (divRes.body.entities || []).forEach(d =>
      console.log(`  ${d.name}  (id: ${d.id}${d.homeDivision ? ', HOME' : ''})`));
  }
  console.log();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
