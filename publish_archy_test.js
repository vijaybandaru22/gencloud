const platformClient = require('purecloud-platform-client-v2');

// Configure client
const client = platformClient.ApiClient.instance;
client.setEnvironment('usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

console.log('🚀 Creating and publishing archy_test flow...\n');

// Login and create flow
client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('✅ Successfully authenticated to Genesys Cloud\n');

    const architectApi = new platformClient.ArchitectApi();

    // Create a simple test flow
    const flowBody = {
      name: 'archy_test',
      description: 'Simple test flow created with Archy - Press 1 for Sales, Press 2 for Support',
      type: 'INBOUNDCALL',
      division: {
        name: 'Home'
      }
    };

    console.log('📤 Creating archy_test flow...');

    return architectApi.postFlows(flowBody)
      .then((createdFlow) => {
        console.log(`✅ Flow created: ${createdFlow.name} (ID: ${createdFlow.id})\n`);

        // Create simple YAML configuration for the flow
        const flowYaml = `inboundCall:
  name: archy_test
  division: Home
  description: Simple test flow - Press 1 for Sales, Press 2 for Support

  startUpRef: "/inboundCall/menus/menu[Main Menu]"

  defaultLanguage: en-us
  supportedLanguages:
    en-us:
      none: true

  initialGreeting:
    tts: Welcome to Archy Test Flow.

  menus:
    - menu:
        name: Main Menu
        refId: Main Menu
        audio:
          tts: Press 1 for Sales. Press 2 for Support.
        choices:
          - menuDisconnect:
              name: Disconnect Choice
              dtmf: digit_0
          - menuTransferToFlow:
              name: Sales
              dtmf: digit_1
              flow:
                lit:
                  name: archy_test
              audio:
                tts: Transferring you to Sales. Thank you for calling.
          - menuTransferToFlow:
              name: Support
              dtmf: digit_2
              flow:
                lit:
                  name: archy_test
              audio:
                tts: Transferring you to Support. Thank you for calling.`;

        const publishBody = {
          yaml: flowYaml
        };

        console.log('📤 Publishing flow configuration...');

        return architectApi.postFlowsActionsPublish(createdFlow.id, publishBody)
          .then((publishedFlow) => {
            console.log(`✅ Flow published successfully!\n`);

            console.log('========================================');
            console.log('🎉 FLOW PUBLISHED SUCCESSFULLY!');
            console.log('========================================\n');

            console.log('Flow Details:');
            console.log(`  Name: ${publishedFlow.name || 'archy_test'}`);
            console.log(`  ID: ${publishedFlow.id}`);
            console.log(`  Type: Inbound Call Flow`);
            console.log(`  Description: Simple test flow\n`);

            console.log('========================================');
            console.log('How to Test:');
            console.log('========================================');
            console.log('1. Login to Genesys Cloud: https://apps.usw2.pure.cloud');
            console.log('2. Go to Admin > Architect > Inbound Call');
            console.log('3. Find flow: archy_test');
            console.log('4. Configure DID routing to this flow');
            console.log('5. Call the DID and test:\n');
            console.log('   - You will hear: "Welcome to Archy Test Flow"');
            console.log('   - Press 1 for Sales');
            console.log('   - Press 2 for Support\n');

            console.log('✅ Setup Complete!\n');
          });
      })
      .catch((_err) => {
        // Flow might already exist, try to update it
        console.log('⚠️  Flow might already exist. Searching for existing flow...\n');

        return architectApi.getFlows({
          name: 'archy_test',
          type: 'INBOUNDCALL'
        })
        .then((flows) => {
          if (flows.entities && flows.entities.length > 0) {
            const existingFlow = flows.entities[0];
            console.log(`📝 Found existing flow: ${existingFlow.name} (ID: ${existingFlow.id})`);
            console.log('📤 Updating and publishing...\n');

            const flowYaml = `inboundCall:
  name: archy_test
  division: Home
  description: Simple test flow - Press 1 for Sales, Press 2 for Support

  startUpRef: "/inboundCall/menus/menu[Main Menu]"

  defaultLanguage: en-us
  supportedLanguages:
    en-us:
      none: true

  initialGreeting:
    tts: Welcome to Archy Test Flow.

  menus:
    - menu:
        name: Main Menu
        refId: Main Menu
        audio:
          tts: Press 1 for Sales. Press 2 for Support.
        choices:
          - menuDisconnect:
              name: Disconnect Choice
              dtmf: digit_0
          - menuTransferToFlow:
              name: Sales
              dtmf: digit_1
              flow:
                lit:
                  name: archy_test
              audio:
                tts: Transferring you to Sales. Thank you for calling.
          - menuTransferToFlow:
              name: Support
              dtmf: digit_2
              flow:
                lit:
                  name: archy_test
              audio:
                tts: Transferring you to Support. Thank you for calling.`;

            const publishBody = {
              yaml: flowYaml
            };

            return architectApi.postFlowsActionsPublish(existingFlow.id, publishBody)
              .then((publishedFlow) => {
                console.log(`✅ Updated and published successfully!\n`);

                console.log('========================================');
                console.log('🎉 FLOW PUBLISHED SUCCESSFULLY!');
                console.log('========================================\n');

                console.log('Flow Details:');
                console.log(`  Name: ${publishedFlow.name || 'archy_test'}`);
                console.log(`  ID: ${publishedFlow.id}`);
                console.log(`  Type: Inbound Call Flow\n`);

                console.log('The flow has been updated with the latest configuration.\n');
              });
          } else {
            throw new Error('Could not create or find the flow');
          }
        });
      });
  })
  .catch((err) => {
    console.error('❌ Error:');
    console.error(err);
    if (err.body) {
      console.error('\nError details:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  });
