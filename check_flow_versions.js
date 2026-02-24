const platformClient = require('purecloud-platform-client-v2');

const client = platformClient.ApiClient.instance;
client.setEnvironment('https://api.usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

async function checkVersions() {
    try {
        await client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET);

        const architectApi = new platformClient.ArchitectApi();

        // Get the flow
        const flows = await architectApi.getFlows({
            type: 'inboundcall',
            name: 'Claude_cars'
        });

        const flowId = flows.entities[0].id;
        console.log(`Flow ID: ${flowId}\n`);

        // Get versions
        const versions = await architectApi.getFlowVersions(flowId);

        console.log('=== FLOW VERSIONS ===');
        console.log(`Total versions: ${versions.total || 0}\n`);

        if (versions.entities && versions.entities.length > 0) {
            versions.entities.forEach((version, index) => {
                console.log(`Version ${index + 1}:`);
                console.log(`  Version Number: ${version.version || 'N/A'}`);
                console.log(`  ID: ${version.id}`);
                console.log(`  Committed: ${version.datePublished ? 'Yes' : 'No'}`);
                console.log(`  Date: ${version.datePublished || 'N/A'}`);
                console.log('');
            });

            console.log('✓ Flow has been published!');
            console.log(`  Latest version: ${versions.entities[0].version || '1'}`);
        } else {
            console.log('No published versions found yet.');
            console.log('The flow may still be processing...');
        }

        // Also try to get the latest published configuration
        console.log('\n=== CHECKING LATEST CONFIGURATION ===');
        try {
            const latestConfig = await architectApi.getFlowLatestconfiguration(flowId);
            console.log('✓ Latest configuration retrieved');
            console.log(`  Version: ${latestConfig.version || 'N/A'}`);
            console.log(`  Is Published: ${latestConfig.published || false}`);
        } catch (e) {
            console.log('Latest configuration check:', e.message);
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.body) {
            console.error('Details:', JSON.stringify(error.body, null, 2));
        }
    }
}

checkVersions();
