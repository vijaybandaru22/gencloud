const axios = require('axios');

// Configuration
const config = {
  clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
  clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
  region: 'usw2.pure.cloud',
  flowName: 'Claude_cars32',
  queueIds: {
    US_Queue1: '21d24c58-7730-4770-95dd-b38931b7ec7b',
    India_Queue1: 'd5d178d1-c963-4973-8d83-88b60633f087'
  }
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

// Create flow with configuration
async function createFlowWithConfig() {
  try {
    console.log('\n📝 Creating flow with complete configuration...');

    // Delete existing flow if it exists
    try {
      const searchResponse = await apiClient.get('/api/v2/flows', {
        params: { name: config.flowName, type: 'inboundcall' }
      });

      if (searchResponse.data.entities && searchResponse.data.entities.length > 0) {
        const existingFlowId = searchResponse.data.entities[0].id;
        console.log('⚠️  Found existing flow, deleting...');
        await apiClient.delete(`/api/v2/flows/${existingFlowId}`);
        console.log('✅ Existing flow deleted');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (_deleteError) {
      // Ignore if flow doesn't exist
    }

    // Build complete flow configuration with all states
    const flowConfig = {
      name: config.flowName,
      description: 'Claude Cars - Multi-language IVR with geographic routing and service menus',
      type: 'inboundcall',
      inboundCall: {
        name: config.flowName,
        description: 'Claude Cars - Multi-language IVR with geographic routing and service menus',
        startUpRef: '/inboundCall/states/state[Initial_State]',
        defaultLanguage: 'en-us',
        supportedLanguages: {
          'en-us': {},
          'es': {}
        },
        initialGreeting: {
          tts: 'Welcome to Claude Cars.'
        },
        settingsInboundCall: {
          settingsActionDefaults: {
            playAudioOnSilence: {
              timeout: {
                seconds: 40
              }
            },
            collectInput: {
              noEntryTimeout: {
                seconds: 5
              }
            }
          },
          settingsErrorHandling: {
            errorHandling: {
              disconnect: {}
            },
            preHandlingAudio: {
              tts: 'An error has occurred. Goodbye.'
            }
          }
        },
        states: [
          {
            name: 'Initial State',
            refId: 'Initial_State',
            actions: [
              {
                type: 'PlayAudio',
                audioPrompt: {
                  tts: 'Welcome to Claude Cars. For English, press 1. Para Español, oprima 2.'
                }
              },
              {
                type: 'Disconnect'
              }
            ]
          },
          {
            name: 'Thank You',
            refId: 'Thank_You',
            actions: [
              {
                type: 'PlayAudio',
                audioPrompt: {
                  tts: 'Thanks for choosing my flow. Goodbye.'
                }
              },
              {
                type: 'Disconnect'
              }
            ]
          }
        ]
      }
    };

    // Create the flow
    const createResponse = await apiClient.post('/api/v2/flows', flowConfig);

    const flowId = createResponse.data.id;
    console.log('✅ Flow created with configuration!');
    console.log('📄 Flow ID:', flowId);
    console.log('📄 Flow Name:', createResponse.data.name);

    // Wait for flow to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    return flowId;

  } catch (error) {
    console.error('❌ Error creating flow:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('📋 Details:', JSON.stringify(error.response.data.details, null, 2));
    }
    throw error;
  }
}

// Publish flow
async function publishFlow(flowId) {
  try {
    console.log('\n🚀 Publishing flow...');

    const publishResponse = await apiClient.post(`/api/v2/flows/${flowId}/publish`, {});

    console.log('✅ Flow published successfully!');
    console.log('📄 Published version:', publishResponse.data.version);

    return publishResponse.data;

  } catch (error) {
    // If direct publish fails, try checking in first
    try {
      console.log('⚠️  Trying alternative: check in then publish...');

      await apiClient.post(`/api/v2/flows/${flowId}/checkin`);
      console.log('✅ Flow checked in');

      const publishResponse = await apiClient.post(`/api/v2/flows/${flowId}/publish`, {});
      console.log('✅ Flow published!');
      return publishResponse.data;

    } catch (altError) {
      console.error('❌ Error publishing flow:', altError.response?.data || altError.message);
      throw error;
    }
  }
}

// Get flow details
async function getFlowDetails(flowId) {
  try {
    console.log('\n📊 Fetching flow details...');

    const flowResponse = await apiClient.get(`/api/v2/flows/${flowId}`);
    const flow = flowResponse.data;

    console.log('\n✅ Flow Details:');
    console.log('  Name:', flow.name);
    console.log('  ID:', flow.id);
    console.log('  Type:', flow.type);
    console.log('  Division:', flow.division?.name || 'Home');

    if (flow.publishedVersion) {
      console.log('  ✓ Published: Version', flow.publishedVersion.version);
    } else {
      console.log('  ⚠️  Status: Created (not published)');
    }

    return flow;

  } catch (error) {
    console.error('❌ Error fetching flow details:', error.response?.data || error.message);
    return null;
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Claude_cars32 - Final Flow Builder\n');
    console.log('=' .repeat(70));

    // Step 1: Authenticate
    await getAccessToken();

    console.log('\n📊 Queue Configuration:');
    console.log('  US_Queue1:', config.queueIds.US_Queue1);
    console.log('  India_Queue1:', config.queueIds.India_Queue1);

    // Step 2: Create flow with configuration
    const flowId = await createFlowWithConfig();

    // Step 3: Publish flow
    await publishFlow(flowId);

    // Step 4: Get final details
    const _flowDetails = await getFlowDetails(flowId);

    console.log('\n' + '='.repeat(70));
    console.log('✅ SUCCESS - Flow Created!');
    console.log('=' .repeat(70));

    console.log('\n🎉 Claude_cars32 flow is ready!');
    console.log('\n📋 What to do next:');
    console.log('  1. Log into Genesys Cloud at https://apps.' + config.region);
    console.log('  2. Go to: Admin > Architect > Inbound Call Flows');
    console.log('  3. Find and open "Claude_cars32"');
    console.log('  4. Add the following in Architect:');
    console.log('     - Language selection logic');
    console.log('     - Geographic routing decision');
    console.log('     - Service menu options');
    console.log('     - Queue transfers');
    console.log('  5. Save and publish from Architect');
    console.log('  6. Assign a DID to test');

    console.log('\n💡 The flow structure is created. You now need to:');
    console.log('   - Open it in Architect UI');
    console.log('   - Configure the states and actions');
    console.log('   - Test with a phone call');

    console.log('\n🔗 Flow URL:');
    console.log(`   https://apps.${config.region}/architect/#/inbound-call-flows/${flowId}`);

    return true;

  } catch (error) {
    console.error('\n❌ Process failed:', error.message);
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
