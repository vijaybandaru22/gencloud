const platformClient = require('purecloud-platform-client-v2');

// Configure client
const client = platformClient.ApiClient.instance;
client.setEnvironment('usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

console.log('🔍 Checking all flows in Genesys Cloud...\n');

// Login and check flows
client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('✅ Successfully authenticated\n');

    const architectApi = new platformClient.ArchitectApi();

    // Check all flows we've been working with
    const flowsToCheck = [
      { name: 'archy_test', type: 'INBOUNDCALL' },
      { name: 'Claude_Cars_Main_Flow', type: 'INBOUNDCALL' },
      { name: 'US_Queue_InQueue_Flow', type: 'INQUEUECALL' },
      { name: 'India_Queue_InQueue_Flow', type: 'INQUEUECALL' }
    ];

    const promises = flowsToCheck.map(flowInfo => {
      return architectApi.getFlows({
        name: flowInfo.name,
        type: flowInfo.type
      })
      .then((flows) => {
        if (flows.entities && flows.entities.length > 0) {
          const flow = flows.entities[0];

          return architectApi.getFlow(flow.id, { includeConfiguration: false })
            .then((detailedFlow) => {
              return {
                name: flow.name,
                id: flow.id,
                type: flowInfo.type,
                published: detailedFlow.publishedVersion ? true : false,
                publishedVersion: detailedFlow.publishedVersion ? detailedFlow.publishedVersion.version : 'N/A',
                checkedOut: detailedFlow.checkedOutVersion ? true : false
              };
            });
        } else {
          return {
            name: flowInfo.name,
            id: 'NOT FOUND',
            type: flowInfo.type,
            published: false,
            publishedVersion: 'N/A',
            checkedOut: false
          };
        }
      })
      .catch((err) => {
        return {
          name: flowInfo.name,
          id: 'ERROR',
          type: flowInfo.type,
          published: false,
          publishedVersion: 'N/A',
          checkedOut: false,
          error: err.message
        };
      });
    });

    return Promise.all(promises);
  })
  .then((results) => {
    console.log('========================================');
    console.log('FLOW STATUS SUMMARY');
    console.log('========================================\n');

    results.forEach((flow, index) => {
      console.log(`${index + 1}. ${flow.name}`);
      console.log(`   Type: ${flow.type}`);
      console.log(`   ID: ${flow.id}`);
      console.log(`   Published: ${flow.published ? '✅ YES' : '❌ NO'}`);
      if (flow.published) {
        console.log(`   Version: ${flow.publishedVersion}`);
      }
      if (flow.checkedOut) {
        console.log(`   ⚠️  Currently checked out`);
      }
      if (flow.error) {
        console.log(`   ❌ Error: ${flow.error}`);
      }
      console.log('');
    });

    console.log('========================================');
    const publishedCount = results.filter(f => f.published).length;
    const totalCount = results.length;

    console.log(`\nSummary: ${publishedCount}/${totalCount} flows are published\n`);

    if (publishedCount < totalCount) {
      console.log('⚠️  Some flows need to be published in Architect UI\n');
    }
  })
  .catch((err) => {
    console.error('❌ Error:');
    console.error(err.message || err);
    process.exit(1);
  });
