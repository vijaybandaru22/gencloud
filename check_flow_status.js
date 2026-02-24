const https = require('https');

// Configuration
const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_ID = 'afc35686-62c5-4495-96dc-c9fe4642dd69';

// Get OAuth token
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
          reject(new Error(`Failed to get token: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write('grant_type=client_credentials');
    req.end();
  });
}

// Get flow details
function getFlowDetails(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `api.${REGION}`,
      path: `/api/v2/flows/${FLOW_ID}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`\nFlow Details Response Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          const flowData = JSON.parse(data);
          console.log(JSON.stringify(flowData, null, 2));
          resolve(flowData);
        } else {
          console.error(`Failed to get flow: ${data}`);
          reject(new Error(`Failed to get flow: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// List all flows to find ours
function listFlows(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `api.${REGION}`,
      path: `/api/v2/flows?name=Claude_cars23`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`\nList Flows Response Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          const flowsData = JSON.parse(data);
          console.log(JSON.stringify(flowsData, null, 2));
          resolve(flowsData);
        } else {
          console.error(`Failed to list flows: ${data}`);
          reject(new Error(`Failed to list flows: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    console.log('🔍 Checking Claude_cars23 flow status...\n');

    const token = await getAccessToken();
    console.log('✅ OAuth token obtained\n');

    console.log('--- Listing Flows ---');
    await listFlows(token);

    console.log('\n--- Getting Flow Details ---');
    await getFlowDetails(token);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
