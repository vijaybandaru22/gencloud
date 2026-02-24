const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';

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
    console.log('🚀 Creating Claude_cars23 flow in Claude_Exploration_vijay division...\n');

    const token = await getAccessToken();
    console.log('✅ Authenticated\n');

    // Delete existing flow if it exists
    console.log('🔍 Checking for existing flow...');
    try {
      const flows = await apiRequest(token, 'GET', '/api/v2/flows?name=Claude_cars23&type=inboundcall');
      if (flows.entities && flows.entities.length > 0) {
        for (const flow of flows.entities) {
          console.log(`   Deleting existing flow: ${flow.id}`);
          await apiRequest(token, 'DELETE', `/api/v2/flows/${flow.id}`);
        }
        await new Promise(r => setTimeout(r, 2000));
        console.log('✅ Deleted\n');
      } else {
        console.log('   No existing flow\n');
      }
    } catch (_e) {
      console.log('   No existing flow\n');
    }

    // Get division ID
    console.log('📋 Looking up division...');
    const divisions = await apiRequest(token, 'GET', '/api/v2/authorization/divisions?name=Claude_Exploration_vijay');
    let divisionId = null;
    if (divisions.entities && divisions.entities.length > 0) {
      divisionId = divisions.entities[0].id;
      console.log(`✅ Found division: ${divisions.entities[0].name} (${divisionId})\n`);
    } else {
      throw new Error('Division Claude_Exploration_vijay not found');
    }

    // Create flow
    console.log('📝 Creating flow...');
    const newFlow = await apiRequest(token, 'POST', '/api/v2/flows', {
      name: 'Claude_cars23',
      description: 'Inbound call flow with language selection, menu routing, and geographic routing to US_Queue and India_Queue',
      type: 'inboundcall',
      division: { id: divisionId }
    });
    console.log(`✅ Flow created: ${newFlow.id}\n`);

    // Configure flow
    console.log('⚙️  Configuring flow...');
    await apiRequest(token, 'PUT', `/api/v2/flows/${newFlow.id}`, {
      name: 'Claude_cars23',
      description: 'Inbound call flow with language selection, menu routing, and geographic routing to US_Queue and India_Queue',
      type: 'inboundcall',
      division: { id: divisionId },
      supportedLanguages: [
        { language: 'en-us', isDefault: true },
        { language: 'es', isDefault: false }
      ]
    });
    console.log('✅ Flow configured\n');

    console.log('='.repeat(80));
    console.log('✅ FLOW CREATED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('\n📋 Flow Information:');
    console.log(`   Name: Claude_cars23`);
    console.log(`   ID: ${newFlow.id}`);
    console.log(`   Type: Inbound Call Flow`);
    console.log(`   Division: Claude_Exploration_vijay`);
    console.log(`   Region: ${REGION}`);
    console.log(`   Languages: English (default), Spanish`);
    console.log('\n🔗 Edit Flow in Architect:');
    console.log(`   https://apps.${REGION}/architect/#/call/inbound/${newFlow.id}`);
    console.log('\n📝 Next Steps - Complete Flow Configuration:');
    console.log('   Follow the detailed guide below to add:');
    console.log('   1. Language Selection → English/Spanish');
    console.log('   2. Play Audio → "Thanks for choosing my flow..."');
    console.log('   3. Decision → Check caller location (US: +1, India: +91)');
    console.log('   4. Menu → Sales (1) / Service (2) / New Models (3)');
    console.log('   5. Transfer to ACD → US_Queue or India_Queue');
    console.log('   6. Validate → Publish');
    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
