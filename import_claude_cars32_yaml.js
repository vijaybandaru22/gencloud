const axios = require('axios');
const fs = require('fs').promises;

// Configuration
const config = {
  clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
  clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
  region: 'usw2.pure.cloud',
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

// Import flow from YAML
async function importFlowFromYAML() {
  try {
    console.log('\n📝 Reading YAML file...');
    const yamlContent = await fs.readFile(config.yamlFile, 'utf8');
    console.log('✅ YAML file loaded');

    console.log('\n📦 Importing flow to Genesys Cloud...');

    // Use the flow import API
    const importResponse = await apiClient.post('/api/v2/flows/imports', {
      yaml: yamlContent
    });

    console.log('✅ Flow import initiated!');
    console.log('📄 Import Job ID:', importResponse.data.id);

    return importResponse.data.id;

  } catch (error) {
    console.error('❌ Error importing flow:', error.response?.data || error.message);
    throw error;
  }
}

// Check import status
async function checkImportStatus(importId) {
  try {
    console.log('\n⏳ Checking import status...');

    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      const statusResponse = await apiClient.get(`/api/v2/flows/imports/${importId}`);
      const status = statusResponse.data.status;

      console.log(`  Status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);

      if (status === 'SUCCESS') {
        console.log('✅ Import completed successfully!');
        return statusResponse.data;
      } else if (status === 'FAILED') {
        console.error('❌ Import failed!');
        console.error('Error:', statusResponse.data.error);
        throw new Error('Import failed');
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('Import timeout - exceeded maximum attempts');

  } catch (error) {
    console.error('❌ Error checking import status:', error.response?.data || error.message);
    throw error;
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
    console.error('❌ Error publishing flow:', error.response?.data || error.message);
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
      console.log('  Published Version:', flow.publishedVersion.version);
      console.log('  Published Date:', new Date(flow.publishedVersion.datePublished).toLocaleString());
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

    // Step 2: Import flow from YAML
    const importId = await importFlowFromYAML();

    // Step 3: Wait for import to complete
    const importResult = await checkImportStatus(importId);

    // Get the flow ID from import result
    const flowId = importResult.flowId;
    console.log('\n📄 Flow ID:', flowId);

    // Step 4: Publish flow
    await publishFlow(flowId);

    // Step 5: Verify
    await getFlowDetails(flowId);

    console.log('\n' + '='.repeat(70));
    console.log('✅ COMPLETE SUCCESS!');
    console.log('=' .repeat(70));

    console.log('\n🎉 Your Claude_cars32 flow is now live!');
    console.log('\n📋 Flow Features:');
    console.log('  ✓ Language Selection (English/Spanish)');
    console.log('  ✓ Geographic Routing (US +1 / India +91)');
    console.log('  ✓ Service Menu (Sales/Services/New Models)');
    console.log('  ✓ Queue Routing (US_Queue1 / India_Queue1)');
    console.log('  ✓ Thank You Message & Disconnect');

    console.log('\n📞 Next Steps:');
    console.log('  1. Log into Genesys Cloud Admin');
    console.log('  2. Go to Routing > Call Routing');
    console.log('  3. Assign a DID number to Claude_cars32');
    console.log('  4. Make a test call!');

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
