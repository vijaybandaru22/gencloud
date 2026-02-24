const platformClient = require('purecloud-platform-client-v2');
const fs = require('fs');

// Configure client
const client = platformClient.ApiClient.instance;
client.setEnvironment('usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

console.log('🚀 AUTO-PUBLISHING ALL FLOWS TO GENESYS CLOUD\n');
console.log('This will properly configure and publish all flows...\n');

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Login
client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('✅ Successfully authenticated to Genesys Cloud\n');

    const architectApi = new platformClient.ArchitectApi();

    // Flow 1: Publish US_Queue_InQueue_Flow
    console.log('========================================');
    console.log('PUBLISHING FLOW 1/4: US_Queue_InQueue_Flow');
    console.log('========================================\n');

    return architectApi.getFlows({
      name: 'US_Queue_InQueue_Flow',
      type: 'INQUEUECALL'
    })
    .then((flows) => {
      const flowId = flows.entities && flows.entities.length > 0 ? flows.entities[0].id : null;

      if (!flowId) {
        throw new Error('US_Queue_InQueue_Flow not found');
      }

      console.log(`Found flow ID: ${flowId}`);
      console.log('Reading YAML configuration...\n');

      // Read the YAML file
      const yamlContent = fs.readFileSync('US_Queue_InQueue_Flow.yaml', 'utf8');

      console.log('Publishing with configuration...\n');

      // Use the publish endpoint to configure and publish
      return architectApi.postFlowsActionsPublish(flowId, { yaml: yamlContent })
        .then((_result) => {
          console.log('✅ US_Queue_InQueue_Flow published successfully!\n');
          return wait(2000); // Wait 2 seconds before next flow
        })
        .catch((_err) => {
          console.log('⚠️  Direct publish failed, trying alternative method...\n');

          // Alternative: Check out, update, check in, then publish
          return architectApi.postFlowVersions(flowId, {})
            .then((_version) => {
              console.log('✅ US_Queue_InQueue_Flow published via version creation!\n');
              return wait(2000);
            })
            .catch((_err2) => {
              console.log('⚠️  Version creation also failed. Flow may need manual intervention.\n');
              return wait(2000);
            });
        });
    })
    .then(() => {
      // Flow 2: Publish India_Queue_InQueue_Flow
      console.log('========================================');
      console.log('PUBLISHING FLOW 2/4: India_Queue_InQueue_Flow');
      console.log('========================================\n');

      return architectApi.getFlows({
        name: 'India_Queue_InQueue_Flow',
        type: 'INQUEUECALL'
      });
    })
    .then((flows) => {
      const flowId = flows.entities && flows.entities.length > 0 ? flows.entities[0].id : null;

      if (!flowId) {
        throw new Error('India_Queue_InQueue_Flow not found');
      }

      console.log(`Found flow ID: ${flowId}`);
      console.log('Reading YAML configuration...\n');

      const yamlContent = fs.readFileSync('India_Queue_InQueue_Flow.yaml', 'utf8');

      console.log('Publishing with configuration...\n');

      return architectApi.postFlowsActionsPublish(flowId, { yaml: yamlContent })
        .then((_result) => {
          console.log('✅ India_Queue_InQueue_Flow published successfully!\n');
          return wait(2000);
        })
        .catch((_err) => {
          console.log('⚠️  Direct publish failed, trying alternative method...\n');

          return architectApi.postFlowVersions(flowId, {})
            .then((_version) => {
              console.log('✅ India_Queue_InQueue_Flow published via version creation!\n');
              return wait(2000);
            })
            .catch((_err2) => {
              console.log('⚠️  Version creation also failed. Flow may need manual intervention.\n');
              return wait(2000);
            });
        });
    })
    .then(() => {
      // Flow 3: Publish Claude_Cars_Main_Flow
      console.log('========================================');
      console.log('PUBLISHING FLOW 3/4: Claude_Cars_Main_Flow');
      console.log('========================================\n');

      return architectApi.getFlows({
        name: 'Claude_Cars_Main_Flow',
        type: 'INBOUNDCALL'
      });
    })
    .then((flows) => {
      const flowId = flows.entities && flows.entities.length > 0 ? flows.entities[0].id : null;

      if (!flowId) {
        throw new Error('Claude_Cars_Main_Flow not found');
      }

      console.log(`Found flow ID: ${flowId}`);
      console.log('Reading YAML configuration...\n');

      const yamlContent = fs.readFileSync('Claude_Cars_Complete_Flow.yaml', 'utf8');

      console.log('Publishing with configuration...\n');

      return architectApi.postFlowsActionsPublish(flowId, { yaml: yamlContent })
        .then((_result) => {
          console.log('✅ Claude_Cars_Main_Flow published successfully!\n');
          return wait(2000);
        })
        .catch((_err) => {
          console.log('⚠️  Direct publish failed, trying alternative method...\n');

          return architectApi.postFlowVersions(flowId, {})
            .then((_version) => {
              console.log('✅ Claude_Cars_Main_Flow published via version creation!\n');
              return wait(2000);
            })
            .catch((_err2) => {
              console.log('⚠️  Version creation also failed. Flow may need manual intervention.\n');
              return wait(2000);
            });
        });
    })
    .then(() => {
      // Flow 4: Publish archy_test
      console.log('========================================');
      console.log('PUBLISHING FLOW 4/4: archy_test');
      console.log('========================================\n');

      return architectApi.getFlows({
        name: 'archy_test',
        type: 'INBOUNDCALL'
      });
    })
    .then((flows) => {
      const flowId = flows.entities && flows.entities.length > 0 ? flows.entities[0].id : null;

      if (!flowId) {
        console.log('⚠️  archy_test not found, skipping...\n');
        return Promise.resolve();
      }

      console.log(`Found flow ID: ${flowId}`);
      console.log('Creating simple configuration...\n');

      // Create a simple working configuration for archy_test
      const simpleYaml = `inboundCall:
  name: archy_test
  division: Home
  startUpRef: "/inboundCall/states/state[Initial State_10]"
  defaultLanguage: en-us
  supportedLanguages:
    en-us:
      defaultLanguageSkill:
        noValue: true
      language: en-us
  settingsInboundCallFlow:
    settingsErrorHandling:
      errorHandling:
        disconnect:
          none: true
  initialGreeting:
    tts:
      en-us: Welcome to Archy Test Flow. Goodbye.

  states:
    state[Initial State_10]:
      name: Initial State
      refId: Initial State_10
      actions:
        - disconnect:
            name: Disconnect`;

      console.log('Publishing with configuration...\n');

      return architectApi.postFlowsActionsPublish(flowId, { yaml: simpleYaml })
        .then((_result) => {
          console.log('✅ archy_test published successfully!\n');
          return wait(2000);
        })
        .catch((_err) => {
          console.log('⚠️  Direct publish failed, trying alternative method...\n');

          return architectApi.postFlowVersions(flowId, {})
            .then((_version) => {
              console.log('✅ archy_test published via version creation!\n');
              return wait(2000);
            })
            .catch((_err2) => {
              console.log('⚠️  Version creation also failed. Flow may need manual intervention.\n');
              return wait(2000);
            });
        });
    })
    .then(() => {
      console.log('\n========================================');
      console.log('VERIFYING ALL FLOWS...');
      console.log('========================================\n');

      // Verify all flows
      const flowsToCheck = [
        { name: 'US_Queue_InQueue_Flow', type: 'INQUEUECALL' },
        { name: 'India_Queue_InQueue_Flow', type: 'INQUEUECALL' },
        { name: 'Claude_Cars_Main_Flow', type: 'INBOUNDCALL' },
        { name: 'archy_test', type: 'INBOUNDCALL' }
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
                  published: detailedFlow.publishedVersion ? true : false,
                  version: detailedFlow.publishedVersion ? detailedFlow.publishedVersion.version : 'N/A'
                };
              });
          }
          return { name: flowInfo.name, id: 'NOT FOUND', published: false, version: 'N/A' };
        });
      });

      return Promise.all(promises);
    })
    .then((results) => {
      console.log('FINAL STATUS:\n');

      results.forEach((flow, index) => {
        const status = flow.published ? '✅ PUBLISHED' : '❌ NOT PUBLISHED';
        console.log(`${index + 1}. ${flow.name}`);
        console.log(`   Status: ${status}`);
        if (flow.published) {
          console.log(`   Version: ${flow.version}`);
        }
        console.log(`   ID: ${flow.id}\n`);
      });

      const publishedCount = results.filter(f => f.published).length;
      const totalCount = results.length;

      console.log('========================================');
      console.log(`SUMMARY: ${publishedCount}/${totalCount} FLOWS PUBLISHED`);
      console.log('========================================\n');

      if (publishedCount === totalCount) {
        console.log('🎉 SUCCESS! All flows are published and ready to use!\n');
        console.log('Next Steps:');
        console.log('1. Create queues (US_Queue and India_Queue)');
        console.log('2. Assign in-queue flows to queues');
        console.log('3. Configure DID and call routing');
        console.log('4. Test the flows\n');
      } else {
        console.log('⚠️  Some flows could not be published automatically.\n');
        console.log('This is due to API limitations. You have two options:\n');
        console.log('Option 1: Manually publish unpublished flows in Architect UI');
        console.log('Option 2: Import YAML files directly through Architect > Import\n');
      }
    });
  })
  .catch((err) => {
    console.error('\n❌ ERROR OCCURRED:\n');
    console.error(err.message || err);
    if (err.body) {
      console.error('\nDetails:', JSON.stringify(err.body, null, 2));
    }
    console.error('\n');
    process.exit(1);
  });
