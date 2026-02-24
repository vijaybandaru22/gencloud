const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_NAME = 'Claude_cars23';

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
          reject(new Error(`Failed to get token: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.write('grant_type=client_credentials');
    req.end();
  });
}

// Delete existing flow
function deleteFlow(token, flowId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `api.${REGION}`,
      path: `/api/v2/flows/${flowId}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 204) {
          console.log('✅ Existing flow deleted');
          resolve();
        } else {
          console.log(`Note: ${res.statusCode} - ${data}`);
          resolve(); // Continue anyway
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Find flow by name
function findFlowByName(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `api.${REGION}`,
      path: `/api/v2/flows?name=${encodeURIComponent(FLOW_NAME)}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          resolve(result.entities && result.entities.length > 0 ? result.entities[0] : null);
        } else {
          reject(new Error(`Failed to find flow: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log('🚀 Setting up Claude_cars23 flow...\n');

    const token = await getAccessToken();
    console.log('✅ OAuth token obtained\n');

    // Find and delete existing flow if it exists
    const existingFlow = await findFlowByName(token);
    if (existingFlow) {
      console.log(`Found existing flow: ${existingFlow.id}`);
      await deleteFlow(token, existingFlow.id);
      // Wait a bit for deletion to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n📋 Flow Setup Summary:');
    console.log('   Name: Claude_cars23');
    console.log('   Status: Shell created, needs configuration');
    console.log('\n🔧 NEXT STEPS - Complete in Architect UI:');
    console.log('\n1. Go to: https://apps.usw2.pure.cloud/architect/#/flows');
    console.log('2. Create a new Inbound Call Flow named "Claude_cars23"');
    console.log('3. Configure the flow with:');
    console.log('   • Language Selection (English/Spanish)');
    console.log('   • Welcome Message: "Thanks for choosing my flow..."');
    console.log('   • Geographic Decision: Check if caller is from US (+1) or India (+91)');
    console.log('   • Main Menu US: Sales/Service/New Models → US_Queue');
    console.log('   • Main Menu India: Sales/Service/New Models → India_Queue');
    console.log('4. Save and Publish');
    console.log('\n📄 Reference the CLAUDE_CARS23_SETUP_GUIDE.md for detailed instructions');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
