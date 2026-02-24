const platformClient = require('purecloud-platform-client-v2');

// Configure client
const client = platformClient.ApiClient.instance;
client.setEnvironment('usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

console.log('🔍 Checking flow status in Genesys Cloud...\n');

// Login and check flow
client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('✅ Successfully authenticated\n');

    const architectApi = new platformClient.ArchitectApi();

    // Search for archy_test flow
    return architectApi.getFlows({
      name: 'archy_test',
      type: 'INBOUNDCALL'
    });
  })
  .then((flows) => {
    if (flows.entities && flows.entities.length > 0) {
      const flow = flows.entities[0];

      console.log('========================================');
      console.log('✅ FLOW FOUND IN GENESYS CLOUD');
      console.log('========================================\n');

      console.log('Flow Information:');
      console.log(`  Name: ${flow.name}`);
      console.log(`  ID: ${flow.id}`);
      console.log(`  Type: ${flow.type}`);
      console.log(`  Division: ${flow.division ? flow.division.name : 'Home'}`);
      console.log(`  Created: ${flow.dateCreated || 'N/A'}`);
      console.log(`  Modified: ${flow.dateModified || 'N/A'}`);
      console.log(`  Created By: ${flow.createdBy ? flow.createdBy.name : 'N/A'}`);
      console.log(`  Modified By: ${flow.modifiedBy ? flow.modifiedBy.name : 'N/A'}\n`);

      // Check if flow is published
      const architectApi = new platformClient.ArchitectApi();
      return architectApi.getFlow(flow.id, { includeConfiguration: false })
        .then((detailedFlow) => {
          console.log('Publication Status:');
          console.log(`  Published: ${detailedFlow.publishedVersion ? 'YES ✅' : 'NO ❌'}`);

          if (detailedFlow.publishedVersion) {
            console.log(`  Published Version: ${detailedFlow.publishedVersion.version || 'N/A'}`);
            console.log(`  Published Date: ${detailedFlow.publishedVersion.datePublished || 'N/A'}`);
            console.log(`  Published By: ${detailedFlow.publishedVersion.publishedBy ? detailedFlow.publishedVersion.publishedBy.name : 'N/A'}\n`);

            console.log('========================================');
            console.log('✅ FLOW IS PUBLISHED AND READY!');
            console.log('========================================\n');

            console.log('Next Steps:');
            console.log('========================================');
            console.log('1. View in Architect:');
            console.log('   https://apps.usw2.pure.cloud/architect/#/flows/inboundCall/' + flow.id);
            console.log('\n2. Configure Call Routing:');
            console.log('   Admin > Telephony > Call Routing');
            console.log('   Point your DID to this flow\n');
            console.log('3. Test the flow:');
            console.log('   Call your DID and test menu options\n');
          } else {
            console.log('\n========================================');
            console.log('⚠️  FLOW EXISTS BUT NOT PUBLISHED');
            console.log('========================================\n');
            console.log('Current Status:');
            console.log(`  Checked Out: ${detailedFlow.checkedOutVersion ? 'Yes' : 'No'}`);
            console.log(`  Has Saved Version: ${detailedFlow.savedVersion ? 'Yes' : 'No'}\n`);
            console.log('The flow needs to be published in Architect before it can be used.\n');
          }

          return detailedFlow;
        });
    } else {
      console.log('========================================');
      console.log('❌ FLOW NOT FOUND');
      console.log('========================================\n');
      console.log('Flow "archy_test" does NOT exist in Genesys Cloud.\n');
      console.log('The flow may not have been created successfully.');
      console.log('Try running the publish script again:\n');
      console.log('  node publish_archy_test.js\n');
    }
  })
  .catch((err) => {
    console.error('❌ Error checking flow status:');
    console.error(err.message || err);
    if (err.body) {
      console.error('\nError details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  });
