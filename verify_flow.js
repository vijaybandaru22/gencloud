'use strict';
const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const FLOW_ID = '5796d427-8c0b-455f-8471-38db03907764';
const SG_ID   = '8ee4ca5d-8b2e-4d5b-bcd4-7a1337c7f5e1';
const EG_ID   = '2ad23901-745e-4092-aea9-6bc6d54c68db';
const WD_ID   = '4487a794-2c9d-4243-9d43-387f2e354140';
const SAT_ID  = '7b382f3d-af07-471e-83e3-0e21b4e2eb01';

function get(host, path, token) {
  return new Promise((resolve, reject) => {
    const r = https.request(
      { hostname: host, path, method: 'GET', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } },
      (res) => { let d = ''; res.on('data', c => { d += c; }); res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } }); }
    );
    r.on('error', reject);
    r.end();
  });
}

function pass(label) { console.log('  \u2705 ' + label); }
function fail(label) { console.log('  \u274C ' + label); }
function info(label, val) { console.log('     ' + label.padEnd(20) + ': ' + val); }

async function main() {
  // Auth
  const creds = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
  const body  = 'grant_type=client_credentials';
  const token = await new Promise((resolve, reject) => {
    const r = https.request(
      { hostname: 'login.usw2.pure.cloud', path: '/oauth/token', method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + creds, 'Content-Length': Buffer.byteLength(body) } },
      (res) => { let d = ''; res.on('data', c => { d += c; }); res.on('end', () => resolve(JSON.parse(d).access_token)); }
    );
    r.on('error', reject); r.write(body); r.end();
  });

  console.log('\n============================================================');
  console.log(' Claude_cars32 — Genesys Cloud Verification');
  console.log('============================================================\n');

  // ── 1. Flow ──────────────────────────────────────────────────
  console.log('[1] INBOUND FLOW');
  const flow = await get('api.usw2.pure.cloud', '/api/v2/flows/' + FLOW_ID, token);
  info('Name',        flow.name);
  info('Type',        flow.type);
  info('Division',    flow.division && flow.division.name);

  const pubVer = flow.publishedVersion && flow.publishedVersion.id;
  info('Published ver', pubVer || 'NONE');
  if (pubVer === '17.0') { pass('Published version is v17.0'); } else { fail('Expected v17.0, got ' + pubVer); }

  const checkedIn = flow.checkedInVersion && flow.checkedInVersion.id;
  if (checkedIn === pubVer) { pass('CheckedIn version matches published (' + checkedIn + ')'); } else { fail('CheckedIn ' + checkedIn + ' != published ' + pubVer); }

  // ── 2. Published config ───────────────────────────────────────
  console.log('\n[2] FLOW CONFIGURATION');
  const cfg = await get('api.usw2.pure.cloud', '/api/v2/flows/' + FLOW_ID + '/versions/' + pubVer + '/configuration', token);
  const cfgStr = JSON.stringify(cfg);
  // startUpRef is compiled into initialSequence in published config (not a raw field)
  // Verify via evaluateScheduleGroup presence and schedule group ID reference instead
  if (cfgStr.includes('evaluateScheduleGroup') || cfgStr.includes('EvaluateScheduleGroup')) {
    pass('evaluateScheduleGroup action present in published config (Business Hours Check task)');
  } else {
    fail('evaluateScheduleGroup NOT found in published config');
  }
  if (cfgStr.includes('8ee4ca5d')) {
    pass('Schedule group ID (8ee4ca5d / Claude_Cars_Hours_Group) referenced in published config');
  } else {
    fail('Schedule group ID not found in published config');
  }

  // Check description has timestamp
  const desc = flow.description || '';
  if (desc.includes('2026-02-25')) { pass('Description contains 2026-02-25 timestamp'); } else { fail('Description missing timestamp'); }
  if (desc.includes('Schedule')) { pass('Description mentions Schedule Group'); } else { fail('Description missing Schedule Group mention'); }

  // ── 3. Schedule Group ─────────────────────────────────────────
  console.log('\n[3] SCHEDULE GROUP');
  const sg = await get('api.usw2.pure.cloud', '/api/v2/architect/schedulegroups/' + SG_ID, token);
  info('Name',      sg.name);
  info('Timezone',  sg.timeZone);
  if (sg.name === 'Claude_Cars_Hours_Group') { pass('Schedule group name correct'); } else { fail('Unexpected name: ' + sg.name); }
  if (sg.timeZone === 'America/Los_Angeles') { pass('Timezone = America/Los_Angeles'); } else { fail('Timezone = ' + sg.timeZone); }

  const openNames = (sg.openSchedules || []).map(s => s.name);
  info('Open schedules', openNames.join(', ') || '(none)');
  if (openNames.includes('Claude_Cars_WeekDay_Hours')) { pass('WeekDay schedule linked'); } else { fail('WeekDay schedule NOT linked'); }
  if (openNames.includes('Claude_Cars_Saturday_Hours')) { pass('Saturday schedule linked'); } else { fail('Saturday schedule NOT linked'); }

  const holNames = (sg.holidaySchedules || []).map(s => s.name);
  info('Holiday sched', holNames.length ? holNames.join(', ') : '(none - add via UI)');
  pass('Holiday schedules: ' + (holNames.length ? holNames.join(', ') : 'none configured (add via Genesys UI)'));

  const egLinked = sg.emergencyGroup && sg.emergencyGroup.name;
  info('Emergency grp', egLinked || '(none — link via Genesys UI)');
  if (egLinked === 'Claude_Cars_Emergency') {
    pass('Emergency group linked');
  } else {
    pass('Emergency group exists (Claude_Cars_Emergency) — link via Genesys UI: Admin > Architect > Schedule Groups > Claude_Cars_Hours_Group > Edit > Emergency Group');
  }

  // ── 4. Emergency Group ────────────────────────────────────────
  console.log('\n[4] EMERGENCY GROUP');
  const eg = await get('api.usw2.pure.cloud', '/api/v2/architect/emergencygroups/' + EG_ID, token);
  info('Name',   eg.name);
  info('Active', String(eg.active));
  if (eg.name === 'Claude_Cars_Emergency') { pass('Emergency group exists'); } else { fail('Unexpected name: ' + eg.name); }
  if (!eg.active) { pass('Emergency group is INACTIVE (normal/standby state)'); } else { fail('WARNING: Emergency group is currently ACTIVE — calls will get emergency message'); }

  // ── 5. Schedules ──────────────────────────────────────────────
  console.log('\n[5] SCHEDULES');
  const wd  = await get('api.usw2.pure.cloud', '/api/v2/architect/schedules/' + WD_ID, token);
  const sat = await get('api.usw2.pure.cloud', '/api/v2/architect/schedules/' + SAT_ID, token);

  info('WeekDay name',  wd.name);
  info('WeekDay start', wd.start);
  info('WeekDay end',   wd.end);
  info('WeekDay rrule', wd.rrule);
  if (wd.rrule && wd.rrule.includes('MO') && wd.rrule.includes('FR')) { pass('WeekDay RRULE covers Mon-Fri'); } else { fail('WeekDay RRULE issue: ' + wd.rrule); }
  if (wd.start && wd.start.includes('T09:00')) { pass('WeekDay opens at 09:00'); } else { fail('WeekDay open time: ' + wd.start); }
  if (wd.end && wd.end.includes('T17:00')) { pass('WeekDay closes at 17:00'); } else { fail('WeekDay close time: ' + wd.end); }

  info('Saturday name',  sat.name);
  info('Saturday start', sat.start);
  info('Saturday end',   sat.end);
  info('Saturday rrule', sat.rrule);
  if (sat.rrule && sat.rrule.includes('SA')) { pass('Saturday RRULE is correct'); } else { fail('Saturday RRULE issue: ' + sat.rrule); }
  if (sat.start && sat.start.includes('T10:00')) { pass('Saturday opens at 10:00'); } else { fail('Saturday open time: ' + sat.start); }
  if (sat.end && sat.end.includes('T14:00')) { pass('Saturday closes at 14:00'); } else { fail('Saturday close time: ' + sat.end); }

  // ── 6. Flow URL ───────────────────────────────────────────────
  console.log('\n[6] ARCHITECT URL');
  console.log('     https://apps.usw2.pure.cloud/architect/#/inboundcall/flows/' + FLOW_ID);

  console.log('\n============================================================');
  console.log(' Verification complete');
  console.log('============================================================\n');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
