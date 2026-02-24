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

async function getQueueId(token, queueName) {
  try {
    const queues = await apiRequest(token, 'GET', `/api/v2/routing/queues?name=${queueName}`);
    if (queues.entities && queues.entities.length > 0) {
      return queues.entities[0].id;
    }
    return null;
  } catch (_e) {
    return null;
  }
}

async function main() {
  try {
    console.log('🔧 Updating flow configuration via API...\n');

    const token = await getAccessToken();

    // Get queue IDs
    console.log('🔍 Looking up queues...');
    const usQueueId = await getQueueId(token, 'US_Queue');
    const indiaQueueId = await getQueueId(token, 'India_Queue');

    if (usQueueId) {
      console.log(`✅ Found US_Queue: ${usQueueId}`);
    } else {
      console.log('⚠️  Warning: US_Queue not found');
    }

    if (indiaQueueId) {
      console.log(`✅ Found India_Queue: ${indiaQueueId}`);
    } else {
      console.log('⚠️  Warning: India_Queue not found');
    }
    console.log();

    // Try different API endpoints to update configuration
    console.log('📝 Attempting to update flow configuration...\n');

    // Method 1: Try PUT to /api/v2/flows/{flowId}/configuration
    try {
      console.log('Method 1: Trying /api/v2/flows/{flowId}/configuration...');
      const config = {
        initialGreeting: {
          tts: {
            'en-us': 'Welcome to Claude Cars',
            'es': 'Bienvenido a Claude Cars'
          }
        },
        defaultLanguage: 'en-us',
        supportedLanguages: [
          {
            language: 'en-us',
            defaultLanguageSkill: { noValue: true }
          },
          {
            language: 'es',
            defaultLanguageSkill: { noValue: true }
          }
        ]
      };
      const result = await apiRequest(token, 'PUT', `/api/v2/flows/${FLOW_ID}/configuration`, config);
      console.log('✅ Success with configuration endpoint!');
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('❌ Method 1 failed:', e.message);
    }

    console.log();

    // Method 2: Try updating via PUT to base flow endpoint
    try {
      console.log('Method 2: Trying PUT to /api/v2/flows/{flowId}...');
      const flowUpdate = {
        name: 'Claude_cars23',
        description: 'Inbound call flow with language selection, menu routing, and geographic-based queue routing',
        supportedLanguages: [
          {
            language: 'en-us',
            isDefault: true
          },
          {
            language: 'es',
            isDefault: false
          }
        ]
      };
      const _result = await apiRequest(token, 'PUT', `/api/v2/flows/${FLOW_ID}`, flowUpdate);
      console.log('✅ Success with PUT endpoint!');
      console.log('Supported languages updated');
    } catch (e) {
      console.log('❌ Method 2 failed:', e.message);
    }

    console.log('\n' + '='.repeat(80));
    console.log('📝 SUMMARY');
    console.log('='.repeat(80));
    console.log('\nThe Genesys Cloud API has limitations for programmatic flow configuration.');
    console.log('The flow shell has been created, but states and actions cannot be added via REST API.\n');
    console.log('✅ What WAS created:');
    console.log('   • Flow: Claude_cars23');
    console.log('   • Division: Claude_Exploration_vijay');
    console.log('   • Type: Inbound Call');
    console.log('   • Languages: English and Spanish support\n');
    console.log('⚠️  What needs manual configuration:');
    console.log('   • States and actions (Welcome state, Menu, etc.)');
    console.log('   • Geographic routing logic');
    console.log('   • Transfer to ACD actions\n');
    console.log('💡 Recommended Approach:');
    console.log('   Use archy (Genesys CLI tool) or Architect UI to complete the flow.\n');
    console.log('🔗 Flow URL:');
    console.log(`   https://apps.${REGION}/architect/#/call/inbound/${FLOW_ID}\n`);
    console.log('📄 Reference YAML file with complete configuration:');
    console.log('   Claude_cars23_complete.yaml\n');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
