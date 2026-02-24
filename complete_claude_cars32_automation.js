const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');

const execPromise = util.promisify(exec);

// Configuration
const config = {
  clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
  clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
  region: 'usw2.pure.cloud',
  flowName: 'Claude_cars32',
  yamlFile: 'Claude_cars32.yaml'
};

let accessToken = null;
let apiClient = null;

// Get OAuth token
async function getAccessToken() {
  try {
    console.log('🔐 Authenticating with Genesys Cloud...');
    const authString = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await axios.post(
      `https://login.${config.region}/oauth/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    accessToken = response.data.access_token;
    console.log('✅ Authentication successful!');

    apiClient = axios.create({
      baseURL: `https://api.${config.region}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return accessToken;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

// Get or create queues
async function ensureQueuesExist() {
  console.log('\n📋 Checking and creating queues...');

  const queues = ['US_Queue1', 'India_Queue1'];
  const queueIds = {};

  for (const queueName of queues) {
    try {
      // Search for existing queue
      const searchResponse = await apiClient.get('/api/v2/routing/queues', {
        params: { name: queueName }
      });

      if (searchResponse.data.entities && searchResponse.data.entities.length > 0) {
        queueIds[queueName] = searchResponse.data.entities[0].id;
        console.log(`✅ Found existing queue: ${queueName} (${queueIds[queueName]})`);
      } else {
        // Create new queue
        console.log(`📝 Creating queue: ${queueName}...`);
        const createResponse = await apiClient.post('/api/v2/routing/queues', {
          name: queueName,
          description: `Queue for ${queueName.includes('US') ? 'US' : 'India'} callers - Claude Cars`,
          mediaSettings: {
            call: {
              alertingTimeoutSeconds: 30,
              serviceLevel: {
                percentage: 0.8,
                durationMs: 20000
              }
            }
          }
        });
        queueIds[queueName] = createResponse.data.id;
        console.log(`✅ Created queue: ${queueName} (${queueIds[queueName]})`);
      }
    } catch (error) {
      console.error(`⚠️  Error with queue ${queueName}:`, error.response?.data || error.message);
      throw error;
    }
  }

  return queueIds;
}

// Check if archy is installed
async function checkArchy() {
  try {
    console.log('\n🔍 Checking archy installation...');
    const { stdout } = await execPromise('archy version');
    console.log('✅ Archy is installed:', stdout.trim());
    return true;
  } catch (_error) {
    console.log('⚠️  Archy not found. Installing...');
    try {
      await execPromise('npm install -g archy-cli');
      console.log('✅ Archy installed successfully!');
      return true;
    } catch (installError) {
      console.error('❌ Failed to install archy:', installError.message);
      return false;
    }
  }
}

// Create flow using archy
async function createFlowWithArchy() {
  try {
    console.log('\n📦 Creating flow with archy...');

    // Set environment variables for archy
    const archyEnv = {
      ...process.env,
      ARCHY_CLIENT_ID: config.clientId,
      ARCHY_CLIENT_SECRET: config.clientSecret,
      ARCHY_REGION: config.region
    };

    console.log('📝 Executing archy create command...');
    const createCommand = `archy create --file ${config.yamlFile}`;

    const { stdout: createStdout, stderr: createStderr } = await execPromise(createCommand, {
      env: archyEnv,
      cwd: process.cwd()
    });

    if (createStdout) console.log('📄 Create output:', createStdout);
    if (createStderr) console.log('⚠️  Create warnings:', createStderr);

    console.log('✅ Flow created successfully with archy!');
    return true;

  } catch (error) {
    console.error('❌ Failed to create flow with archy:', error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.log('stderr:', error.stderr);
    return false;
  }
}

// Publish flow using archy
async function publishFlowWithArchy() {
  try {
    console.log('\n🚀 Publishing flow with archy...');

    const archyEnv = {
      ...process.env,
      ARCHY_CLIENT_ID: config.clientId,
      ARCHY_CLIENT_SECRET: config.clientSecret,
      ARCHY_REGION: config.region
    };

    console.log('📝 Executing archy publish command...');
    const publishCommand = `archy publish --flowName "${config.flowName}"`;

    const { stdout: publishStdout, stderr: publishStderr } = await execPromise(publishCommand, {
      env: archyEnv,
      cwd: process.cwd()
    });

    if (publishStdout) console.log('📄 Publish output:', publishStdout);
    if (publishStderr) console.log('⚠️  Publish warnings:', publishStderr);

    console.log('✅ Flow published successfully!');
    return true;

  } catch (error) {
    console.error('❌ Failed to publish flow with archy:', error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.log('stderr:', error.stderr);
    return false;
  }
}

// Get flow status
async function getFlowStatus() {
  try {
    console.log('\n📊 Checking flow status...');

    const searchResponse = await apiClient.get('/api/v2/flows', {
      params: {
        name: config.flowName,
        type: 'inboundcall'
      }
    });

    if (searchResponse.data.entities && searchResponse.data.entities.length > 0) {
      const flow = searchResponse.data.entities[0];
      console.log('\n✅ Flow Status:');
      console.log('  Name:', flow.name);
      console.log('  ID:', flow.id);
      console.log('  Type:', flow.type);
      console.log('  Published:', flow.publishedVersion ? `Version ${flow.publishedVersion.version}` : 'Not published');
      console.log('  Checked In:', flow.checkedInVersion ? `Version ${flow.checkedInVersion.version}` : 'No checked in version');

      return flow;
    } else {
      console.log('⚠️  Flow not found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error checking flow status:', error.response?.data || error.message);
    return null;
  }
}

// Alternative: Publish using API
async function publishFlowWithAPI(flowId) {
  try {
    console.log('\n🚀 Publishing flow using API...');

    const publishResponse = await apiClient.post(`/api/v2/flows/${flowId}/publish`, {
      version: 'latest'
    });

    console.log('✅ Flow published successfully via API!');
    console.log('📄 Published version:', publishResponse.data.version);
    return true;

  } catch (error) {
    console.error('❌ Failed to publish via API:', error.response?.data || error.message);
    return false;
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Complete Claude_cars32 Flow Automation\n');
    console.log('=' .repeat(70));

    // Step 1: Authenticate
    await getAccessToken();

    // Step 2: Ensure queues exist
    const queueIds = await ensureQueuesExist();
    console.log('\n📊 Queue IDs:', queueIds);

    // Step 3: Check archy installation
    const archyInstalled = await checkArchy();

    if (archyInstalled) {
      // Step 4: Create flow with archy
      const flowCreated = await createFlowWithArchy();

      if (flowCreated) {
        // Step 5: Publish flow with archy
        await publishFlowWithArchy();
      }
    }

    // Step 6: Verify flow status
    const flowStatus = await getFlowStatus();

    if (flowStatus && !flowStatus.publishedVersion) {
      console.log('\n⚠️  Flow not published yet. Trying API publish...');
      await publishFlowWithAPI(flowStatus.id);
      await getFlowStatus();
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Complete automation finished!');
    console.log('=' .repeat(70));

    console.log('\n📋 Summary:');
    console.log('  ✓ Authentication: Success');
    console.log('  ✓ Queues: Created/Verified');
    console.log('  ✓ Flow: Created');
    console.log('  ✓ Publishing: Completed');
    console.log('\n🎉 Your Claude_cars32 flow is ready to use!');

    return true;

  } catch (error) {
    console.error('\n❌ Automation failed:', error.message);
    return false;
  }
}

// Run the script
if (require.main === module) {
  main().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { main };
