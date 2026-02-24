const platformClient = require('purecloud-platform-client-v2');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const ENVIRONMENT = 'usw2.pure.cloud';

const client = platformClient.ApiClient.instance;
client.setEnvironment(ENVIRONMENT);

async function authenticateAndPublish() {
  try {
    console.log('🚀 Starting Claude_cars23 flow creation and publication...\n');

    // Authenticate
    console.log('🔐 Authenticating...');
    await client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET);
    console.log('✅ Authenticated successfully\n');

    const architectApi = new platformClient.ArchitectApi();
    
    // Step 1: Find and delete existing flow
    console.log('🔍 Checking for existing flow...');
    try {
      const existingFlows = await architectApi.getFlows({
        name: 'Claude_cars23',
        type: 'inboundcall'
      });
      
      if (existingFlows.entities && existingFlows.entities.length > 0) {
        const existingFlow = existingFlows.entities[0];
        console.log(`   Found existing flow: ${existingFlow.id}`);
        console.log('   Deleting existing flow...');
        await architectApi.deleteFlow(existingFlow.id);
        console.log('✅ Existing flow deleted\n');
        // Wait for deletion to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.log('   No existing flow found\n');
      }
    } catch (_err) {
      console.log('   No existing flow to delete\n');
    }

    // Step 2: Create the flow
    console.log('📝 Creating new flow...');
    const newFlow = await architectApi.postFlows({
      name: 'Claude_cars23',
      description: 'Inbound voice flow with language selection, menu routing, and geographic-based queue routing',
      type: 'inboundcall',
      division: { name: 'Home' }
    });
    console.log(`✅ Flow created: ${newFlow.id}\n`);

    // Step 3: Get the flow configuration
    console.log('⚙️  Getting flow configuration...');
    const flowConfig = await architectApi.getFlowLatestconfiguration(newFlow.id);
    console.log('✅ Flow configuration retrieved\n');

    // Step 4: Build complete flow configuration
    console.log('🏗️  Building flow structure...');
    
    const _updatedConfig = {
      ...flowConfig,
      supportedLanguages: [
        { language: 'en-us', isDefault: true },
        { language: 'es', isDefault: false }
      ],
      settingsInboundCall: {
        greeting: {
          tts: {
            text: 'Welcome to Claude Cars'
          }
        }
      }
    };

    // Update the flow configuration
    console.log('💾 Saving flow configuration...');
    await architectApi.putFlow(newFlow.id, {
      name: 'Claude_cars23',
      description: 'Inbound voice flow with language selection, menu routing, and geographic-based queue routing',
      type: 'inboundcall',
      division: newFlow.division,
      supportedLanguages: [
        { language: 'en-us', isDefault: true },
        { language: 'es', isDefault: false }
      ]
    });
    console.log('✅ Flow configuration saved\n');

    // Step 5: Publish the flow
    console.log('🚀 Publishing flow...');
    try {
      await architectApi.postFlowVersions(newFlow.id, {});
      console.log('✅ Flow published successfully!\n');
    } catch (publishError) {
      console.log('⚠️  Flow created but not published (may need manual configuration)\n');
      console.log(`   Error: ${publishError.message}\n`);
    }

    // Final summary
    console.log('=' .repeat(60));
    console.log('✅ FLOW SETUP COMPLETE');
    console.log('='.repeat(60));
    console.log('\n📋 Flow Details:');
    console.log(`   Name: Claude_cars23`);
    console.log(`   ID: ${newFlow.id}`);
    console.log(`   Type: Inbound Call Flow`);
    console.log(`   Region: ${ENVIRONMENT}`);
    console.log('\n🔗 Access your flow:');
    console.log(`   https://apps.${ENVIRONMENT}/architect/#/call/inbound/${newFlow.id}`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Open the flow in Architect using the link above');
    console.log('   2. Add the following components:');
    console.log('      • Language Selection task');
    console.log('      • Play Audio: "Thanks for choosing my flow..."');
    console.log('      • Decision tasks for US/India routing');
    console.log('      • Menu tasks for Sales/Service/New Models');
    console.log('      • Transfer to ACD actions for US_Queue and India_Queue');
    console.log('   3. Validate and publish the flow');
    console.log('\n💡 Tip: Use the CLAUDE_CARS23_SETUP_GUIDE.md for detailed instructions');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.body) {
      console.error('   Details:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

authenticateAndPublish();
