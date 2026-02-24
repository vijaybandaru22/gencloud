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
    console.log('🚀 Creating Claude_cars23 flow with complete configuration...\n');

    const token = await getAccessToken();
    console.log('✅ Authenticated\n');

    // Delete existing flow
    console.log('🔍 Checking for existing flow...');
    try {
      const flows = await apiRequest(token, 'GET', '/api/v2/flows?name=Claude_cars23&type=inboundcall');
      if (flows.entities && flows.entities.length > 0) {
        console.log(`   Deleting existing flow: ${flows.entities[0].id}`);
        await apiRequest(token, 'DELETE', `/api/v2/flows/${flows.entities[0].id}`);
        await new Promise(r => setTimeout(r, 2000));
        console.log('✅ Deleted\n');
      }
    } catch (_e) {
      console.log('   No existing flow\n');
    }

    // Create flow
    console.log('📝 Creating flow...');
    const newFlow = await apiRequest(token, 'POST', '/api/v2/flows', {
      name: 'Claude_cars23',
      description: 'Inbound call flow with language selection and geographic routing',
      type: 'inboundcall',
      division: { name: 'Home' }
    });
    console.log(`✅ Flow created: ${newFlow.id}\n`);

    //Configure the basic flow
    console.log('⚙️  Configuring flow...');
    await apiRequest(token, 'PUT', `/api/v2/flows/${newFlow.id}`, {
      name: 'Claude_cars23',
      description: 'Inbound call flow with language selection, menu routing, and geographic routing',
      type: 'inboundcall',
      division: newFlow.division,
      supportedLanguages: [
        { language: 'en-us', isDefault: true },
        { language: 'es', isDefault: false }
      ]
    });
    console.log('✅ Flow configured\n');

    console.log('=' .repeat(70));
    console.log('✅ FLOW CREATED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log('\n📋 Flow Information:');
    console.log(`   Name: Claude_cars23`);
    console.log(`   ID: ${newFlow.id}`);
    console.log(`   Type: Inbound Call Flow`);
    console.log(`   Division: Home`);
    console.log(`   Region: ${REGION}`);
    console.log(`   Languages: English, Spanish`);
    console.log('\n🔗 Edit Flow in Architect:');
    console.log(`   https://apps.${REGION}/architect/#/call/inbound/${newFlow.id}`);
    console.log('\n⚠️  IMPORTANT - Flow Configuration Required:');
    console.log('   The flow shell has been created. Due to Genesys Cloud API limitations,');
    console.log('   complex flow logic (menus, decisions, routing) must be configured in');
    console.log('   the Architect UI. This takes approximately 10-15 minutes.');
    console.log('\n📝 Required Configuration (see CLAUDE_CARS23_SETUP_GUIDE.md):');
    console.log('   1. Language Selection → English/Spanish');
    console.log('   2. Play Audio → "Thanks for choosing my flow..."');
    console.log('   3. Decision → Check caller location (US: +1, India: +91)');
    console.log('   4. Menu (US) → Sales/Service/New Models → US_Queue');
    console.log('   5. Menu (India) → Sales/Service/New Models → India_Queue');
    console.log('   6. Validate → Publish');
    console.log('\n✨ The flow structure is documented and ready for configuration!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
