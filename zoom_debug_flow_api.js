/**
 * Debug Zoom CX Flow API - Find correct payload format
 * and export an existing flow to use as template
 */
const axios = require('axios');

const ACCOUNT_ID    = 'Z-wSVKZGRXC59B5xRhrWIg';
const CLIENT_ID     = 'kmKBbmsQRMSaW9vXK0cduQ';
const CLIENT_SECRET = 'OA8RmxnXYHMMh7GR8lP4R9OHb16VLmp2';
const BASE_URL      = 'https://api.zoom.us/v2';
const fs            = require('fs');

async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const r = await axios.post(
    'https://zoom.us/oauth/token',
    `grant_type=account_credentials&account_id=${ACCOUNT_ID}`,
    { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return r.data.access_token;
}

async function main() {
  const token = await getToken();
  console.log('✅ Authenticated\n');

  // 1. List all flows
  console.log('=== ALL FLOWS ===');
  const flowsResp = await axios.get(`${BASE_URL}/contact_center/flows`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { page_size: 100 }
  });
  const flows = flowsResp.data.flows || [];
  console.log(`Total flows: ${flows.length}`);

  // Find WTI_Test_Flow (known published flow)
  const testFlow = flows.find(f => f.flow_name === 'WTI_Test_Flow') || flows[0];
  flows.slice(0, 5).forEach(f => console.log(`  - ${f.flow_name} [${f.flow_id}] status=${f.status}`));

  // 2. Try to export the test flow to get the real JSON schema
  if (testFlow) {
    const fid = testFlow.flow_id;
    console.log(`\n=== EXPORTING FLOW: ${testFlow.flow_name} (${fid}) ===`);

    // Try export endpoint
    try {
      const exportResp = await axios.get(`${BASE_URL}/contact_center/flows/${fid}/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Export response:', JSON.stringify(exportResp.data, null, 2).substring(0, 2000));
      fs.writeFileSync('C:/Users/VijayBandaru/zoom_flow_export_sample.json', JSON.stringify(exportResp.data, null, 2));
      console.log('✅ Saved to zoom_flow_export_sample.json');
    } catch (e) {
      console.log(`Export failed: ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
    }

    // Try versions
    try {
      const versResp = await axios.get(`${BASE_URL}/contact_center/flows/${fid}/versions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('\nVersions:', JSON.stringify(versResp.data, null, 2).substring(0, 1000));
    } catch (e) {
      console.log(`Versions failed: ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
    }
  }

  // 3. Debug the create endpoint with verbose error info
  console.log('\n=== DEBUG CREATE FLOW API ===');

  const attempts = [
    // Based on Zoom API validation pattern - flow_name is sometimes case sensitive
    { flow_name: 'Claude_cars32', channel_type: 'voice' },
    { flow_name: 'Claude_cars32', channel_type: 'Voice' },
    { flow_name: 'Claude_cars32', channel_type: 'VOICE' },
    { flow_name: 'Claude_cars32', type: 'voice', channel_type: 'voice' },
    // With flow_type
    { flow_name: 'Claude_cars32', channel_type: 'voice', flow_type: 'voice' },
    { flow_name: 'Claude_cars32', channel_type: 'voice', flow_type: 'inbound_voice' },
    { flow_name: 'Claude_cars32', channel_type: 'voice', flow_type: 'inbound' },
    // Minimal
    { name: 'Claude_cars32', channel_type: 'voice' },
    // Check if there's a required field we're missing
    { flow_name: 'Claude_cars32', channel_type: 'voice', description: 'test' },
  ];

  for (let i = 0; i < attempts.length; i++) {
    try {
      const r = await axios.post(`${BASE_URL}/contact_center/flows`, attempts[i], {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      console.log(`✅ Attempt ${i+1} SUCCESS:`, JSON.stringify(r.data));
      fs.writeFileSync('C:/Users/VijayBandaru/zoom_create_result.json', JSON.stringify(r.data, null, 2));
      break;
    } catch (e) {
      const errData = e.response?.data;
      console.log(`❌ Attempt ${i+1} [${JSON.stringify(attempts[i])}]: ${e.response?.status} - ${JSON.stringify(errData)}`);
    }
  }

  // 4. Check if there are any flows with voice channel type to copy
  console.log('\n=== VOICE FLOWS IN ACCOUNT ===');
  const voiceFlows = flows.filter(f => f.channel === 'voice' || f.channel_type === 'voice');
  voiceFlows.slice(0, 10).forEach(f => {
    console.log(`  ${f.flow_name} | ${f.flow_id} | channel=${f.channel||f.channel_type} | status=${f.status}`);
  });

  // Try to export the first voice flow
  if (voiceFlows.length > 0) {
    const vf = voiceFlows[0];
    console.log(`\nAttempting to export voice flow: ${vf.flow_name} (${vf.flow_id})`);
    try {
      const r = await axios.get(`${BASE_URL}/contact_center/flows/${vf.flow_id}/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Voice flow export:', JSON.stringify(r.data, null, 2).substring(0, 3000));
      fs.writeFileSync('C:/Users/VijayBandaru/zoom_voice_flow_export.json', JSON.stringify(r.data, null, 2));
    } catch (e) {
      console.log(`Export failed: ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
    }
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  if (e.response) console.error('Response:', JSON.stringify(e.response.data, null, 2));
});
