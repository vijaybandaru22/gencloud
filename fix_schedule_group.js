'use strict';
const https = require('https');

const CLIENT_ID     = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const FLOW_ID  = '5796d427-8c0b-455f-8471-38db03907764';
const SG_ID    = '79e337b9-8e2c-4bb2-b26d-948c5f65e07c';
const EG_ID    = '2ad23901-745e-4092-aea9-6bc6d54c68db';
const WD_ID    = '4487a794-2c9d-4243-9d43-387f2e354140';
const SAT_ID   = '7b382f3d-af07-471e-83e3-0e21b4e2eb01';

function apiReq(host, path, method, data, token) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const r = https.request({ hostname: host, path, method, headers }, (res) => {
      let d = ''; res.on('data', c => { d += c; }); res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
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
  console.log('✓ Token obtained\n');

  // ── 1. Inspect flow config startUpRef ─────────────────────────
  console.log('[1] Checking flow configuration startUpRef...');
  const flow = await apiReq('api.usw2.pure.cloud', '/api/v2/flows/' + FLOW_ID, 'GET', null, token);
  const pubVer = flow.publishedVersion && flow.publishedVersion.id;
  const cfg = await apiReq('api.usw2.pure.cloud', '/api/v2/flows/' + FLOW_ID + '/versions/' + pubVer + '/configuration', 'GET', null, token);

  // The configuration is nested - find startUpRef wherever it is
  const cfgStr = JSON.stringify(cfg);
  const startMatch = cfgStr.match(/"startUpRef"\s*:\s*"([^"]+)"/);
  const startUpRef = startMatch ? startMatch[1] : '(not found)';
  console.log('  startUpRef found:', startUpRef);
  if (startUpRef.includes('Business Hours Check')) {
    console.log('  ✅ startUpRef correctly points to Business Hours Check task');
  } else {
    console.log('  ℹ️  startUpRef value in config:', startUpRef);
  }

  // Also check for evaluateScheduleGroup in config
  if (cfgStr.includes('evaluateScheduleGroup') || cfgStr.includes('EvaluateScheduleGroup')) {
    console.log('  ✅ evaluateScheduleGroup action found in published config');
  } else {
    console.log('  ❌ evaluateScheduleGroup NOT found in published config');
  }
  if (cfgStr.includes('79e337b9') || cfgStr.includes('Claude_Cars_Schedule_Group')) {
    console.log('  ✅ Schedule group reference found in published config');
  } else {
    console.log('  ⚠️  Schedule group ID not directly in config (may be resolved by name)');
  }

  // ── 2. Get current schedule group and link emergency group ─────
  console.log('\n[2] Patching schedule group to link emergency group...');
  const sg = await apiReq('api.usw2.pure.cloud', '/api/v2/architect/schedulegroups/' + SG_ID, 'GET', null, token);
  console.log('  Current emergency group:', sg.emergencyGroup ? sg.emergencyGroup.name : '(none)');

  if (sg.emergencyGroup && sg.emergencyGroup.id === EG_ID) {
    console.log('  ✅ Emergency group already linked — no patch needed');
  } else {
    // PATCH the schedule group to add the emergency group
    const patch = {
      name: sg.name,
      description: sg.description,
      timeZone: sg.timeZone,
      openSchedules: sg.openSchedules || [],
      closedSchedules: sg.closedSchedules || [],
      holidaySchedules: sg.holidaySchedules || [],
      emergencyGroup: { id: EG_ID }
    };

    const updated = await apiReq('api.usw2.pure.cloud', '/api/v2/architect/schedulegroups/' + SG_ID, 'PUT', patch, token);
    if (updated.emergencyGroup && updated.emergencyGroup.id === EG_ID) {
      console.log('  ✅ Emergency group linked:', updated.emergencyGroup.name);
    } else {
      console.log('  ❌ Failed to link emergency group:', JSON.stringify(updated).substring(0, 200));
    }
  }

  // ── 3. Final schedule group state ─────────────────────────────
  console.log('\n[3] Final schedule group state...');
  const sgFinal = await apiReq('api.usw2.pure.cloud', '/api/v2/architect/schedulegroups/' + SG_ID, 'GET', null, token);
  console.log('  Name           :', sgFinal.name);
  console.log('  Timezone       :', sgFinal.timeZone);
  console.log('  Open schedules :', (sgFinal.openSchedules || []).map(s => s.name).join(', '));
  console.log('  Holiday sched  :', (sgFinal.holidaySchedules || []).map(s => s.name).join(', ') || '(none)');
  console.log('  Emergency grp  :', sgFinal.emergencyGroup ? sgFinal.emergencyGroup.name : '(none)');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
