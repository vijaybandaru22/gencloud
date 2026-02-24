const platformClient = require('purecloud-platform-client-v2');

// Configure client
const client = platformClient.ApiClient.instance;
client.setEnvironment('usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

console.log('🚀 Creating and Publishing Simple Sample Flow\n');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('✅ Authenticated\n');

    const architectApi = new platformClient.ArchitectApi();

    // Delete if exists
    console.log('Checking for existing flow...');
    return architectApi.getFlows({
      name: 'Sample_Flow_Auto',
      type: 'INBOUNDCALL'
    })
    .then((flows) => {
      if (flows.entities && flows.entities.length > 0) {
        console.log('Deleting old version...');
        return architectApi.deleteFlow(flows.entities[0].id)
          .then(() => {
            console.log('✅ Deleted old flow\n');
            return wait(2000);
          })
          .catch(() => {
            console.log('⚠️  Could not delete\n');
            return wait(1000);
          });
      }
      return Promise.resolve();
    })
    .then(() => architectApi);
  })
  .then((architectApi) => {
    console.log('Creating new simple flow...\n');

    // Create with minimal YAML that will validate
    const simpleFlowYaml = `inboundCall:
  name: Sample_Flow_Auto
  division: Home
  description: "Simple auto-published sample flow"

  startUpRef: "/inboundCall/menus/menu[Main Menu]"

  defaultLanguage: en-us
  supportedLanguages:
    en-us:
      none: true

  initialGreeting:
    tts: "Thank you for calling. This is a sample flow."

  menus:
    - menu:
        name: Main Menu
        refId: Main Menu
        audio:
          tts: "Press 1 to hear a message. Press 0 to disconnect."
        choices:
          - menuDisconnect:
              name: Disconnect
              dtmf: digit_0
          - menuPlayAudio:
              name: Play Message
              dtmf: digit_1
              audio:
                tts: "You pressed 1. This is a sample message. Goodbye."`;

    console.log('Step 1: Creating flow with configuration...');

    // First create empty flow
    const createBody = {
      name: 'Sample_Flow_Auto',
      description: 'Simple sample flow - auto-published',
      type: 'INBOUNDCALL',
      division: { name: 'Home' }
    };

    return architectApi.postFlows(createBody)
      .then((flow) => {
        console.log(`✅ Flow created with ID: ${flow.id}\n`);

        console.log('Step 2: Configuring and publishing flow...');

        // Now configure and publish it in one step
        return architectApi.postFlowsActionsPublish(flow.id, { yaml: simpleFlowYaml })
          .then((result) => {
            console.log('✅ Configuration uploaded\n');
            return { flow, result, architectApi };
          })
          .catch((err) => {
            console.log(`⚠️  Publish attempt 1 failed: ${err.message}`);
            console.log('Trying alternative method...\n');

            // Try updating the flow first
            return architectApi.putFlow(flow.id, {
              name: 'Sample_Flow_Auto',
              description: 'Simple sample flow - auto-published',
              type: 'INBOUNDCALL'
            })
            .then(() => {
              console.log('✅ Flow updated');
              return wait(1000);
            })
            .then(() => {
              // Try publishing with version endpoint
              console.log('Attempting to publish...');
              return architectApi.postFlowVersions(flow.id, {});
            })
            .then((version) => {
              console.log(`✅ Published via version creation - v${version.version}\n`);
              return { flow, version, architectApi };
            })
            .catch((err2) => {
              console.log(`⚠️  Alternative method also failed: ${err2.message}\n`);
              return { flow, error: err2.message, architectApi };
            });
          });
      });
  })
  .then(({ flow, _result, _version, error, architectApi }) => {
    console.log('Step 3: Verifying flow status...\n');

    return architectApi.getFlow(flow.id, { includeConfiguration: false })
      .then((detailedFlow) => {
        console.log('='.repeat(60));
        console.log('FLOW STATUS');
        console.log('='.repeat(60));
        console.log(`Name: ${detailedFlow.name}`);
        console.log(`ID: ${detailedFlow.id}`);
        console.log(`Type: ${detailedFlow.type}`);
        console.log(`Division: ${detailedFlow.division ? detailedFlow.division.name : 'Home'}`);

        if (detailedFlow.publishedVersion) {
          console.log(`\n✅ STATUS: PUBLISHED`);
          console.log(`Published Version: ${detailedFlow.publishedVersion.version}`);
          console.log(`Published Date: ${detailedFlow.publishedVersion.datePublished || 'N/A'}`);
          console.log(`Published By: ${detailedFlow.publishedVersion.publishedBy ? detailedFlow.publishedVersion.publishedBy.name : 'API'}`);

          console.log('\n' + '='.repeat(60));
          console.log('🎉 SUCCESS - FLOW IS PUBLISHED!');
          console.log('='.repeat(60));
          console.log('\nYou can now:');
          console.log(`1. View in Architect: https://apps.usw2.pure.cloud/architect/#/flows/inboundCall/${detailedFlow.id}`);
          console.log('2. Configure DID routing to this flow');
          console.log('3. Test by calling the DID\n');

          console.log('Flow Features:');
          console.log('- Welcome greeting: "Thank you for calling"');
          console.log('- Menu: Press 1 for message, Press 0 to disconnect\n');

        } else {
          console.log(`\n❌ STATUS: NOT PUBLISHED`);

          if (detailedFlow.checkedOutVersion) {
            console.log('Currently checked out (locked for editing)');
          }
          if (detailedFlow.savedVersion) {
            console.log(`Saved version: ${detailedFlow.savedVersion.version}`);
          }

          console.log('\n' + '='.repeat(60));
          console.log('⚠️  FLOW CREATED BUT NOT PUBLISHED');
          console.log('='.repeat(60));
          console.log('\nThe flow exists but could not be auto-published.');
          console.log('To publish manually:');
          console.log('1. Go to: https://apps.usw2.pure.cloud');
          console.log('2. Admin > Architect > Inbound Call');
          console.log('3. Find: Sample_Flow_Auto');
          console.log('4. Click Validate > Publish\n');

          if (error) {
            console.log(`Error details: ${error}\n`);
          }
        }

        return detailedFlow.publishedVersion ? true : false;
      });
  })
  .catch((err) => {
    console.error('\n❌ ERROR:\n');
    console.error(err.message || err);
    if (err.body) {
      console.error('\nDetails:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  });
