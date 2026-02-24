const platformClient = require('purecloud-platform-client-v2');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_ID = 'fe17e202-e78a-4bef-b407-1eb878b8a0c2';
const _QUEUE_ID = '3b468fbe-ecfa-477d-94f7-673c96b07aa6'; // VJ_TEST_NEW queue

const client = platformClient.ApiClient.instance;
client.setEnvironment(REGION);

async function updateFlowWithGeoRouting() {
    console.log('='.repeat(70));
    console.log('UPDATING CLAUDE_CARS1 WITH GEOGRAPHIC ROUTING');
    console.log('='.repeat(70) + '\n');

    try {
        // Authenticate
        await client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET);
        console.log('✅ Authenticated\n');

        const architectApi = new platformClient.ArchitectApi();

        // Step 1: Get current flow configuration
        console.log('📥 Fetching current flow...');
        const flow = await architectApi.getFlow(FLOW_ID);
        console.log(`✅ Found flow: ${flow.name}\n`);

        // Step 2: Update flow description
        console.log('📝 Updating flow with geographic routing and queue transfer...\n');

        const updatedFlow = {
            name: 'Claude_cars1',
            description: 'Claude Cars inbound flow with US geographic check routing to VJ_TEST_NEW queue',
            type: 'inboundcall',
            division: {
                id: flow.division.id
            }
        };

        // Update the flow
        const result = await architectApi.putFlow(FLOW_ID, updatedFlow);
        console.log('✅ Flow updated successfully!\n');

        console.log('ℹ️  Note: The Genesys Cloud API has limited support for updating flow logic programmatically.');
        console.log('   To add the decision block and queue routing, you have two options:\n');

        console.log('Option 1: Manual Configuration in Architect UI');
        console.log('='.repeat(70));
        console.log(`1. Open: https://apps.${REGION}/architect/#/call/inboundcall/${FLOW_ID}/latest`);
        console.log('2. Click "Edit" to unlock the flow');
        console.log('3. Delete the existing "Welcome" task');
        console.log('4. Add a new "Decision" action:');
        console.log('   - Name: "Check if US Caller"');
        console.log('   - Expression Builder: Select "Call" > "ANI" (Automatic Number Identification)');
        console.log('   - Then add condition: Contains(Call.Ani, "+1")');
        console.log('   - Or simpler: Use the "Get Participant Data" action first to set a variable\n');
        console.log('5. For "Yes" (US caller) path:');
        console.log('   - Add "Play Audio" action: "Welcome to Claude Cars"');
        console.log('   - Add "Transfer to ACD" action');
        console.log('   - Select Queue: "VJ_TEST_NEW"');
        console.log('   - Add pre-transfer audio: "Connecting you to an agent"\n');
        console.log('6. For "No" (non-US caller) path:');
        console.log('   - Add "Play Audio" action: "This is a non U.S. number"');
        console.log('   - Add "Disconnect" action\n');
        console.log('7. Click "Save" then "Publish"\n');

        console.log('Option 2: Import Pre-configured Flow (Recommended)');
        console.log('='.repeat(70));
        console.log('I can create a working YAML template that you can import via Architect:\n');
        console.log('1. I\'ll create a properly formatted flow YAML');
        console.log('2. You import it via Architect > Import');
        console.log('3. Publish the imported flow\n');

        console.log('='.repeat(70));
        console.log('Would you like me to:');
        console.log('A) Create a detailed step-by-step guide with screenshots?');
        console.log('B) Create an importable flow template?');
        console.log('C) Open the Architect URL for manual configuration?');
        console.log('='.repeat(70) + '\n');

        console.log('📊 Current Flow Status:');
        console.log(`   Name: ${result.name}`);
        console.log(`   ID: ${result.id}`);
        console.log(`   Description: ${result.description}`);
        console.log(`   Division: ${result.division.name}`);
        console.log(`\n🌐 Architect URL: https://apps.${REGION}/architect/#/call/inboundcall/${FLOW_ID}/latest\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.body) {
            console.error('Details:', JSON.stringify(error.body, null, 2));
        }
    }
}

updateFlowWithGeoRouting();
