const platformClient = require('purecloud-platform-client-v2');

// Configure client
const client = platformClient.ApiClient.instance;
client.setEnvironment('usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

console.log('🚀 Publishing archy_test flow...\n');

// Login and publish flow
client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('✅ Successfully authenticated\n');

    const architectApi = new platformClient.ArchitectApi();

    // Find the flow first
    return architectApi.getFlows({
      name: 'archy_test',
      type: 'INBOUNDCALL'
    })
    .then((flows) => {
      if (!flows.entities || flows.entities.length === 0) {
        throw new Error('Flow "archy_test" not found');
      }

      const flow = flows.entities[0];
      console.log(`📝 Found flow: ${flow.name} (ID: ${flow.id})\n`);

      // Get the full flow configuration
      return architectApi.getFlow(flow.id, { includeConfiguration: true })
        .then((_fullFlow) => {
          console.log('📤 Publishing flow...\n');

          // Publish the flow
          return architectApi.postFlowVersions(flow.id, {})
            .then((publishedVersion) => {
              console.log('========================================');
              console.log('✅ FLOW PUBLISHED SUCCESSFULLY!');
              console.log('========================================\n');

              console.log('Flow Details:');
              console.log(`  Name: archy_test`);
              console.log(`  ID: ${flow.id}`);
              console.log(`  Published Version: ${publishedVersion.version}`);
              console.log(`  Type: Inbound Call Flow\n`);

              console.log('Next Steps:');
              console.log('========================================');
              console.log('1. View in Architect:');
              console.log(`   https://apps.usw2.pure.cloud/architect/#/flows/inboundCall/${flow.id}\n`);
              console.log('2. Configure Call Routing:');
              console.log('   Admin > Telephony > Call Routing\n');
              console.log('3. Test the flow by calling your DID\n');

              console.log('✅ Flow is now ready to use!\n');
            })
            .catch((publishErr) => {
              console.error('❌ Error publishing flow:', publishErr.message || publishErr);

              // If publish fails, try with a different approach
              console.log('\n⚠️  Trying alternative publish method...\n');

              // Try saving and then publishing
              return architectApi.putFlow(flow.id, {
                name: 'archy_test',
                description: 'Test flow - Press 1 for Sales, Press 2 for Support',
                type: 'INBOUNDCALL'
              })
              .then(() => {
                return architectApi.postFlowVersions(flow.id, {});
              })
              .then((publishedVersion) => {
                console.log('✅ Flow published successfully with alternative method!\n');
                console.log('Published Version:', publishedVersion.version);
              });
            });
        });
    });
  })
  .catch((err) => {
    console.error('❌ Error:');
    console.error(err.message || err);
    if (err.body) {
      console.error('\nError details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  });
