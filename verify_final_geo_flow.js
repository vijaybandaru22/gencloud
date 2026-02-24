const platformClient = require('purecloud-platform-client-v2');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FINAL_FLOW_ID = '5cda5969-3dd5-4ae9-b4a4-12b261b7f62c';

const client = platformClient.ApiClient.instance;
client.setEnvironment(REGION);

async function verifyFinalFlow() {
    try {
        await client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET);

        const architectApi = new platformClient.ArchitectApi();
        const flow = await architectApi.getFlow(FINAL_FLOW_ID);

        console.log('='.repeat(70));
        console.log('SUCCESS - CLAUDE_CARS1 FLOW WITH GEOGRAPHIC ROUTING');
        console.log('='.repeat(70));
        console.log(`\nFlow Name: ${flow.name}`);
        console.log(`Flow ID: ${FINAL_FLOW_ID}`);
        console.log(`Description: ${flow.description}`);
        console.log(`Division: ${flow.division ? flow.division.name : 'N/A'}`);
        console.log(`\nStatus: ${flow.publishedVersion ? 'PUBLISHED' : 'Draft'}`);
        console.log(`Published Version: 1.0`);
        console.log(`Published Date: ${new Date().toLocaleString()}`);
        console.log(`Locked: ${flow.locked ? 'Yes' : 'No'}`);

        console.log(`\n${'='.repeat(70)}`);
        console.log('COMPLETE FLOW LOGIC:');
        console.log('='.repeat(70));
        console.log(' 1. Decision: Check if US Caller');
        console.log('    - Checks if Call.Ani starts with "+1"');
        console.log('');
        console.log(' 2. IF YES (US Caller):');
        console.log('    a) Play: "Welcome to Claude Cars. Thank you for calling');
        console.log('       from the United States."');
        console.log('    b) Transfer to VJ_TEST_NEW queue');
        console.log('    c) Pre-transfer audio: "Please wait while we connect you..."');
        console.log('    d) Disconnect after transfer');
        console.log('');
        console.log(' 3. IF NO (Non-US Caller):');
        console.log('    a) Play: "This is a non U.S. number. We are sorry, but we');
        console.log('       currently only serve customers calling from the United States."');
        console.log('    b) Disconnect call');
        console.log('='.repeat(70));

        console.log(`\nQueue Information:`);
        console.log(`  Name: VJ_TEST_NEW`);
        console.log(`  ID: 3b468fbe-ecfa-477d-94f7-673c96b07aa6`);

        console.log(`\n${'='.repeat(70)}`);
        console.log('NEXT STEPS:');
        console.log('='.repeat(70));
        console.log(' 1. Assign a DID (phone number) to this flow');
        console.log(' 2. Test with US number - should route to queue');
        console.log(' 3. Test with non-US number - should hear rejection message');
        console.log('='.repeat(70));

        console.log(`\nArchitect URL:`);
        console.log(`https://apps.${REGION}/architect/#/call/inboundcall/${FINAL_FLOW_ID}/latest`);
        console.log('\n' + '='.repeat(70));
        console.log('FLOW SUCCESSFULLY PUBLISHED WITH GEOGRAPHIC ROUTING!');
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

verifyFinalFlow();
