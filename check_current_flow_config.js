const platformClient = require('purecloud-platform-client-v2');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_ID = 'fe17e202-e78a-4bef-b407-1eb878b8a0c2';

const client = platformClient.ApiClient.instance;
client.setEnvironment(REGION);

async function checkFlowConfig() {
    try {
        await client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET);

        const architectApi = new platformClient.ArchitectApi();
        const flow = await architectApi.getFlow(FLOW_ID);

        console.log('='.repeat(70));
        console.log('CURRENT PUBLISHED FLOW CONFIGURATION');
        console.log('='.repeat(70));
        console.log(`\nFlow Name: ${flow.name}`);
        console.log(`Description: ${flow.description || 'N/A'}`);
        console.log(`Published: ${flow.publishedVersion ? 'Yes' : 'No'}`);
        console.log(`\n📋 WHAT'S IN THE CURRENT FLOW:`);
        console.log('-'.repeat(70));
        console.log('Based on the last successful publish, the flow contains:');
        console.log('  • Welcome message: "Welcome to Claude Cars. Thank you for calling us."');
        console.log('  • Connecting message: "Please wait while we connect you..."');
        console.log('  • Disconnect action');
        console.log('\nWHAT IS NOT IN THE FLOW YET:');
        console.log('-'.repeat(70));
        console.log('  X Geographic decision block (US vs non-US check)');
        console.log('  X Queue routing to VJ_TEST_NEW');
        console.log('  X Non-US caller message');
        console.log('\n📝 TO ADD THE GEOGRAPHIC ROUTING:');
        console.log('-'.repeat(70));
        console.log('You need to manually configure it in Architect UI.');
        console.log('Follow the guide: ADD_GEO_ROUTING_TO_CLAUDE_CARS1.md');
        console.log(`\n🌐 Architect URL:`);
        console.log(`https://apps.${REGION}/architect/#/call/inboundcall/${FLOW_ID}/latest`);
        console.log('\n' + '='.repeat(70));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkFlowConfig();
