const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_ID = 'd85f0e6c-9e93-47f8-ad4b-477a00d1bda5';

function apiRequest(token, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `api.${REGION}`,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : {});
        } else {
          reject(new Error(`${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function getAccessToken() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const options = {
      hostname: `login.${REGION}`,
      path: '/oauth/token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data).access_token);
        } else {
          reject(new Error(`Auth failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write('grant_type=client_credentials');
    req.end();
  });
}

async function main() {
  try {
    console.log('🔍 Checking flow configuration...\n');

    const token = await getAccessToken();

    // Get flow details
    const flow = await apiRequest(token, 'GET', `/api/v2/flows/${FLOW_ID}`);

    console.log('📋 Flow Details:');
    console.log(JSON.stringify(flow, null, 2));

    // Try to get flow configuration
    console.log('\n\n📋 Checking flow configuration structure...');
    if (flow.inboundCall) {
      console.log('✅ Flow has inboundCall configuration');
      if (flow.inboundCall.states && flow.inboundCall.states.length > 0) {
        console.log(`✅ Flow has ${flow.inboundCall.states.length} state(s)`);
      } else {
        console.log('⚠️  Flow has no states configured');
      }
    } else {
      console.log('⚠️  Flow has no inboundCall configuration');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
