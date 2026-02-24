/**
 * Zoom CX - Fix flow creation API transport issue
 * The "flow_name must not be blank" error despite sending it means
 * the server may expect a different encoding or the endpoint behavior differs.
 */
const axios = require('axios');
const fs    = require('fs');
const qs    = require('querystring');

const ACCOUNT_ID    = 'Z-wSVKZGRXC59B5xRhrWIg';
const CLIENT_ID     = 'kmKBbmsQRMSaW9vXK0cduQ';
const CLIENT_SECRET = 'OA8RmxnXYHMMh7GR8lP4R9OHb16VLmp2';
const BASE_URL      = 'https://api.zoom.us/v2';
const FLOW_NAME     = 'Claude_cars32';

const _US_QUEUE    = 'ZWQ1887222496A0776E5F5A9324C573CC62';
const _INDIA_QUEUE = 'ZWQA34051F5C48C7C0755E10A04FAFB2ED1';

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

  // ─── A: Try URL-encoded form body ────────────────────────────────────────
  console.log('=== A: URL-encoded form body ===');
  try {
    const r = await axios.post(
      `${BASE_URL}/contact_center/flows`,
      qs.stringify({ flow_name: FLOW_NAME, channel_type: 'voice' }),
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    console.log('✅ URL-encoded SUCCESS:', JSON.stringify(r.data));
  } catch (e) {
    console.log('❌ URL-encoded:', JSON.stringify(e.response?.data));
  }

  // ─── B: Try multipart/form-data ───────────────────────────────────────────
  console.log('\n=== B: FormData multipart ===');
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('flow_name', FLOW_NAME);
    form.append('channel_type', 'voice');
    const r = await axios.post(`${BASE_URL}/contact_center/flows`, form, {
      headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() }
    });
    console.log('✅ FormData SUCCESS:', JSON.stringify(r.data));
  } catch (e) {
    console.log('❌ FormData:', JSON.stringify(e.response?.data) || e.message);
  }

  // ─── C: Try with explicit charset in Content-Type ─────────────────────────
  console.log('\n=== C: JSON with explicit charset ===');
  try {
    const body = JSON.stringify({ flow_name: FLOW_NAME, channel_type: 'voice' });
    const r = await axios.post(`${BASE_URL}/contact_center/flows`, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    });
    console.log('✅ Charset SUCCESS:', JSON.stringify(r.data));
  } catch (e) {
    console.log('❌ Charset:', JSON.stringify(e.response?.data));
  }

  // ─── D: Try export with version ID ────────────────────────────────────────
  console.log('\n=== D: Export existing flow with version ID ===');
  // WTI_Test_Flow has flow_version_id: GMgLzxM4SNuoZzjffL2mlA (published v3)
  const knownFlowId = 'tvJ6-_zLQTqaetKY4uTp9A';
  const knownVersionId = 'GMgLzxM4SNuoZzjffL2mlA';
  try {
    const r = await axios.get(`${BASE_URL}/contact_center/flows/${knownFlowId}/export`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { flow_version_id: knownVersionId }
    });
    const data = r.data;
    console.log('✅ Export SUCCESS! Keys:', Object.keys(data));
    const exportStr = JSON.stringify(data, null, 2);
    fs.writeFileSync('C:/Users/VijayBandaru/zoom_flow_exported_schema.json', exportStr);
    console.log('Saved to zoom_flow_exported_schema.json');
    console.log('Preview:', exportStr.substring(0, 3000));
  } catch (e) {
    console.log('❌ Export:', e.response?.status, JSON.stringify(e.response?.data));
  }

  // ─── E: Try export WTI_Tech_Main_Flow (different flow) ───────────────────
  console.log('\n=== E: Export WTI_Tech_Main_Flow ===');
  try {
    const r = await axios.get(`${BASE_URL}/contact_center/flows/mxqKinuLS3-PLvfCboVkcg`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Flow detail:', JSON.stringify(r.data, null, 2).substring(0, 2000));
  } catch (e) {
    console.log('❌ Flow detail:', e.response?.status, JSON.stringify(e.response?.data));
  }

  // ─── F: Check COG-Testing flow export (published voice flow) ─────────────
  console.log('\n=== F: Try all version IDs for COG-Testing ===');
  try {
    // First get versions
    const versR = await axios.get(`${BASE_URL}/contact_center/flows/rQSjHHbwQ_CUp181Y564kg`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const flow = versR.data;
    console.log('Flow info:', JSON.stringify(flow, null, 2).substring(0, 1000));

    // Try export on each version
    const versions = flow.flow_versions || [];
    for (const v of versions) {
      const vid = v.flow_version_id;
      try {
        const expR = await axios.get(`${BASE_URL}/contact_center/flows/rQSjHHbwQ_CUp181Y564kg/export`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { flow_version_id: vid }
        });
        console.log(`✅ Version ${v.flow_version} export:`, JSON.stringify(expR.data, null, 2).substring(0, 2000));
        fs.writeFileSync('C:/Users/VijayBandaru/zoom_flow_exported_schema.json', JSON.stringify(expR.data, null, 2));
        break;
      } catch (e2) {
        console.log(`❌ Version ${v.flow_version} (${vid}):`, JSON.stringify(e2.response?.data));
      }
    }
  } catch (e) {
    console.log('❌ COG-Testing:', e.response?.status, JSON.stringify(e.response?.data));
  }

  // ─── G: Try VJ_ZCX_ZDX_main (likely VijayBandaru's own flow) ─────────────
  console.log('\n=== G: VJ_ZCX_ZDX_main flow detail ===');
  try {
    const r = await axios.get(`${BASE_URL}/contact_center/flows/NZBuYW2YRmCx-JEu_cmjBg`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('VJ flow:', JSON.stringify(r.data, null, 2).substring(0, 2000));
    fs.writeFileSync('C:/Users/VijayBandaru/zoom_vj_flow_detail.json', JSON.stringify(r.data, null, 2));
  } catch (e) {
    console.log('❌:', e.response?.status, JSON.stringify(e.response?.data));
  }
}

main().catch(e => console.error('Fatal:', e.message, e.response?.data));
