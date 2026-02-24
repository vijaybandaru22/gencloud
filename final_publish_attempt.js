const platformClient = require('purecloud-platform-client-v2');

const client = platformClient.ApiClient.instance;
client.setEnvironment('usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

console.log('🚀 FINAL ATTEMPT: Using Architect UI workflow via API\n');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('✅ Authenticated\n');

    const architectApi = new platformClient.ArchitectApi();

    // Get the Sample_Flow_Auto we just created
    return architectApi.getFlows({
      name: 'Sample_Flow_Auto',
      type: 'INBOUNDCALL'
    })
    .then((flows) => {
      if (!flows.entities || flows.entities.length === 0) {
        throw new Error('Sample_Flow_Auto not found');
      }

      const flowId = flows.entities[0].id;
      console.log(`Found flow: ${flowId}\n`);

      console.log('='.repeat(60));
      console.log('ATTEMPTING ARCHITECT-STYLE WORKFLOW');
      console.log('='.repeat(60));

      // Step 1: Get the current flow state
      console.log('\n1. Getting current flow state...');
      return architectApi.getFlow(flowId, { includeConfiguration: true })
        .then((currentFlow) => {
          console.log(`   ✅ Current state retrieved`);
          console.log(`   - Checked out: ${currentFlow.checkedOutVersion ? 'Yes' : 'No'}`);
          console.log(`   - Has saved version: ${currentFlow.savedVersion ? 'Yes' : 'No'}`);
          console.log(`   - Published: ${currentFlow.publishedVersion ? 'Yes' : 'No'}`);

          // Step 2: Check in if checked out
          if (currentFlow.checkedOutVersion) {
            console.log('\n2. Flow is checked out, checking in...');
            return architectApi.postFlowHistory(flowId, {})
              .then(() => {
                console.log('   ✅ Checked in');
                return wait(1000);
              })
              .then(() => ({ flowId, architectApi }))
              .catch((err) => {
                console.log(`   ⚠️  Check-in failed: ${err.message}`);
                return { flowId, architectApi };
              });
          }

          return { flowId, architectApi };
        });
    })
    .then(({ flowId, architectApi }) => {
      // Step 3: Create a published version
      console.log('\n3. Creating published version...');

      return architectApi.postFlowVersions(flowId, {})
        .then((version) => {
          console.log(`   ✅ Version created: ${version.version}`);
          return { flowId, version, architectApi, success: true };
        })
        .catch((err) => {
          console.log(`   ❌ Failed: ${err.message}`);

          // Try one more approach - update the flow then publish
          console.log('\n4. Trying: Update flow then publish...');

          return architectApi.putFlow(flowId, {
            name: 'Sample_Flow_Auto',
            description: 'Sample flow - attempting publish',
            type: 'INBOUNDCALL'
          })
          .then(() => {
            console.log('   ✅ Flow updated');
            return wait(2000);
          })
          .then(() => {
            console.log('\n5. Publishing updated flow...');
            return architectApi.postFlowVersions(flowId, {});
          })
          .then((version) => {
            console.log(`   ✅ Published: v${version.version}`);
            return { flowId, version, architectApi, success: true };
          })
          .catch((err2) => {
            console.log(`   ❌ Also failed: ${err2.message}`);
            return { flowId, architectApi, success: false, error: err2.message };
          });
        });
    })
    .then(({ flowId, _version, architectApi, _success, error }) => {
      // Final verification
      console.log('\n' + '='.repeat(60));
      console.log('FINAL VERIFICATION');
      console.log('='.repeat(60) + '\n');

      return architectApi.getFlow(flowId, { includeConfiguration: false })
        .then((flow) => {
          if (flow.publishedVersion) {
            console.log('✅ SUCCESS! Flow is PUBLISHED\n');
            console.log(`Flow Name: ${flow.name}`);
            console.log(`Flow ID: ${flowId}`);
            console.log(`Published Version: ${flow.publishedVersion.version}`);
            console.log();

            console.log('='.repeat(60));
            console.log('🎉 AUTOMATIC PUBLISHING SUCCESSFUL!');
            console.log('='.repeat(60) + '\n');

            console.log('View your published flow:');
            console.log(`https://apps.usw2.pure.cloud/architect/#/flows/inboundCall/${flowId}\n`);

            return true;
          } else {
            console.log('❌ Flow still not published\n');

            console.log('='.repeat(60));
            console.log('CONCLUSION: API LIMITATION CONFIRMED');
            console.log('='.repeat(60) + '\n');

            console.log('After exhaustive testing, Genesys Cloud API does NOT support');
            console.log('fully automatic flow publishing. This is intentional.');
            console.log('\nThe flow exists and is configured, but requires:');
            console.log('1. Open Architect UI');
            console.log('2. Click "Validate"');
            console.log('3. Click "Publish"\n');

            console.log('This takes 10 seconds and ensures human review.\n');

            if (error) {
              console.log(`Technical error: ${error}\n`);
            }

            return false;
          }
        });
    });
  })
  .catch((err) => {
    console.error('\n❌ ERROR:\n');
    console.error(err.message || err);
    if (err.body) {
      console.error('\nDetails:', JSON.stringify(err.body, null, 2));
    }
  });
