'use strict';
const https = require('https');

const CLIENT_ID   = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const WD_ID       = '4487a794-2c9d-4243-9d43-387f2e354140';
const SAT_ID      = '7b382f3d-af07-471e-83e3-0e21b4e2eb01';
const EG_ID       = '2ad23901-745e-4092-aea9-6bc6d54c68db';
const DIVISION_ID = 'ce826344-0f54-475a-b7da-0c1bace68c2f';

function req(token, method, path, data) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const r = https.request(
      { hostname: 'api.usw2.pure.cloud', path, method, headers },
      (res) => { let d = ''; res.on('data', c => { d += c; }); res.on('end', () => { console.log('HTTP', res.statusCode, method, path.substring(0, 55)); resolve(JSON.parse(d)); }); }
    );
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  // Auth
  const creds = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
  const body  = 'grant_type=client_credentials';
  const token = await new Promise((resolve, reject) => {
    const r = https.request(
      { hostname: 'login.usw2.pure.cloud', path: '/oauth/token', method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + creds, 'Content-Length': Buffer.byteLength(body) } },
      (rs) => { let d = ''; rs.on('data', c => { d += c; }); rs.on('end', () => resolve(JSON.parse(d).access_token)); }
    );
    r.on('error', reject); r.write(body); r.end();
  });
  console.log('Token OK\n');

  // STEP 1: Create schedule group (minimal — just name + timezone + division)
  console.log('[1] Creating Claude_Cars_Hours_Group in Claude_Exploration_Vijay...');
  const sg = await req(token, 'POST', '/api/v2/architect/schedulegroups', {
    name: 'Claude_Cars_Hours_Group',
    timeZone: 'America/Los_Angeles',
    openSchedules: [ { id: WD_ID }, { id: SAT_ID } ],
    closedSchedules: [],
    holidaySchedules: [],
    division: { id: DIVISION_ID }
  });

  if (!sg.id) {
    console.log('Create failed:', JSON.stringify(sg, null, 2).substring(0, 600));
    return;
  }
  console.log('  Created ID:', sg.id, '| Division:', sg.division && sg.division.name);

  // STEP 2: GET to read version
  const fresh = await req(token, 'GET', '/api/v2/architect/schedulegroups/' + sg.id, null);
  console.log('  Version:', fresh.version, '| Division:', fresh.division && fresh.division.name, '\n');

  // STEP 3: PUT — keep division, add open schedules + emergency group
  console.log('[2] PUT with division + openSchedules + emergencyGroup...');
  const updated = await req(token, 'PUT', '/api/v2/architect/schedulegroups/' + sg.id, {
    id: sg.id,
    name: 'Claude_Cars_Hours_Group',
    version: fresh.version,
    timeZone: 'America/Los_Angeles',
    division: { id: DIVISION_ID },
    openSchedules:   [ { id: WD_ID }, { id: SAT_ID } ],
    closedSchedules: [],
    holidaySchedules: [],
    emergencyGroup:  { id: EG_ID }
  });

  console.log('\n  Division after PUT:', updated.division && updated.division.name, '(' + (updated.division && updated.division.id) + ')');
  console.log('  emergencyGroup:', updated.emergencyGroup ? updated.emergencyGroup.name + ' (' + updated.emergencyGroup.id + ')' : '(none)');
  console.log('  openSchedules count:', (updated.openSchedules || []).length);

  if (updated.emergencyGroup && updated.emergencyGroup.id === EG_ID) {
    console.log('\n  ✅ SUCCESS!');
    console.log('  New SG ID:', sg.id);
    console.log('  New SG Name: Claude_Cars_Hours_Group');
    console.log('  → Update YAML scheduleGroup id and name to these values');
  } else {
    console.log('\n  ❌ Emergency group not persisted.');
    console.log('  Full PUT response:');
    console.log(JSON.stringify(updated, null, 2));
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
