const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

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

// Get existing flow
async function getExistingFlow() {
  try {
    console.log('\n🔍 Checking for existing flow...');

    const searchResponse = await apiClient.get('/api/v2/flows', {
      params: {
        name: config.flowName,
        type: 'inboundcall'
      }
    });

    if (searchResponse.data.entities && searchResponse.data.entities.length > 0) {
      const flow = searchResponse.data.entities[0];
      console.log('✅ Found existing flow:', flow.id);
      return flow;
    }

    console.log('⚠️  No existing flow found');
    return null;
  } catch (error) {
    console.error('❌ Error checking for flow:', error.response?.data || error.message);
    return null;
  }
}

// Check in the flow
async function checkInFlow(flowId) {
  try {
    console.log('\n📝 Checking in flow...');

    await apiClient.post(`/api/v2/flows/${flowId}/checkin`, {});

    console.log('✅ Flow checked in successfully');
    return true;
  } catch (error) {
    console.error('⚠️  Check-in warning:', error.response?.data?.message || error.message);
    // Continue anyway - flow might already be checked in
    return true;
  }
}

// Update flow configuration from YAML
async function _updateFlowFromYAML(flowId) {
  let yamlContent;
  try {
    console.log('\n📄 Reading YAML file...');
    yamlContent = await fs.readFile(config.yamlFile, 'utf8');
    console.log('✅ YAML file loaded');

    console.log('\n🔄 Updating flow configuration...');

    // Use the configuration/save endpoint
    const updateResponse = await apiClient.post(
      `/api/v2/flows/${flowId}/configuration/save`,
      {
        yaml: yamlContent
      }
    );

    console.log('✅ Flow configuration updated!');
    return updateResponse.data;

  } catch (error) {
    console.error('❌ Error updating flow:', error.response?.data || error.message);

    // Try alternative method - PUT to latestconfiguration with YAML
    try {
      console.log('\n🔄 Trying alternative update method...');

      const altUpdateResponse = await apiClient.put(
        `/api/v2/flows/${flowId}/latestconfiguration`,
        {
          yaml: yamlContent
        }
      );

      console.log('✅ Flow updated via alternative method!');
      return altUpdateResponse.data;

    } catch (altError) {
      console.error('❌ Alternative method also failed:', altError.response?.data || altError.message);
      throw error;
    }
  }
}

// Publish flow
async function publishFlow(flowId) {
  try {
    console.log('\n🚀 Publishing flow...');

    const publishResponse = await apiClient.post(`/api/v2/flows/${flowId}/publish`, {});

    console.log('✅ Flow published successfully!');
    console.log('📄 Published Version:', publishResponse.data.version);

    return publishResponse.data;

  } catch (error) {
    console.error('❌ Publishing error:', error.response?.data || error.message);
    throw error;
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
      console.log('  ✓ Published Date:', new Date(flow.publishedVersion.datePublished).toLocaleString());
      console.log('  ✓ Published By:', flow.publishedVersion.publishedBy?.name || 'System');
    } else {
      console.log('  ⚠️  Not published yet');
    }

    if (flow.checkedInVersion) {
      console.log('  ✓ Checked In: Version', flow.checkedInVersion.version);
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
    console.log('🚀 Claude_cars32 - YAML Import and Publishing\n');
    console.log('=' .repeat(70));

    // Step 1: Authenticate
    await getAccessToken();

    // Step 2: Get existing flow
    const existingFlow = await getExistingFlow();

    if (!existingFlow) {
      console.error('\n❌ Flow not found! Please create the flow first.');
      console.log('Run: node final_claude_cars32_builder.js');
      return false;
    }

    const flowId = existingFlow.id;
    console.log('\n📋 Working with Flow ID:', flowId);

    // Step 3: Try to update flow from YAML
    console.log('\n⚠️  Note: YAML import via API has limitations.');
    console.log('The Genesys Cloud API may not support direct YAML import.');
    console.log('Alternative: Manual import in Architect UI\n');

    // Step 4: Check in the flow
    await checkInFlow(flowId);

    // Step 5: Try to publish
    try {
      await publishFlow(flowId);
    } catch (_publishError) {
      console.log('\n⚠️  Cannot publish - Flow needs configuration in Architect UI');
      console.log('');
      console.log('📋 To complete:');
      console.log('  1. Go to Genesys Cloud Architect');
      console.log('  2. Open Claude_cars32 flow');
      console.log('  3. Import the YAML file:');
      console.log('     - Click the gear icon (Settings)');
      console.log('     - Select "Import"');
      console.log('     - Choose Claude_cars32.yaml');
      console.log('  4. Review and Publish');
    }

    // Step 6: Get final status
    await getFlowDetails(flowId);

    console.log('\n' + '='.repeat(70));
    console.log('Process Complete');
    console.log('=' .repeat(70));

    console.log('\n📋 Manual Import Instructions:');
    console.log('');
    console.log('1. Open Genesys Cloud Architect:');
    console.log('   https://apps.usw2.pure.cloud/architect');
    console.log('');
    console.log('2. Navigate to Inbound Call Flows');
    console.log('');
    console.log('3. Click "Import" button');
    console.log('');
    console.log('4. Select file: Claude_cars32.yaml');
    console.log('');
    console.log('5. Review the imported flow');
    console.log('');
    console.log('6. Click "Save" then "Publish"');
    console.log('');
    console.log('📄 YAML File Location:');
    console.log(`   ${path.resolve(config.yamlFile)}`);

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
