const platformClient = require('purecloud-platform-client-v2');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_ID = 'fe17e202-e78a-4bef-b407-1eb878b8a0c2';

const client = platformClient.ApiClient.instance;
client.setEnvironment(REGION);

async function checkPublishedStatus() {
    try {
        await client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET);

        const architectApi = new platformClient.ArchitectApi();
        const flow = await architectApi.getFlow(FLOW_ID);

        console.log('='.repeat(70));
        console.log('CLAUDE_CARS1 FLOW - PUBLISHED STATUS');
        console.log('='.repeat(70));
        console.log(`\nFlow Name: ${flow.name}`);
        console.log(`Flow ID: ${flow.id}`);
        console.log(`Flow Type: ${flow.type}`);
        console.log(`\n📊 PUBLICATION STATUS:`);
        console.log('-'.repeat(70));

        if (flow.publishedVersion) {
            console.log(`✅ STATUS: PUBLISHED`);
            console.log(`   Published Version: ${flow.publishedVersion.version || 'N/A'}`);
            console.log(`   Published Date: ${flow.publishedVersion.datePublished || 'N/A'}`);
            console.log(`   Published By: ${flow.publishedVersion.generatedBy ? flow.publishedVersion.generatedBy.name : 'N/A'}`);
        } else {
            console.log(`⚠️  STATUS: NOT PUBLISHED (Draft only)`);
        }

        if (flow.checkedInVersion) {
            console.log(`\n   Checked-In Version: ${flow.checkedInVersion.version || 'N/A'}`);
        }

        if (flow.savedVersion) {
            console.log(`   Saved Version: ${flow.savedVersion.version || 'N/A'}`);
        }

        console.log(`\n🔒 Lock Status: ${flow.locked ? 'Locked' : 'Unlocked'}`);
        if (flow.lockedUser) {
            console.log(`   Locked By: ${flow.lockedUser.name}`);
        }

        console.log('\n' + '='.repeat(70));
        console.log(`\n🌐 View in Architect:`);
        console.log(`https://apps.${REGION}/architect/#/call/inboundcall/${flow.id}/latest`);
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkPublishedStatus();
