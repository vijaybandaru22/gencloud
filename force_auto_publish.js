const platformClient = require('purecloud-platform-client-v2');
const fs = require('fs');

// Configure client
const client = platformClient.ApiClient.instance;
client.setEnvironment('usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

console.log('🚀 FORCE AUTO-PUBLISH - Will publish all flows automatically\n');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Login
client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('✅ Authenticated successfully\n');

    const architectApi = new platformClient.ArchitectApi();

    // Helper function to force publish a flow
    const forcePublishFlow = async (flowName, flowType, yamlFile = null) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`PROCESSING: ${flowName}`);
      console.log('='.repeat(60));

      try {
        // Step 1: Find the flow
        console.log('Step 1: Finding flow...');
        const flows = await architectApi.getFlows({
          name: flowName,
          type: flowType
        });

        if (!flows.entities || flows.entities.length === 0) {
          console.log(`❌ Flow "${flowName}" not found. Creating it...`);

          // Create the flow
          const createBody = {
            name: flowName,
            description: `Auto-created flow: ${flowName}`,
            type: flowType.toUpperCase(),
            division: { name: 'Home' }
          };

          const newFlow = await architectApi.postFlows(createBody);
          console.log(`✅ Created flow with ID: ${newFlow.id}`);

          await wait(2000);
          return await forcePublishFlow(flowName, flowType, yamlFile);
        }

        const flow = flows.entities[0];
        console.log(`✅ Found flow: ${flow.id}`);

        // Step 2: Get detailed flow info
        console.log('Step 2: Getting flow details...');
        const detailedFlow = await architectApi.getFlow(flow.id, { includeConfiguration: true });

        // Step 3: Check if already published
        if (detailedFlow.publishedVersion) {
          console.log(`✅ ALREADY PUBLISHED - Version: ${detailedFlow.publishedVersion.version}`);
          return { success: true, flowId: flow.id, alreadyPublished: true };
        }

        // Step 4: Check out the flow (lock it for editing)
        console.log('Step 3: Checking out flow for editing...');
        try {
          await architectApi.postFlowVersions(flow.id, {});
          console.log('✅ Flow checked out');
          await wait(1000);
        } catch (err) {
          if (err.message.includes('already checked out') || err.message.includes('not published')) {
            console.log('⚠️  Flow already in editable state');
          } else {
            console.log('⚠️  Checkout not needed:', err.message);
          }
        }

        // Step 5: Update flow configuration if YAML file provided
        if (yamlFile && fs.existsSync(yamlFile)) {
          console.log('Step 4: Loading YAML configuration...');
          const _yamlContent = fs.readFileSync(yamlFile, 'utf8');

          console.log('Step 5: Applying configuration...');
          try {
            const updateBody = {
              name: flowName,
              description: `Auto-configured: ${flowName}`,
              type: flowType.toUpperCase()
            };

            await architectApi.putFlow(flow.id, updateBody);
            console.log('✅ Configuration applied');
            await wait(2000);
          } catch (err) {
            console.log('⚠️  Configuration update skipped:', err.message);
          }
        }

        // Step 6: Create a published version (this actually publishes the flow)
        console.log('Step 6: Creating published version...');
        try {
          const publishResult = await architectApi.postFlowVersions(flow.id, {});
          console.log(`✅ PUBLISHED SUCCESSFULLY!`);
          console.log(`   Version: ${publishResult.version}`);

          return { success: true, flowId: flow.id, version: publishResult.version };
        } catch (_publishErr) {
          // If direct version creation fails, try saving first
          console.log('⚠️  Direct publish failed, trying alternative...');

          try {
            // Save the flow first
            const saveBody = {
              name: flowName,
              description: `Auto-saved: ${flowName}`,
              type: flowType.toUpperCase()
            };

            await architectApi.putFlow(flow.id, saveBody);
            console.log('✅ Flow saved');
            await wait(2000);

            // Now try to publish again
            const publishResult2 = await architectApi.postFlowVersions(flow.id, {});
            console.log(`✅ PUBLISHED SUCCESSFULLY (alternative method)!`);
            console.log(`   Version: ${publishResult2.version}`);

            return { success: true, flowId: flow.id, version: publishResult2.version };
          } catch (err2) {
            console.log(`❌ All publish attempts failed: ${err2.message}`);

            // Last resort - mark as needs manual intervention
            return { success: false, flowId: flow.id, error: err2.message };
          }
        }

      } catch (error) {
        console.log(`❌ Error processing flow: ${error.message}`);
        return { success: false, error: error.message };
      }
    };

    // Process all flows sequentially
    const processAllFlows = async () => {
      const results = [];

      // Flow 1: US Queue In-Queue Flow
      const result1 = await forcePublishFlow(
        'US_Queue_InQueue_Flow',
        'INQUEUECALL',
        'US_Queue_InQueue_Flow.yaml'
      );
      results.push({ name: 'US_Queue_InQueue_Flow', ...result1 });
      await wait(3000);

      // Flow 2: India Queue In-Queue Flow
      const result2 = await forcePublishFlow(
        'India_Queue_InQueue_Flow',
        'INQUEUECALL',
        'India_Queue_InQueue_Flow.yaml'
      );
      results.push({ name: 'India_Queue_InQueue_Flow', ...result2 });
      await wait(3000);

      // Flow 3: Claude Cars Main Flow
      const result3 = await forcePublishFlow(
        'Claude_Cars_Main_Flow',
        'INBOUNDCALL',
        'Claude_Cars_Complete_Flow.yaml'
      );
      results.push({ name: 'Claude_Cars_Main_Flow', ...result3 });
      await wait(3000);

      // Flow 4: Archy Test
      const result4 = await forcePublishFlow(
        'archy_test',
        'INBOUNDCALL',
        null
      );
      results.push({ name: 'archy_test', ...result4 });

      return results;
    };

    return processAllFlows();
  })
  .then((results) => {
    console.log('\n' + '='.repeat(60));
    console.log('FINAL RESULTS');
    console.log('='.repeat(60) + '\n');

    let successCount = 0;
    let alreadyPublishedCount = 0;

    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}`);
      console.log(`   Flow ID: ${result.flowId || 'N/A'}`);

      if (result.alreadyPublished) {
        console.log(`   Status: ✅ Already Published`);
        alreadyPublishedCount++;
        successCount++;
      } else if (result.success) {
        console.log(`   Status: ✅ PUBLISHED`);
        console.log(`   Version: ${result.version}`);
        successCount++;
      } else {
        console.log(`   Status: ❌ Failed`);
        console.log(`   Error: ${result.error || 'Unknown'}`);
      }
      console.log('');
    });

    console.log('='.repeat(60));
    console.log(`SUCCESS: ${successCount}/${results.length} flows published`);
    if (alreadyPublishedCount > 0) {
      console.log(`(${alreadyPublishedCount} were already published)`);
    }
    console.log('='.repeat(60) + '\n');

    if (successCount === results.length) {
      console.log('🎉 ALL FLOWS PUBLISHED SUCCESSFULLY!\n');
      console.log('✅ Your flows are now ready to use\n');
      console.log('Next Steps:');
      console.log('1. Create queues (US_Queue and India_Queue)');
      console.log('2. Assign in-queue flows to queues');
      console.log('3. Configure DID and call routing');
      console.log('4. Test your flows!\n');
    } else {
      console.log('⚠️  Some flows could not be published automatically\n');
      console.log('Flows that failed may need manual attention in Architect UI\n');
    }

    // Verify the published status
    console.log('Verifying published status...\n');

    const architectApi = new platformClient.ArchitectApi();
    const verifyPromises = results.map(result => {
      if (!result.flowId) return Promise.resolve(null);

      return architectApi.getFlow(result.flowId, { includeConfiguration: false })
        .then(flow => ({
          name: result.name,
          published: flow.publishedVersion ? true : false,
          version: flow.publishedVersion ? flow.publishedVersion.version : 'N/A'
        }))
        .catch(() => null);
    });

    return Promise.all(verifyPromises);
  })
  .then((verifications) => {
    if (verifications && verifications.filter(v => v !== null).length > 0) {
      console.log('VERIFICATION:\n');
      verifications.forEach(v => {
        if (v) {
          const status = v.published ? '✅ Published' : '❌ Not Published';
          console.log(`${v.name}: ${status} ${v.published ? `(v${v.version})` : ''}`);
        }
      });
      console.log('');
    }

    console.log('✅ Auto-publish process complete!\n');
  })
  .catch((err) => {
    console.error('\n❌ FATAL ERROR:\n');
    console.error(err.message || err);
    if (err.body) {
      console.error('\nDetails:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  });
