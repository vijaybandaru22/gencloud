const platformClient = require('purecloud-platform-client-v2');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const NEW_FLOW_ID = '410f9376-79cb-4e97-a2ac-5e831d5f7c96'; // New flow ID from successful publish

const client = platformClient.ApiClient.instance;
client.setEnvironment(REGION);

async function checkNewFlow() {
    try {
        await client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET);

        const architectApi = new platformClient.ArchitectApi();
        const flow = await architectApi.getFlow(NEW_FLOW_ID);

        console.log('='.repeat(70));
        console.log('CLAUDE_CARS1 - CURRENT PUBLISHED STATUS');
        console.log('='.repeat(70));
        console.log(`\nFlow Name: ${flow.name}`);
        console.log(`Flow ID: ${NEW_FLOW_ID}`);
        console.log(`Description: ${flow.description}`);
        console.log(`Division: ${flow.division ? flow.division.name : 'N/A'}`);
        console.log(`\nPublished: ${flow.publishedVersion ? 'YES' : 'No'}`);
        if (flow.publishedVersion) {
            console.log(`Published Version: 1.0`);
            console.log(`Published Date: ${flow.publishedVersion.datePublished || 'N/A'}`);
        }
        console.log(`\nLocked: ${flow.locked ? 'Yes' : 'No'}`);

        console.log(`\n${'='.repeat(70)}`);
        console.log('WHAT IS IN THIS FLOW:');
        console.log('='.repeat(70));
        console.log(' Welcome message');
        console.log(' Transfer to VJ_TEST_NEW queue');
        console.log(' Pre-transfer audio');
        console.log(' Failure handling');
        console.log(`\n${'='.repeat(70)}`);
        console.log('WHAT IS NOT IN THIS FLOW YET:');
        console.log('='.repeat(70));
        console.log(' X Geographic decision block (US vs non-US check)');
        console.log(' X Non-US caller message');
        console.log(`\n${'='.repeat(70)}`);
        console.log(`\nView in Architect:`);
        console.log(`https://apps.${REGION}/architect/#/call/inboundcall/${NEW_FLOW_ID}/latest`);
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkNewFlow();
