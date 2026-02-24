// Show the full transferToAcd action from the published flow config
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
  const seqList = config.flowSequenceItemList;

  // Find the US Queue Transfer and India Queue Transfer tasks
  const transferTasks = seqList.filter(item =>
    item.name === 'US Queue Transfer' || item.name === 'India Queue Transfer'
  );
  console.log('Transfer tasks found:', transferTasks.length);

  transferTasks.forEach(task => {
    console.log('\n============================================');
    console.log('Task:', task.name);
    console.log('============================================');
    // Find the transferToAcd action (queues property present)
    const acdAction = task.actionList.find(a => a.queues || a.__type === 'TransferAcdAction');
    if (acdAction) {
      console.log('transferToAcd action (full structure):');
      console.log(JSON.stringify(acdAction, null, 2));
    } else {
      console.log('All actions in task:');
      task.actionList.forEach((a, i) => {
        console.log('Action', i+1, ':', JSON.stringify(a, null, 2).substring(0, 400));
      });
    }
  });

  // Also show manifest queue entries
  console.log('\n============================================');
  console.log('Manifest queue entries:');
  console.log('============================================');
  if (config.manifest && config.manifest.queue) {
    console.log(JSON.stringify(config.manifest.queue, null, 2));
  }
}
main().catch(console.error);
