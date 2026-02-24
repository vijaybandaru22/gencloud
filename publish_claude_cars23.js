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
          const token = JSON.parse(data).access_token;
          console.log('✅ OAuth token obtained successfully');
          resolve(token);
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

// Publish the flow
function publishFlow(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `api.${REGION}`,
      path: `/api/v2/flows/${FLOW_ID}/publish`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        console.log(`Response data: ${data}`);

        if (res.statusCode === 200 || res.statusCode === 202 || res.statusCode === 204) {
          console.log('✅ Flow published successfully');
          resolve(data ? JSON.parse(data) : { published: true });
        } else {
          console.error(`❌ Failed to publish flow: ${res.statusCode}`);
          reject(new Error(`Failed to publish flow: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write('{}');
    req.end();
  });
}

// Main execution
async function main() {
  try {
    console.log('🚀 Publishing Claude_cars23 flow...\n');

    const token = await getAccessToken();
    await publishFlow(token);

    console.log('\n✅ Flow published successfully!');
    console.log(`\n📋 Flow Details:`);
    console.log(`   Name: Claude_cars23`);
    console.log(`   ID: ${FLOW_ID}`);
    console.log(`   Region: ${REGION}`);
    console.log(`\n🔗 Access your flow in Architect at:`);
    console.log(`   https://apps.${REGION}/architect/#/call/inbound/${FLOW_ID}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
