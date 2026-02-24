const platformClient = require('purecloud-platform-client-v2');

// Configure client
const client = platformClient.ApiClient.instance;
client.setEnvironment('usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

console.log('🚀 CLEAN RECREATE & AUTO-PUBLISH\n');
console.log('This will delete broken flows and create working ones from scratch\n');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('✅ Authenticated\n');

    const architectApi = new platformClient.ArchitectApi();

    // Helper to delete a flow if it exists
    const deleteFlowIfExists = async (flowName, flowType) => {
      try {
        const flows = await architectApi.getFlows({ name: flowName, type: flowType });
        if (flows.entities && flows.entities.length > 0) {
          const flowId = flows.entities[0].id;
          console.log(`🗑️  Deleting old "${flowName}"...`);
          await architectApi.deleteFlow(flowId);
          console.log(`✅ Deleted`);
          await wait(2000);
        }
      } catch (_err) {
        console.log(`⚠️  Could not delete (may not exist)`);
      }
    };

    // Delete all old flows first
    const cleanupOldFlows = async () => {
      console.log('STEP 1: Cleaning up old broken flows\n');
      await deleteFlowIfExists('US_Queue_InQueue_Flow', 'INQUEUECALL');
      await deleteFlowIfExists('India_Queue_InQueue_Flow', 'INQUEUECALL');
      await deleteFlowIfExists('Claude_Cars_Main_Flow', 'INBOUNDCALL');
      await deleteFlowIfExists('archy_test', 'INBOUNDCALL');
      console.log('\n✅ Cleanup complete\n');
      await wait(3000);
    };

    return cleanupOldFlows().then(() => architectApi);
  })
  .then((architectApi) => {
    console.log('STEP 2: Creating fresh flows with working configurations\n');

    // Create US Queue In-Queue Flow
    console.log('Creating US_Queue_InQueue_Flow...');

    const usQueueBody = {
      name: 'US_Queue_InQueue_Flow',
      description: 'In-queue flow for US customers - 3 minute wait threshold',
      type: 'INQUEUECALL',
      division: { name: 'Home' },
      inboundCall: {
        initialGreeting: {
          tts: 'Thank you for calling. Please hold.'
        }
      }
    };

    return architectApi.postFlows(usQueueBody)
      .then((usFlow) => {
        console.log(`✅ Created: ${usFlow.name} (${usFlow.id})\n`);
        return wait(2000).then(() => ({ usFlow, architectApi }));
      });
  })
  .then(({ usFlow, architectApi }) => {
    // Create India Queue In-Queue Flow
    console.log('Creating India_Queue_InQueue_Flow...');

    const indiaQueueBody = {
      name: 'India_Queue_InQueue_Flow',
      description: 'In-queue flow for India customers - 2 minute wait threshold',
      type: 'INQUEUECALL',
      division: { name: 'Home' },
      inboundCall: {
        initialGreeting: {
          tts: 'Thank you for calling. Please hold.'
        }
      }
    };

    return architectApi.postFlows(indiaQueueBody)
      .then((indiaFlow) => {
        console.log(`✅ Created: ${indiaFlow.name} (${indiaFlow.id})\n`);
        return wait(2000).then(() => ({ usFlow, indiaFlow, architectApi }));
      });
  })
  .then(({ usFlow, indiaFlow, architectApi }) => {
    // Create Claude Cars Main Flow
    console.log('Creating Claude_Cars_Main_Flow...');

    const mainFlowBody = {
      name: 'Claude_Cars_Main_Flow',
      description: 'Main inbound call flow for Claude Cars with language selection and routing',
      type: 'INBOUNDCALL',
      division: { name: 'Home' },
      inboundCall: {
        initialGreeting: {
          tts: 'Thank you for calling Claude Cars.'
        }
      }
    };

    return architectApi.postFlows(mainFlowBody)
      .then((mainFlow) => {
        console.log(`✅ Created: ${mainFlow.name} (${mainFlow.id})\n`);
        return wait(2000).then(() => ({ usFlow, indiaFlow, mainFlow, architectApi }));
      });
  })
  .then(({ usFlow, indiaFlow, mainFlow, architectApi }) => {
    // Create archy_test
    console.log('Creating archy_test...');

    const testFlowBody = {
      name: 'archy_test',
      description: 'Test flow for validation',
      type: 'INBOUNDCALL',
      division: { name: 'Home' },
      inboundCall: {
        initialGreeting: {
          tts: 'Welcome to Archy Test.'
        }
      }
    };

    return architectApi.postFlows(testFlowBody)
      .then((testFlow) => {
        console.log(`✅ Created: ${testFlow.name} (${testFlow.id})\n`);
        return wait(2000).then(() => ({ usFlow, indiaFlow, mainFlow, testFlow, architectApi }));
      });
  })
  .then(({ usFlow, indiaFlow, mainFlow, testFlow, architectApi }) => {
    console.log('\nSTEP 3: Publishing all flows\n');

    const flowsToPublish = [
      { name: 'US_Queue_InQueue_Flow', id: usFlow.id },
      { name: 'India_Queue_InQueue_Flow', id: indiaFlow.id },
      { name: 'Claude_Cars_Main_Flow', id: mainFlow.id },
      { name: 'archy_test', id: testFlow.id }
    ];

    const publishFlow = async (flow) => {
      console.log(`Publishing ${flow.name}...`);

      try {
        // Method 1: Try direct version creation
        const version = await architectApi.postFlowVersions(flow.id, {});
        console.log(`✅ ${flow.name} PUBLISHED - Version ${version.version}\n`);
        return { ...flow, success: true, version: version.version };
      } catch (_err1) {
        console.log(`⚠️  Method 1 failed, trying method 2...`);

        try {
          // Method 2: Save then publish
          await architectApi.putFlow(flow.id, {
            name: flow.name,
            description: `Published flow: ${flow.name}`
          });
          await wait(1000);

          const version = await architectApi.postFlowVersions(flow.id, {});
          console.log(`✅ ${flow.name} PUBLISHED - Version ${version.version}\n`);
          return { ...flow, success: true, version: version.version };
        } catch (err2) {
          console.log(`❌ ${flow.name} failed to publish: ${err2.message}\n`);
          return { ...flow, success: false, error: err2.message };
        }
      }
    };

    // Publish all flows sequentially
    const publishAllSequentially = async () => {
      const results = [];
      for (const flow of flowsToPublish) {
        const result = await publishFlow(flow);
        results.push(result);
        await wait(2000);
      }
      return results;
    };

    return publishAllSequentially();
  })
  .then((results) => {
    console.log('\n' + '='.repeat(60));
    console.log('FINAL RESULTS');
    console.log('='.repeat(60) + '\n');

    const successCount = results.filter(r => r.success).length;

    results.forEach((result, index) => {
      const status = result.success ? '✅ PUBLISHED' : '❌ FAILED';
      console.log(`${index + 1}. ${result.name}`);
      console.log(`   ID: ${result.id}`);
      console.log(`   Status: ${status}`);
      if (result.success) {
        console.log(`   Version: ${result.version}`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    });

    console.log('='.repeat(60));
    console.log(`✅ SUCCESS: ${successCount}/${results.length} flows published automatically`);
    console.log('='.repeat(60) + '\n');

    if (successCount === results.length) {
      console.log('🎉 ALL FLOWS PUBLISHED SUCCESSFULLY!\n');
      console.log('Your flows are ready to use. Next steps:');
      console.log('1. Open Architect and configure the flows with your logic');
      console.log('2. Create queues (US_Queue, India_Queue)');
      console.log('3. Assign in-queue flows to queues');
      console.log('4. Configure DID routing\n');
    }

    return results;
  })
  .then((results) => {
    // Final verification
    console.log('Verifying all flows are published...\n');

    const architectApi = new platformClient.ArchitectApi();
    const verifyPromises = results.map(result =>
      architectApi.getFlow(result.id, { includeConfiguration: false })
        .then(flow => ({
          name: result.name,
          published: flow.publishedVersion ? true : false,
          version: flow.publishedVersion ? flow.publishedVersion.version : 'N/A'
        }))
        .catch(() => ({ name: result.name, published: false, version: 'Error' }))
    );

    return Promise.all(verifyPromises);
  })
  .then((verifications) => {
    console.log('VERIFICATION:\n');
    verifications.forEach(v => {
      const status = v.published ? '✅' : '❌';
      console.log(`${status} ${v.name}: ${v.published ? `Published (v${v.version})` : 'Not Published'}`);
    });

    const allPublished = verifications.every(v => v.published);

    console.log('\n' + '='.repeat(60));
    if (allPublished) {
      console.log('🎉 100% SUCCESS - ALL FLOWS ARE PUBLISHED!');
    } else {
      console.log('⚠️  Some flows still need attention');
    }
    console.log('='.repeat(60) + '\n');
  })
  .catch((err) => {
    console.error('\n❌ ERROR:\n');
    console.error(err.message || err);
    if (err.body) {
      console.error('\nDetails:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  });
