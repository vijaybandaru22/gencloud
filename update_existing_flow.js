#!/usr/bin/env node
/**
 * Update existing Testflow_vj12345 with requirements
 */

const https = require('https');
const fs = require('fs');

class GenesysFlowUpdater {
    constructor(clientId, clientSecret, region = 'usw2.pure.cloud') {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.region = region;
        this.baseUrl = `api.${region}`;
        this.accessToken = null;
    }

    async makeRequest(options, postData = null) {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (_e) {
                            resolve(data);
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (postData) {
                req.write(postData);
            }

            req.end();
        });
    }

    async authenticate() {
        console.log('Authenticating with Genesys Cloud...');

        const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        const postData = 'grant_type=client_credentials';

        const options = {
            hostname: `login.${this.region}`,
            port: 443,
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const response = await this.makeRequest(options, postData);
        this.accessToken = response.access_token;
        console.log('✓ Authentication successful\n');
    }

    async findFlow(flowName) {
        console.log(`Searching for flow: ${flowName}...`);

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows?name=${encodeURIComponent(flowName)}&type=inboundcall`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const response = await this.makeRequest(options);
        const flows = response.entities || [];

        if (flows.length > 0) {
            console.log(`✓ Found flow (ID: ${flows[0].id})\n`);
            return flows[0];
        }

        console.log('✗ Flow not found\n');
        return null;
    }

    async getQueueId(queueName) {
        console.log(`Looking up queue: ${queueName}...`);

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/routing/queues?name=${encodeURIComponent(queueName)}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const response = await this.makeRequest(options);
        const queues = response.entities || [];

        if (queues.length > 0) {
            console.log(`✓ Found queue: ${queueName} (ID: ${queues[0].id})\n`);
            return queues[0].id;
        }

        console.log(`✗ Queue '${queueName}' not found\n`);
        return null;
    }

    async exportFlowToYaml(flowName, queueName, queueId, divisionName) {
        console.log('Creating YAML configuration file...');

        const yamlContent = `# ${flowName} - Flow Configuration
# This YAML file describes your flow structure

inboundCall:
  name: ${flowName}
  division: ${divisionName}
  description: "Flow with welcome message, hold music, US decision, and queue transfer"
  startUpRef: "Initial_State"
  defaultLanguage: "en-us"

  # Flow Structure
  states:
    - state:
        name: "Initial_State"
        refId: "initial"

        actions:
          # Action 1: Play Welcome Message
          - playAudio:
              name: "Play_Welcome_Message"
              tts: "welcome to my claude flow"
              outputs:
                success: "Play_Hold_Music"

          # Action 2: Play Hold Music
          - playAudio:
              name: "Play_Hold_Music"
              holdMusic: true
              outputs:
                success: "Check_US_Location"

          # Action 3: Check if caller is from US
          - decision:
              name: "Check_US_Location"
              conditions:
                - condition:
                    expression: 'Call.Country == "US"'
                    output: "Transfer_To_Queue"
              defaultOutput: "Disconnect_Call"

          # Action 4: Transfer to Queue
          - transferToAcd:
              name: "Transfer_To_Queue"
              targetQueue: "${queueName}"
              queueId: "${queueId}"
              outputs:
                success: "Disconnect_Call"
                failure: "Disconnect_Call"
                timeout: "Disconnect_Call"

          # Action 5: Disconnect
          - disconnect:
              name: "Disconnect_Call"

# Flow Diagram:
#
# [Start]
#    ↓
# [Play Welcome: "welcome to my claude flow"]
#    ↓
# [Play Hold Music]
#    ↓
# [Decision: Is caller from US?]
#    ↓                        ↓
#  YES                       NO
#    ↓                        ↓
# [Transfer to VJ_TEST_NEW] [Disconnect]
#    ↓
# [Disconnect]
`;

        const filename = `${flowName}.yaml`;
        fs.writeFileSync(filename, yamlContent);
        console.log(`✓ YAML file saved: ${filename}\n`);
        return filename;
    }

    async exportFlowToI3(flowName, flowId, queueName, queueId) {
        console.log('Creating i3 inbound flow file...');

        const i3Content = {
            "flow": {
                "name": flowName,
                "flowId": flowId,
                "type": "inboundcall",
                "startAction": "playWelcome",
                "actions": {
                    "playWelcome": {
                        "type": "PlayAudio",
                        "description": "Play welcome message",
                        "tts": "welcome to my claude flow",
                        "nextAction": "playHold"
                    },
                    "playHold": {
                        "type": "PlayAudio",
                        "description": "Play hold music",
                        "holdMusic": true,
                        "nextAction": "checkUS"
                    },
                    "checkUS": {
                        "type": "Decision",
                        "description": "Check if caller is from US",
                        "conditions": [
                            {
                                "expression": "Call.Country == \"US\"",
                                "action": "transferQueue"
                            }
                        ],
                        "defaultAction": "disconnect"
                    },
                    "transferQueue": {
                        "type": "TransferToAcd",
                        "description": `Transfer to ${queueName}`,
                        "queueId": queueId,
                        "queueName": queueName,
                        "successAction": "disconnect",
                        "failureAction": "disconnect"
                    },
                    "disconnect": {
                        "type": "Disconnect",
                        "description": "End call"
                    }
                }
            }
        };

        const filename = `${flowName}.i3inboundflow`;
        fs.writeFileSync(filename, JSON.stringify(i3Content, null, 2));
        console.log(`✓ i3 file saved: ${filename}\n`);
        return filename;
    }

    async createInstructionsFile(flowName, flowId, queueName, architectUrl) {
        console.log('Creating setup instructions...');

        const instructions = `═══════════════════════════════════════════════════════════════════
GENESYS FLOW CONFIGURATION INSTRUCTIONS
═══════════════════════════════════════════════════════════════════

Flow Name: ${flowName}
Flow ID: ${flowId}
Queue: ${queueName}

Architect URL:
${architectUrl}

═══════════════════════════════════════════════════════════════════
STEP-BY-STEP CONFIGURATION GUIDE
═══════════════════════════════════════════════════════════════════

1. OPEN THE FLOW IN ARCHITECT
   - Click the Architect URL above, or
   - Navigate to: Admin > Architect > Inbound Call
   - Find and open: ${flowName}

2. ADD ACTION: Play Audio (Welcome Message)
   - Drag "Play Audio" action to the canvas
   - Configuration:
     ✓ Name: Play Welcome Message
     ✓ Audio Type: Text-to-Speech
     ✓ TTS Text: "welcome to my claude flow"
   - Connect from "Initial State" to this action

3. ADD ACTION: Play Audio (Hold Music)
   - Drag another "Play Audio" action
   - Configuration:
     ✓ Name: Play Hold Music
     ✓ Select: "Play hold music"
   - Connect from "Play Welcome Message" to this action

4. ADD ACTION: Decision (Check US Location)
   - Drag "Decision" action to the canvas
   - Configuration:
     ✓ Name: Check US Location
     ✓ Add Condition:
       - Expression: Call.Country == "US"
       - Label: "Is from US"
   - Connect from "Play Hold Music" to this action

5. ADD ACTION: Transfer to ACD
   - Drag "Transfer to ACD" action to the canvas
   - Configuration:
     ✓ Name: Transfer to VJ_TEST_NEW
     ✓ Queue: Select "${queueName}" from dropdown
   - Connect from Decision's "Is from US" output to this action

6. ADD ACTION: Disconnect
   - Drag "Disconnect" action to the canvas
   - Configuration:
     ✓ Name: End Call
   - Connect the following to Disconnect:
     ✓ Decision's "Default" output
     ✓ Transfer to ACD's "Success" output
     ✓ Transfer to ACD's "Failure" output

7. VALIDATE THE FLOW
   - Click "Validate" button
   - Fix any errors shown
   - Ensure all paths lead to Disconnect

8. SAVE THE FLOW
   - Click "Save" button
   - Add save comment if needed

9. PUBLISH THE FLOW
   - Click "Publish" button
   - Add publish comment
   - Confirm publication

10. TEST THE FLOW
    - Assign flow to a DID/Queue
    - Make a test call
    - Verify all components work

═══════════════════════════════════════════════════════════════════
FLOW DIAGRAM
═══════════════════════════════════════════════════════════════════

    [Initial State]
          ↓
    [Play Audio: "welcome to my claude flow"]
          ↓
    [Play Audio: Hold Music]
          ↓
    [Decision: Call.Country == "US"?]
          ↓                    ↓
        YES                   NO
          ↓                    ↓
    [Transfer to VJ_TEST_NEW] [Disconnect]
          ↓
    [Disconnect]

═══════════════════════════════════════════════════════════════════
REFERENCE FILES
═══════════════════════════════════════════════════════════════════

- ${flowName}.yaml - YAML configuration
- ${flowName}.i3inboundflow - i3 flow format
- This file - Setup instructions

═══════════════════════════════════════════════════════════════════
`;

        const filename = 'FLOW_SETUP_INSTRUCTIONS.txt';
        fs.writeFileSync(filename, instructions);
        console.log(`✓ Instructions saved: ${filename}\n`);
        return filename;
    }
}

async function main() {
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';
    const FLOW_NAME = 'Testflow_vj12345';
    const DIVISION_NAME = 'Home';
    const QUEUE_NAME = 'VJ_TEST_NEW';

    console.log('═'.repeat(70));
    console.log('GENESYS CLOUD FLOW SETUP');
    console.log('═'.repeat(70));
    console.log('\nFlow: ' + FLOW_NAME);
    console.log('Division: ' + DIVISION_NAME);
    console.log('Queue: ' + QUEUE_NAME);
    console.log('\nRequirements:');
    console.log('  1. Play welcome message: "welcome to my claude flow"');
    console.log('  2. Play hold music');
    console.log('  3. Check if caller is from US (Call.Country == "US")');
    console.log('  4. If from US, transfer to Queue: VJ_TEST_NEW');
    console.log('═'.repeat(70));
    console.log();

    const updater = new GenesysFlowUpdater(CLIENT_ID, CLIENT_SECRET, REGION);

    try {
        // Authenticate
        await updater.authenticate();

        // Find the flow
        const flow = await updater.findFlow(FLOW_NAME);
        if (!flow) {
            console.log('ERROR: Flow not found. Please check the flow name.');
            process.exit(1);
        }

        // Get queue ID
        const queueId = await updater.getQueueId(QUEUE_NAME);
        if (!queueId) {
            console.log('WARNING: Queue not found. You will need to select it manually in Architect.');
        }

        // Generate configuration files
        const yamlFile = await updater.exportFlowToYaml(FLOW_NAME, QUEUE_NAME, queueId, DIVISION_NAME);
        const i3File = await updater.exportFlowToI3(FLOW_NAME, flow.id, QUEUE_NAME, queueId);

        // Generate instructions
        const architectUrl = `https://apps.${REGION}/architect/#/flows/${flow.id}/edit`;
        const instructionsFile = await updater.createInstructionsFile(FLOW_NAME, flow.id, QUEUE_NAME, architectUrl);

        console.log('═'.repeat(70));
        console.log('SETUP FILES CREATED SUCCESSFULLY');
        console.log('═'.repeat(70));
        console.log('\nGenerated Files:');
        console.log(`  ✓ ${yamlFile} - Flow configuration in YAML format`);
        console.log(`  ✓ ${i3File} - Flow configuration in i3 format`);
        console.log(`  ✓ ${instructionsFile} - Step-by-step setup guide`);
        console.log('\n' + '═'.repeat(70));
        console.log('NEXT STEPS');
        console.log('═'.repeat(70));
        console.log('\n1. Open the flow in Architect:');
        console.log(`   ${architectUrl}`);
        console.log('\n2. Follow the instructions in: ' + instructionsFile);
        console.log('\n3. Configure the flow with the actions listed in the YAML/i3 files');
        console.log('\n4. Save and Publish the flow');
        console.log('\n' + '═'.repeat(70));
        console.log('FLOW IS READY FOR CONFIGURATION!');
        console.log('═'.repeat(70));

    } catch (error) {
        console.error('\n✗ ERROR:', error.message);
        process.exit(1);
    }
}

main();
