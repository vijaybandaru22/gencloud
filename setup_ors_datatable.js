/**
 * Setup ORS data table rows in VJ_claudeDatatable
 * Adds rows for ORS upfront message configuration
 */
const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const DATATABLE_ID = 'a698670c-8b83-4ddb-af04-04f67eee0c78';

function apiCall(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.usw2.pure.cloud',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const body = 'grant_type=client_credentials';
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'login.usw2.pure.cloud', path: '/oauth/token', method: 'POST',
      headers: {
        'Authorization': `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': body.length
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        const j = JSON.parse(d);
        j.access_token ? resolve(j.access_token) : reject(new Error(JSON.stringify(j)));
      });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

async function main() {
  console.log('Getting access token...');
  let token;
  try {
    token = await getToken();
    console.log('Token obtained OK');
  } catch(e) {
    console.error('Auth failed:', e.message);
    process.exit(1);
  }

  const rows = [
    { key: 'ORS_UPFRONT_MSG',         Active: false, Message: 'Important notice: On Road Support service update. Please listen carefully as our options have changed.' },
    { key: 'ORS_DRIVER_INQUEUE_MSG',   Active: false, Message: 'Important driver support information. Please remain on the line and a representative will assist you shortly.' },
    { key: 'ORS_CC_INQUEUE_MSG',       Active: false, Message: 'Important customer care information. Please remain on the line and a representative will assist you shortly.' }
  ];

  for (const row of rows) {
    console.log(`\nCreating row: ${row.key}`);
    // Try POST first, then PUT if exists
    const res = await apiCall('POST',
      `/api/v2/flows/datatables/${DATATABLE_ID}/rows`,
      row, token);
    if (res.status === 200 || res.status === 201) {
      console.log(`  Created OK: ${row.key}`);
    } else if (res.status === 409 || (res.body && res.body.message && res.body.message.includes('already exists'))) {
      console.log(`  Row exists, updating...`);
      const upd = await apiCall('PUT',
        `/api/v2/flows/datatables/${DATATABLE_ID}/rows/${encodeURIComponent(row.key)}`,
        row, token);
      console.log(`  Update status: ${upd.status}`);
    } else {
      console.log(`  Status ${res.status}:`, JSON.stringify(res.body).substring(0, 200));
    }
  }

  console.log('\nData table setup complete.');
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
