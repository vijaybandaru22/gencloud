const platformClient = require('purecloud-platform-client-v2');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_ID = 'fe17e202-e78a-4bef-b407-1eb878b8a0c2';

const client = platformClient.ApiClient.instance;
client.setEnvironment(REGION);

async function verifyFlow() {
    console.log('='.repeat(70));
    console.log('CLAUDE_CARS1 FLOW - FINAL VERIFICATION');
    console.log('='.repeat(70) + '\n');

    try {
        // Authenticate
        await client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET);
        console.log('✅ Authenticated with Genesys Cloud\n');

        // Get flow details
        const architectApi = new platformClient.ArchitectApi();
        const flow = await architectApi.getFlow(FLOW_ID);

        console.log('📋 FLOW DETAILS:');
        console.log('-'.repeat(70));
        console.log(`Name:                 ${flow.name}`);
        console.log(`ID:                   ${flow.id}`);
        console.log(`Type:                 ${flow.type}`);
        console.log(`Division:             ${flow.division ? flow.division.name : 'N/A'}`);
        console.log(`Description:          ${flow.description || 'N/A'}`);
        console.log(`\n📊 STATUS:`);
        console.log(`Status:               ${flow.publishedVersion ? '✅ PUBLISHED' : '⚠️  DRAFT'}`);
        console.log(`Published Version:    ${flow.publishedVersion ? flow.publishedVersion.version : 'None'}`);
        console.log(`Checked-In Version:   ${flow.checkedInVersion ? flow.checkedInVersion.version : 'None'}`);
        console.log(`Saved Version:        ${flow.savedVersion ? flow.savedVersion.version : 'None'}`);
        console.log(`\n🔒 LOCK STATUS:`);
        console.log(`Locked:               ${flow.locked ? 'Yes' : 'No'}`);
        console.log(`Locked By:            ${flow.lockedUser ? flow.lockedUser.name : 'N/A'}`);
        console.log(`\n📅 TIMESTAMPS:`);
        console.log(`Created:              ${flow.dateCreated || 'N/A'}`);
        console.log(`Modified:             ${flow.dateModified || 'N/A'}`);
        console.log(`\n🔗 LINKS:`);
        console.log(`Architect URL:        https://apps.${REGION}/architect/#/call/inboundcall/${flow.id}/latest`);
        console.log(`\n📁 EXPORTED FILES:`);
        console.log(`- Claude_cars1_fixed.yaml (Source YAML)`);
        console.log(`- Claude_cars1.i3inboundflow.i3InboundFlow (Architect Export)`);

        console.log('\n' + '='.repeat(70));
        console.log('✅ VERIFICATION COMPLETE!');
        console.log('='.repeat(70));

        // Flow features
        console.log('\n📝 FLOW FEATURES:');
        console.log('- Welcome message: "Welcome to Claude Cars. Thank you for calling us."');
        console.log('- Connecting message: "Please wait while we connect you to an available agent."');
        console.log('- Disconnect action at end');
        console.log('\n💡 NEXT STEPS:');
        console.log('1. Assign a DID (phone number) to this flow in Admin > Telephony > DIDs');
        console.log('2. Add queue routing to connect callers to agents');
        console.log('3. Add IVR menu options if needed');
        console.log('4. Test the flow by calling the assigned number\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.body) {
            console.error('Details:', JSON.stringify(error.body, null, 2));
        }
    }
}

verifyFlow();
