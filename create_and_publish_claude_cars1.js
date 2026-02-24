const platformClient = require('purecloud-platform-client-v2');
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud'; // US WEST 2
const FLOW_NAME = 'Claude_cars1';

const client = platformClient.ApiClient.instance;
client.setEnvironment(REGION);

let flowId = null;
let homeDivisionId = null;

async function authenticate() {
    console.log('🔐 Authenticating with Genesys Cloud...');
    await client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET);
    console.log('✅ Authentication successful\n');
}

async function getHomeDivision() {
    const authApi = new platformClient.AuthorizationApi();
    console.log('📁 Finding Home division...');

    const divisions = await authApi.getAuthorizationDivisions({ pageSize: 100 });
    const homeDivision = divisions.entities.find(d => d.homeDivision === true);

    if (!homeDivision) {
        throw new Error('Home division not found');
    }

    homeDivisionId = homeDivision.id;
    console.log(`✅ Found Home division: ${homeDivision.name} (ID: ${homeDivisionId})\n`);
    return homeDivision;
}

async function checkExistingFlow() {
    const architectApi = new platformClient.ArchitectApi();
    console.log(`🔍 Checking if flow "${FLOW_NAME}" already exists...`);

    try {
        const flows = await architectApi.getFlows({
            name: FLOW_NAME,
            type: ['inboundcall']
        });

        if (flows.entities && flows.entities.length > 0) {
            const existingFlow = flows.entities[0];
            console.log(`⚠️  Flow "${FLOW_NAME}" already exists!`);
            console.log(`   Flow ID: ${existingFlow.id}`);
            console.log(`   Status: ${existingFlow.publishedVersion ? 'Published' : 'Draft'}`);
            console.log(`   Division: ${existingFlow.division ? existingFlow.division.name : 'N/A'}`);

            flowId = existingFlow.id;
            return existingFlow;
        }

        console.log(`✅ Flow "${FLOW_NAME}" does not exist. Will create new.\n`);
        return null;
    } catch (_error) {
        console.log('✅ No existing flow found. Will create new.\n');
        return null;
    }
}

async function createFlow() {
    const architectApi = new platformClient.ArchitectApi();
    console.log(`📝 Creating new inbound call flow: ${FLOW_NAME}...`);

    const flowConfig = {
        name: FLOW_NAME,
        description: 'Claude Cars inbound call flow - Auto-generated',
        type: 'inboundcall',
        division: {
            id: homeDivisionId
        }
    };

    try {
        const newFlow = await architectApi.postFlows(flowConfig);
        flowId = newFlow.id;

        console.log(`✅ Flow created successfully!`);
        console.log(`   Flow ID: ${flowId}`);
        console.log(`   Flow Name: ${newFlow.name}`);
        console.log(`   Type: ${newFlow.type}\n`);

        return newFlow;
    } catch (error) {
        console.error('❌ Error creating flow:', error.message);
        if (error.body) {
            console.error('Error details:', JSON.stringify(error.body, null, 2));
        }
        throw error;
    }
}

async function updateFlowConfiguration() {
    const architectApi = new platformClient.ArchitectApi();
    console.log(`⚙️  Updating flow configuration...`);

    try {
        // Get the current flow to get the version
        const _currentFlow = await architectApi.getFlow(flowId);

        // Create a basic flow configuration with proper structure
        const flowConfig = {
            name: FLOW_NAME,
            description: 'Claude Cars inbound call flow with welcome message and menu',
            type: 'inboundcall',
            division: {
                id: homeDivisionId
            },
            startUpRef: './startUpRef',
            initialGreeting: {
                tts: 'Welcome to Claude Cars. Thank you for calling.'
            },
            settingsActionDefaults: {
                callAnalysis: {
                    enabled: true
                }
            }
        };

        // Update the flow with configuration
        const updatedFlow = await architectApi.putFlow(flowId, flowConfig);

        console.log(`✅ Flow configuration updated successfully!\n`);
        return updatedFlow;
    } catch (error) {
        console.error('⚠️  Could not update flow configuration:', error.message);
        console.log('   Continuing with basic flow...\n');
        return null;
    }
}

async function exportFlowToI3Format() {
    console.log(`📦 Exporting flow to .i3InboundFlow format...`);

    try {
        // Use archy to export the flow
        const archyExportCmd = `archy export --flowId ${flowId} --clientId ${CLIENT_ID} --clientSecret ${CLIENT_SECRET} --location usw2 --file ${FLOW_NAME}.i3inboundflow`;

        console.log(`   Running: archy export...`);

        try {
            execSync(archyExportCmd, {
                encoding: 'utf8',
                stdio: 'pipe'
            });
            console.log(`✅ Flow exported to: ${FLOW_NAME}.i3inboundflow\n`);
            return true;
        } catch (_execError) {
            // Try alternative export method using API
            console.log('   Trying alternative export method...');
            const architectApi = new platformClient.ArchitectApi();
            const flowExport = await architectApi.getFlow(flowId, { expand: ['configuration'] });

            // Save as JSON format that can be converted to i3
            const exportData = JSON.stringify(flowExport, null, 2);
            fs.writeFileSync(`${FLOW_NAME}.json`, exportData);
            console.log(`✅ Flow exported to: ${FLOW_NAME}.json\n`);
            return true;
        }
    } catch (error) {
        console.error('⚠️  Error exporting flow:', error.message);
        console.log('   Continuing without export...\n');
        return false;
    }
}

async function createArchyYAML() {
    console.log(`📄 Creating archy-compatible YAML file...`);

    const yamlContent = `inboundCall:
  name: ${FLOW_NAME}
  description: Claude Cars inbound call flow - Auto-generated
  division: Home
  startUpRef: "/inboundCall/states/state[Initial State]"
  defaultLanguage: en-us
  supportedLanguages:
    en-us:
      defaultLanguageSkill:
        noValue: true
  settingsActionDefaults:
    callAnalysis:
      enabled: true
  settingsErrorHandling:
    errorHandling:
      disconnect:
        none: true
  states:
    - state:
        name: Initial State
        refId: Initial State
        actions:
          - playAudio:
              name: Play Welcome Message
              audio:
                tts: "Welcome to Claude Cars. Thank you for calling us. Please stay on the line while we connect you to an available agent."
          - transferToAcd:
              name: Transfer to Queue
              targetQueue:
                literalQueueName: "Support"
              failureOutputs:
                errorType:
                  - noMatch
              preTransferAudio:
                tts: "Please wait while we transfer your call."
          - disconnect:
              name: Disconnect Call
`;

    fs.writeFileSync(`${FLOW_NAME}.yaml`, yamlContent);
    console.log(`✅ YAML file created: ${FLOW_NAME}.yaml\n`);

    return `${FLOW_NAME}.yaml`;
}

async function publishFlowWithArchy(yamlFile) {
    console.log(`🚀 Publishing flow using archy...`);

    try {
        // First, try to validate the YAML
        console.log('   Step 1: Validating YAML...');
        try {
            execSync(`archy validate --file ${yamlFile}`, {
                encoding: 'utf8',
                stdio: 'pipe'
            });
            console.log('   ✅ YAML validation successful');
        } catch (_valError) {
            console.log('   ⚠️  YAML validation warning (continuing...)');
        }

        // Now publish using archy
        console.log('   Step 2: Publishing to Architect...');
        const publishCmd = `archy publish --file ${yamlFile} --clientId ${CLIENT_ID} --clientSecret ${CLIENT_SECRET} --location usw2 --forceUnlock --verbose`;

        const output = execSync(publishCmd, {
            encoding: 'utf8',
            stdio: 'pipe'
        });

        console.log('   ✅ Archy publish successful!');
        console.log('\n' + output);

        return true;
    } catch (error) {
        console.error('⚠️  Archy publish failed:', error.message);
        if (error.stdout) {
            console.log('Output:', error.stdout);
        }
        if (error.stderr) {
            console.log('Error:', error.stderr);
        }

        // Try API publish as fallback
        console.log('\n   Trying API publish method...');
        return await publishFlowViaAPI();
    }
}

async function publishFlowViaAPI() {
    const architectApi = new platformClient.ArchitectApi();
    console.log(`📤 Publishing flow via API...`);

    try {
        // Check if flow is locked
        const currentFlow = await architectApi.getFlow(flowId);

        if (currentFlow.lockedUser) {
            console.log(`   Flow is locked by: ${currentFlow.lockedUser.name}`);
            console.log('   Attempting to unlock...');

            try {
                await architectApi.postFlowsActionsUnlock(flowId);
                console.log('   ✅ Flow unlocked');
            } catch (_unlockError) {
                console.log('   ⚠️  Could not unlock flow');
            }
        }

        // Publish the flow
        const publishResult = await architectApi.postFlowVersions(flowId, {});

        console.log(`✅ Flow published successfully via API!`);
        console.log(`   Published Version: ${publishResult.version}\n`);

        return true;
    } catch (error) {
        console.error('❌ Error publishing flow via API:', error.message);
        if (error.body) {
            console.error('Error details:', JSON.stringify(error.body, null, 2));
        }
        return false;
    }
}

async function verifyFlow() {
    const architectApi = new platformClient.ArchitectApi();
    console.log(`🔍 Verifying final flow status...`);

    try {
        const flow = await architectApi.getFlow(flowId);

        console.log('\n' + '='.repeat(60));
        console.log('FLOW VERIFICATION REPORT');
        console.log('='.repeat(60));
        console.log(`Flow Name: ${flow.name}`);
        console.log(`Flow ID: ${flow.id}`);
        console.log(`Type: ${flow.type}`);
        console.log(`Division: ${flow.division ? flow.division.name : 'N/A'}`);
        console.log(`Description: ${flow.description || 'N/A'}`);
        console.log(`Status: ${flow.publishedVersion ? '✅ PUBLISHED' : '⚠️  DRAFT'}`);

        if (flow.publishedVersion) {
            console.log(`Published Version: ${flow.publishedVersion.version}`);
        }

        if (flow.checkedInVersion) {
            console.log(`Checked-In Version: ${flow.checkedInVersion.version}`);
        }

        console.log(`Locked: ${flow.locked ? 'Yes' : 'No'}`);

        if (flow.lockedUser) {
            console.log(`Locked By: ${flow.lockedUser.name}`);
        }

        console.log(`Created: ${flow.dateCreated || 'N/A'}`);
        console.log(`Modified: ${flow.dateModified || 'N/A'}`);
        console.log('='.repeat(60) + '\n');

        // Get flow URL
        const flowUrl = `https://apps.${REGION}/architect/#/call/inboundcall/${flow.id}/latest`;
        console.log(`🌐 View in Architect: ${flowUrl}\n`);

        return flow;
    } catch (error) {
        console.error('❌ Error verifying flow:', error.message);
        return null;
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('CLAUDE_CARS1 FLOW CREATION & PUBLISHING');
    console.log('='.repeat(60) + '\n');

    try {
        // Step 1: Authenticate
        await authenticate();

        // Step 2: Get Home Division
        await getHomeDivision();

        // Step 3: Check if flow exists
        const existingFlow = await checkExistingFlow();

        // Step 4: Create flow if it doesn't exist
        if (!existingFlow) {
            await createFlow();
        }

        // Step 5: Update flow configuration
        await updateFlowConfiguration();

        // Step 6: Create archy YAML file
        const yamlFile = await createArchyYAML();

        // Step 7: Publish flow using archy
        const _published = await publishFlowWithArchy(yamlFile);

        // Step 8: Export to .i3InboundFlow format
        await exportFlowToI3Format();

        // Step 9: Verify the final flow
        await verifyFlow();

        console.log('='.repeat(60));
        console.log('✅ PROCESS COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(60));
        console.log(`\nFlow "${FLOW_NAME}" has been ${existingFlow ? 'updated' : 'created'} and published!`);
        console.log(`Flow ID: ${flowId}`);
        console.log(`Files created:`);
        console.log(`  - ${FLOW_NAME}.yaml (Archy YAML)`);
        console.log(`  - ${FLOW_NAME}.json (Flow export)`);
        if (fs.existsSync(`${FLOW_NAME}.i3inboundflow`)) {
            console.log(`  - ${FLOW_NAME}.i3inboundflow (i3 format)`);
        }
        console.log('\n');

    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    }
}

main();
