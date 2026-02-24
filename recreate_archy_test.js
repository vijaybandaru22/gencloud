const platformClient = require('purecloud-platform-client-v2');

// Configure client
const client = platformClient.ApiClient.instance;
client.setEnvironment('usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

console.log('🚀 Recreating archy_test flow properly...\n');

// Login
client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('✅ Successfully authenticated\n');

    const architectApi = new platformClient.ArchitectApi();

    // First, delete the existing broken flow
    console.log('🗑️  Deleting existing broken flow...\n');

    return architectApi.getFlows({
      name: 'archy_test',
      type: 'INBOUNDCALL'
    })
    .then((flows) => {
      if (flows.entities && flows.entities.length > 0) {
        const flow = flows.entities[0];
        console.log(`Found existing flow: ${flow.name} (ID: ${flow.id})`);

        return architectApi.deleteFlow(flow.id)
          .then(() => {
            console.log('✅ Deleted old flow\n');
            // Wait a bit for deletion to complete
            return new Promise(resolve => setTimeout(resolve, 2000));
          })
          .catch((_err) => {
            console.log('⚠️  Could not delete (may not exist or be locked)\n');
            return Promise.resolve();
          });
      } else {
        console.log('No existing flow found\n');
        return Promise.resolve();
      }
    })
    .then(() => {
      // Now create a properly configured flow using the in-queue flow format that works
      console.log('📤 Creating new flow with proper configuration...\n');

      const flowYaml = `inboundCall:
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
      en-us: Welcome to Archy Test Flow. This is a simple test flow.

  states:
    state[Initial State_10]:
      name: Initial State
      refId: Initial State_10
      actions:
        - playAudio:
            name: Menu Prompt
            audio:
              tts:
                en-us: Press 1 for Sales. Press 2 for Support. Press 0 to disconnect.
        - collectInput:
            name: Collect Menu Choice
            timeout:
              lit:
                seconds: 10
            interDigitTimeout:
              lit:
                seconds: 5
            maxDigits:
              lit: 1
            inputData:
              noValue: true
            outputs:
              digit_1:
                outputActions:
                  - playAudio:
                      name: Sales Selected
                      audio:
                        tts:
                          en-us: You selected Sales. Thank you for testing Archy Test Flow. Goodbye.
                  - disconnect:
                      name: Disconnect
              digit_2:
                outputActions:
                  - playAudio:
                      name: Support Selected
                      audio:
                        tts:
                          en-us: You selected Support. Thank you for testing Archy Test Flow. Goodbye.
                  - disconnect:
                      name: Disconnect
              digit_0:
                outputActions:
                  - playAudio:
                      name: Goodbye
                      audio:
                        tts:
                          en-us: Goodbye.
                  - disconnect:
                      name: Disconnect
              timeout:
                outputActions:
                  - playAudio:
                      name: Timeout Message
                      audio:
                        tts:
                          en-us: No input received. Goodbye.
                  - disconnect:
                      name: Disconnect
              failure:
                outputActions:
                  - playAudio:
                      name: Error Message
                      audio:
                        tts:
                          en-us: An error occurred. Goodbye.
                  - disconnect:
                      name: Disconnect`;

      const createBody = {
        name: 'archy_test',
        description: 'Test flow created by API - Press 1 for Sales, Press 2 for Support',
        type: 'INBOUNDCALL',
        division: {
          name: 'Home'
        }
      };

      return architectApi.postFlows(createBody)
        .then((createdFlow) => {
          console.log(`✅ Flow created: ${createdFlow.name} (ID: ${createdFlow.id})\n`);

          // Now publish it with the YAML configuration
          console.log('📤 Publishing flow with configuration...\n');

          const publishBody = {
            yaml: flowYaml
          };

          return architectApi.postFlowsActionsPublish(createdFlow.id, publishBody)
            .then((_publishResult) => {
              console.log('========================================');
              console.log('✅ FLOW PUBLISHED SUCCESSFULLY!');
              console.log('========================================\n');

              console.log('Flow Details:');
              console.log(`  Name: archy_test`);
              console.log(`  ID: ${createdFlow.id}`);
              console.log(`  Type: Inbound Call Flow`);
              console.log(`  Status: Published ✅\n`);

              console.log('Flow Features:');
              console.log('  - Welcome message');
              console.log('  - Press 1: Sales');
              console.log('  - Press 2: Support');
              console.log('  - Press 0: Disconnect\n');

              console.log('========================================');
              console.log('Next Steps:');
              console.log('========================================');
              console.log('1. View in Architect:');
              console.log(`   https://apps.usw2.pure.cloud/architect/#/flows/inboundCall/${createdFlow.id}\n`);
              console.log('2. Configure Call Routing:');
              console.log('   Admin > Telephony > Call Routing');
              console.log('   Point your DID to archy_test\n');
              console.log('3. Test by calling your DID\n');

              console.log('✅ Setup Complete!\n');

              // Verify it was published
              return architectApi.getFlow(createdFlow.id, { includeConfiguration: false })
                .then((verifyFlow) => {
                  if (verifyFlow.publishedVersion) {
                    console.log('✅ Verified: Flow is published');
                    console.log(`   Version: ${verifyFlow.publishedVersion.version}\n`);
                  } else {
                    console.log('⚠️  Warning: Flow created but may not be fully published\n');
                  }
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
