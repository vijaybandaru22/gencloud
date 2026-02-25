'use strict';

const https = require('https');
const fs = require('fs');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const BASE_URL = 'api.usw2.pure.cloud';
const AUTH_URL = 'login.usw2.pure.cloud';
const DIVISION_ID = 'ce826344-0f54-475a-b7da-0c1bace68c2f';  // Claude_Exploration_Vijay

function request(host, path, method, data, token) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body) headers['Content-Length'] = Buffer.byteLength(body);

    const req = https.request({ hostname: host, path, method, headers }, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          resolve(raw);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const body = 'grant_type=client_credentials';
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: AUTH_URL,
      path: '/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${creds}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.access_token) {
          resolve(parsed.access_token);
        } else {
          reject(new Error(`Auth failed: ${JSON.stringify(parsed)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function deleteIfExists(token, type, name) {
  // Check if object already exists and delete to avoid duplicates
  const list = await request(BASE_URL, `/api/v2/architect/${type}?name=${encodeURIComponent(name)}&pageSize=5`, 'GET', null, token);
  if (list.entities && list.entities.length > 0) {
    for (const entity of list.entities) {
      if (entity.name === name) {
        console.log(`  Deleting existing ${type}: ${entity.id}`);
        try {
          await request(BASE_URL, `/api/v2/architect/${type}/${entity.id}`, 'DELETE', null, token);
        } catch (e) {
          console.log(`  Warning: Could not delete ${entity.id}: ${e.message}`);
        }
      }
    }
  }
}

async function main() {
  console.log('========================================');
  console.log('Claude Cars - Schedule Group Setup');
  console.log('========================================\n');

  console.log('Step 1: Getting OAuth token...');
  const token = await getToken();
  console.log('✓ Token obtained\n');

  // --- Clean up existing objects to avoid duplicates ---
  console.log('Step 2: Checking for existing objects...');
  await deleteIfExists(token, 'schedulegroups', 'Claude_Cars_Schedule_Group');
  await deleteIfExists(token, 'emergencygroups', 'Claude_Cars_Emergency');
  await deleteIfExists(token, 'schedules', 'Claude_Cars_WeekDay_Hours');
  await deleteIfExists(token, 'schedules', 'Claude_Cars_Saturday_Hours');
  console.log('✓ Cleanup done\n');

  // --- Create Mon-Fri 9AM-5PM Schedule ---
  // Times are in local Pacific time; schedule group timezone handles DST
  console.log('Step 3: Creating Mon-Fri 9AM-5PM schedule...');
  const weekdaySchedule = await request(BASE_URL, '/api/v2/architect/schedules', 'POST', {
    name: 'Claude_Cars_WeekDay_Hours',
    description: 'Monday to Friday 9AM-5PM Pacific Time',
    start: '2026-02-23T09:00:00.000',
    end: '2026-02-23T17:00:00.000',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    division: { id: DIVISION_ID }
  }, token);
  console.log(`✓ Weekday Schedule: ${weekdaySchedule.id}\n`);

  // --- Create Saturday 10AM-2PM Schedule ---
  console.log('Step 4: Creating Saturday 10AM-2PM schedule...');
  const saturdaySchedule = await request(BASE_URL, '/api/v2/architect/schedules', 'POST', {
    name: 'Claude_Cars_Saturday_Hours',
    description: 'Saturday 10AM-2PM Pacific Time',
    start: '2026-02-22T10:00:00.000',
    end: '2026-02-22T14:00:00.000',
    rrule: 'FREQ=WEEKLY;BYDAY=SA',
    division: { id: DIVISION_ID }
  }, token);
  console.log(`✓ Saturday Schedule: ${saturdaySchedule.id}\n`);

  // --- Create Emergency Group ---
  console.log('Step 5: Creating emergency group...');
  const emergencyGroup = await request(BASE_URL, '/api/v2/architect/emergencygroups', 'POST', {
    name: 'Claude_Cars_Emergency',
    description: 'Emergency override for Claude Cars - activate via Genesys Cloud UI (Admin > Architect > Emergency Groups) when needed',
    emergencyCallFlows: [],
    division: { id: DIVISION_ID }
  }, token);
  console.log(`✓ Emergency Group: ${emergencyGroup.id}\n`);

  // --- Create Schedule Group ---
  // Sunday = not in open schedules → evaluates as "closed"
  // Holidays = add to holidaySchedules array via UI
  // Emergency = toggle Claude_Cars_Emergency active in UI
  console.log('Step 6: Creating schedule group...');
  const scheduleGroup = await request(BASE_URL, '/api/v2/architect/schedulegroups', 'POST', {
    name: 'Claude_Cars_Schedule_Group',
    description: 'Business hours: Mon-Fri 9AM-5PM, Sat 10AM-2PM. Sun/Holidays/Emergency = closed.',
    timeZone: 'America/Los_Angeles',
    openSchedules: [
      { id: weekdaySchedule.id },
      { id: saturdaySchedule.id }
    ],
    closedSchedules: [],
    holidaySchedules: [],
    emergencyGroup: { id: emergencyGroup.id },
    division: { id: DIVISION_ID }
  }, token);
  console.log(`✓ Schedule Group: ${scheduleGroup.id}\n`);

  const result = {
    weekdayScheduleId: weekdaySchedule.id,
    weekdayScheduleName: weekdaySchedule.name,
    saturdayScheduleId: saturdaySchedule.id,
    saturdayScheduleName: saturdaySchedule.name,
    emergencyGroupId: emergencyGroup.id,
    emergencyGroupName: emergencyGroup.name,
    scheduleGroupId: scheduleGroup.id,
    scheduleGroupName: scheduleGroup.name
  };

  fs.writeFileSync('schedule_group_ids.json', JSON.stringify(result, null, 2));

  console.log('========================================');
  console.log('SUCCESS - All objects created');
  console.log('========================================');
  console.log(JSON.stringify(result, null, 2));
  console.log('\nIDs saved to: schedule_group_ids.json');
  console.log('\nNOTE - To add holidays:');
  console.log('  Genesys Cloud UI → Admin → Architect → Schedules');
  console.log('  Create holiday date schedules, then add them to Claude_Cars_Schedule_Group');
  console.log('\nNOTE - To activate emergency:');
  console.log('  Genesys Cloud UI → Admin → Architect → Emergency Groups');
  console.log('  Toggle "Claude_Cars_Emergency" to Active');

  return result;
}

main().catch(err => {
  console.error('\n✗ Error:', err.message);
  process.exit(1);
});
