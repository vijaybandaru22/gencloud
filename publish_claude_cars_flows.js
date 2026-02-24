const platformClient = require('purecloud-platform-client-v2');
const fs = require('fs');
const yaml = require('js-yaml');

// Configure client
const client = platformClient.ApiClient.instance;
client.setEnvironment('usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

console.log('🚀 Starting Claude Cars Flow Publication...\n');

// Login and publish flows
client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('✅ Successfully authenticated to Genesys Cloud\n');

    const architectApi = new platformClient.ArchitectApi();

    // Step 1: Publish Main Inbound Flow
    console.log('📤 Publishing Claude_Cars_Complete_Flow...');

    // Read and parse the main flow YAML
    const mainFlowYaml = fs.readFileSync('Claude_Cars_Complete_Flow.yaml', 'utf8');
    const mainFlowData = yaml.load(mainFlowYaml);

    // Create the flow
    const mainFlowBody = {
      name: mainFlowData.inboundCall.name,
      description: 'Claude Cars main inbound call flow with language selection, menu, and geographic routing',
      type: 'INBOUNDCALL',
      division: {
        name: mainFlowData.inboundCall.division || 'Home'
      }
    };

    return architectApi.postFlows(mainFlowBody)
      .then((createdFlow) => {
        console.log(`✅ Created main flow: ${createdFlow.name} (ID: ${createdFlow.id})\n`);

        // Now publish it with YAML configuration
        const publishBody = {
          yaml: mainFlowYaml
        };

        return architectApi.postFlowsActionsPublish(createdFlow.id, publishBody)
          .then((publishedFlow) => {
            console.log(`✅ Published main flow successfully!\n`);
            return { mainFlow: publishedFlow };
          });
      })
      .catch((_err) => {
        // Flow might already exist, try to update it
        console.log('⚠️  Flow might already exist. Searching for existing flow...');

        return architectApi.getFlows({
          name: mainFlowData.inboundCall.name,
          type: 'INBOUNDCALL'
        })
        .then((flows) => {
          if (flows.entities && flows.entities.length > 0) {
            const existingFlow = flows.entities[0];
            console.log(`📝 Found existing flow: ${existingFlow.name} (ID: ${existingFlow.id})`);
            console.log('📤 Updating and publishing...\n');

            const publishBody = {
              yaml: mainFlowYaml
            };

            return architectApi.postFlowsActionsPublish(existingFlow.id, publishBody)
              .then((publishedFlow) => {
                console.log(`✅ Updated and published main flow successfully!\n`);
                return { mainFlow: publishedFlow };
              });
          } else {
            throw new Error('Could not create or find the flow');
          }
        });
      });
  })
  .then((result) => {
    console.log('📤 Publishing US_Queue_InQueue_Flow...');

    const architectApi = new platformClient.ArchitectApi();
    const usQueueFlowYaml = fs.readFileSync('US_Queue_InQueue_Flow.yaml', 'utf8');
    const usQueueFlowData = yaml.load(usQueueFlowYaml);

    const usFlowBody = {
      name: usQueueFlowData.inQueueCall.name,
      description: 'In-queue flow for US customers - 3 minute wait threshold',
      type: 'INQUEUECALL',
      division: {
        name: usQueueFlowData.inQueueCall.division || 'Home'
      }
    };

    return architectApi.postFlows(usFlowBody)
      .then((createdFlow) => {
        console.log(`✅ Created US in-queue flow: ${createdFlow.name} (ID: ${createdFlow.id})\n`);

        const publishBody = {
          yaml: usQueueFlowYaml
        };

        return architectApi.postFlowsActionsPublish(createdFlow.id, publishBody)
          .then((publishedFlow) => {
            console.log(`✅ Published US in-queue flow successfully!\n`);
            result.usFlow = publishedFlow;
            return result;
          });
      })
      .catch((_err) => {
        console.log('⚠️  US flow might already exist. Searching...');

        return architectApi.getFlows({
          name: usQueueFlowData.inQueueCall.name,
          type: 'INQUEUECALL'
        })
        .then((flows) => {
          if (flows.entities && flows.entities.length > 0) {
            const existingFlow = flows.entities[0];
            console.log(`📝 Found existing US flow: ${existingFlow.name} (ID: ${existingFlow.id})`);
            console.log('📤 Updating and publishing...\n');

            const publishBody = {
              yaml: usQueueFlowYaml
            };

            return architectApi.postFlowsActionsPublish(existingFlow.id, publishBody)
              .then((publishedFlow) => {
                console.log(`✅ Updated and published US in-queue flow successfully!\n`);
                result.usFlow = publishedFlow;
                return result;
              });
          } else {
            throw new Error('Could not create or find US flow');
          }
        });
      });
  })
  .then((result) => {
    console.log('📤 Publishing India_Queue_InQueue_Flow...');

    const architectApi = new platformClient.ArchitectApi();
    const indiaQueueFlowYaml = fs.readFileSync('India_Queue_InQueue_Flow.yaml', 'utf8');
    const indiaQueueFlowData = yaml.load(indiaQueueFlowYaml);

    const indiaFlowBody = {
      name: indiaQueueFlowData.inQueueCall.name,
      description: 'In-queue flow for India customers - 2 minute wait threshold',
      type: 'INQUEUECALL',
      division: {
        name: indiaQueueFlowData.inQueueCall.division || 'Home'
      }
    };

    return architectApi.postFlows(indiaFlowBody)
      .then((createdFlow) => {
        console.log(`✅ Created India in-queue flow: ${createdFlow.name} (ID: ${createdFlow.id})\n`);

        const publishBody = {
          yaml: indiaQueueFlowYaml
        };

        return architectApi.postFlowsActionsPublish(createdFlow.id, publishBody)
          .then((publishedFlow) => {
            console.log(`✅ Published India in-queue flow successfully!\n`);
            result.indiaFlow = publishedFlow;
            return result;
          });
      })
      .catch((_err) => {
        console.log('⚠️  India flow might already exist. Searching...');

        return architectApi.getFlows({
          name: indiaQueueFlowData.inQueueCall.name,
          type: 'INQUEUECALL'
        })
        .then((flows) => {
          if (flows.entities && flows.entities.length > 0) {
            const existingFlow = flows.entities[0];
            console.log(`📝 Found existing India flow: ${existingFlow.name} (ID: ${existingFlow.id})`);
            console.log('📤 Updating and publishing...\n');

            const publishBody = {
              yaml: indiaQueueFlowYaml
            };

            return architectApi.postFlowsActionsPublish(existingFlow.id, publishBody)
              .then((publishedFlow) => {
                console.log(`✅ Updated and published India in-queue flow successfully!\n`);
                result.indiaFlow = publishedFlow;
                return result;
              });
          } else {
            throw new Error('Could not create or find India flow');
          }
        });
      });
  })
  .then((result) => {
    console.log('========================================');
    console.log('🎉 ALL FLOWS PUBLISHED SUCCESSFULLY!');
    console.log('========================================\n');

    console.log('Flow Summary:');
    if (result.mainFlow) {
      console.log(`✅ Main Flow: ${result.mainFlow.name}`);
      console.log(`   ID: ${result.mainFlow.id}`);
      console.log(`   Version: ${result.mainFlow.version || 'N/A'}\n`);
    }
    if (result.usFlow) {
      console.log(`✅ US In-Queue Flow: ${result.usFlow.name}`);
      console.log(`   ID: ${result.usFlow.id}`);
      console.log(`   Version: ${result.usFlow.version || 'N/A'}\n`);
    }
    if (result.indiaFlow) {
      console.log(`✅ India In-Queue Flow: ${result.indiaFlow.name}`);
      console.log(`   ID: ${result.indiaFlow.id}`);
      console.log(`   Version: ${result.indiaFlow.version || 'N/A'}\n`);
    }

    console.log('========================================');
    console.log('Next Steps:');
    console.log('========================================');
    console.log('1. Create US_Queue and India_Queue in Admin > Contact Center > Queues');
    console.log('2. Assign in-queue flows to the queues:');
    console.log('   - US_Queue → US_Queue_InQueue_Flow');
    console.log('   - India_Queue → India_Queue_InQueue_Flow');
    console.log('3. Configure DID and call routing in Admin > Telephony > Call Routing');
    console.log('4. Test the complete flow\n');

    console.log('✅ Setup Complete! Your Claude Cars flows are ready to use.\n');
  })
  .catch((err) => {
    console.error('❌ Error during flow publication:');
    console.error(err);
    if (err.body) {
      console.error('Error details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  });
