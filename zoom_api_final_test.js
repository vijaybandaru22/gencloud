const axios = require('axios');
const CLIENT_ID='kmKBbmsQRMSaW9vXK0cduQ', CLIENT_SECRET='OA8RmxnXYHMMh7GR8lP4R9OHb16VLmp2', ACCOUNT_ID='Z-wSVKZGRXC59B5xRhrWIg';
const creds = Buffer.from(CLIENT_ID+':'+CLIENT_SECRET).toString('base64');
const BASE = 'https://api.zoom.us/v2';

async function main() {
  const r0 = await axios.post('https://zoom.us/oauth/token','grant_type=account_credentials&account_id='+ACCOUNT_ID,{headers:{Authorization:'Basic '+creds,'Content-Type':'application/x-www-form-urlencoded'}});
  const tok = r0.data.access_token;

  // Last-resort API attempts
  const attempts = [
    [{flow_name:'Claude_cars32',channel:'VOICE'},'upper VOICE'],
    [{flow_name:'Claude_cars32',channel_type:'VOICE'},'upper channel_type'],
    [{flow_name:'Claude_cars32',channel:'voice',language:'en-US'},'with language'],
    [{name:'Claude_cars32',type:'voice'},'name+type'],
    [{flow_name:'Claude_cars32',channel:'voice',description:'Bilingual voice flow'},'with description'],
    [{flow_name:'Claude_cars32'},'minimal'],
  ];

  for (const [payload, label] of attempts) {
    try {
      const r = await axios.post(BASE+'/contact_center/flows', payload, {headers:{Authorization:'Bearer '+tok,'Content-Type':'application/json'}});
      console.log('SUCCESS ['+label+']:', JSON.stringify(r.data));
      return;
    } catch(e) {
      const err = JSON.stringify(e.response?.data||'');
      if (err.indexOf('must not be blank') === -1) {
        console.log('['+label+'] DIFFERENT ERR:', err);
      } else {
        console.log('['+label+'] same blank err');
      }
    }
  }

  // Try PATCH on existing draft flow with widget content
  console.log('\nTrying PATCH with full content on draft flow...');
  const draftFlowId = '1KWF9zV0QH-vSw9d-LmCJA'; // My Test Flow
  try {
    const r = await axios.patch(BASE+'/contact_center/flows/'+draftFlowId,
      {flow_name:'My Test Flow'},
      {headers:{Authorization:'Bearer '+tok,'Content-Type':'application/json'}});
    console.log('PATCH draft:', r.status, JSON.stringify(r.data||'OK (empty)'));
  } catch(e) {
    console.log('PATCH draft err:', e.response?.status, JSON.stringify(e.response?.data));
  }

  // Try duplicate endpoint
  console.log('\nTrying duplicate endpoint...');
  try {
    const r = await axios.post(BASE+'/contact_center/flows/tvJ6-_zLQTqaetKY4uTp9A/duplicate',
      {flow_name:'Claude_cars32'},
      {headers:{Authorization:'Bearer '+tok,'Content-Type':'application/json'}});
    console.log('Duplicate SUCCESS:', r.status, JSON.stringify(r.data));
  } catch(e) {
    console.log('Duplicate err:', e.response?.status, JSON.stringify(e.response?.data));
  }

  // Try copy endpoint
  try {
    const r = await axios.post(BASE+'/contact_center/flows/tvJ6-_zLQTqaetKY4uTp9A/copy',
      {flow_name:'Claude_cars32'},
      {headers:{Authorization:'Bearer '+tok,'Content-Type':'application/json'}});
    console.log('Copy SUCCESS:', r.status, JSON.stringify(r.data));
  } catch(e) {
    console.log('Copy err:', e.response?.status, JSON.stringify(e.response?.data));
  }
}

main().catch(e => console.error('Fatal:', e.message, e.response?.data));
