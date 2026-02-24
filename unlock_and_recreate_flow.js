#!/usr/bin/env node
/**
 * Unlock, Delete, and Recreate Testflow_vj12345
 */

const https = require('https');
const crypto = require('crypto');

class GenesysFlowManager {
    constructor(clientId, clientSecret, region = 'usw2.pure.cloud') {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.region = region;
        this.baseUrl = `api.${region}`;
        this.accessToken = null;
    }

    generateUUID() {
        return crypto.randomUUID();
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
        console.log(`Searching for existing flow: ${flowName}...`);

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
            console.log(`✓ Found existing flow (ID: ${flows[0].id})\n`);
            return flows[0];
        }

        console.log('✗ Flow not found\n');
        return null;
    }

    async unlockFlow(flowId) {
        console.log(`Unlocking flow: ${flowId}...`);

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}/unlock`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': 0
            }
        };

        try {
            await this.makeRequest(options, '');
            console.log('✓ Flow unlocked successfully\n');
            return true;
        } catch (error) {
            console.log('Note: Could not unlock flow:', error.message);
            console.log('The flow may not be locked or already unlocked.\n');
            return false;
        }
    }

    async deleteFlow(flowId) {
        console.log(`Deleting flow: ${flowId}...`);

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        await this.makeRequest(options);
        console.log('✓ Flow deleted successfully\n');
    }

    async getDivisionId(divisionName) {
        console.log(`Looking up division: ${divisionName}...`);

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: '/api/v2/authorization/divisions',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const response = await this.makeRequest(options);
        const divisions = response.entities || [];
        const division = divisions.find(d => d.name === divisionName);

        if (division) {
            console.log(`✓ Found division: ${divisionName} (ID: ${division.id})\n`);
            return division.id;
        }

        console.log(`✗ Division '${divisionName}' not found\n`);
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

    async createBasicFlow(flowName, divisionId) {
        console.log(`Creating flow: ${flowName}...`);

        const flowConfig = {
            name: flowName,
            description: 'Claude Flow - Welcome message, hold music, US location check, and queue transfer to VJ_TEST_NEW',
            type: 'inboundcall',
            division: {
                id: divisionId
            }
        };

        const postData = JSON.stringify(flowConfig);

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: '/api/v2/flows',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const createdFlow = await this.makeRequest(options, postData);
        console.log('✓ Flow created successfully!\n');
        console.log(`  Flow ID: ${createdFlow.id}`);
        console.log(`  Flow Name: ${createdFlow.name}`);
        console.log(`  Flow Type: ${createdFlow.type}\n`);

        return createdFlow;
    }

    async saveYamlConfig(flowName, queueName, queueId, divisionName) {
        const fs = require('fs');

        const yamlContent = `inboundCall:
  name: ${flowName}
  division: ${divisionName}
  description: Flow with welcome message, hold music, US decision, and queue transfer
  startUpRef: Initial_State
  defaultLanguage: en-us
  initialGreeting:
    tts: "welcome to my claude flow"

  states:
    - state:
        name: Initial_State
        actions:
          - playAudio:
              name: Play_Welcome_Message
              tts: "welcome to my claude flow"
              outputs:
                success: Play_Hold_Music

          - playAudio:
              name: Play_Hold_Music
              holdMusic: true
              outputs:
                success: Check_US_Location

          - decision:
              name: Check_US_Location
              conditions:
                - if: Call.Country == "US"
                  then: Transfer_To_Queue
              defaultOutput: Disconnect_Call

          - transferToAcd:
              name: Transfer_To_Queue
              targetQueue: ${queueName}
              queueId: ${queueId}
              outputs:
                success: Disconnect_Call
                failure: Disconnect_Call

          - disconnect:
              name: Disconnect_Call
`;

        fs.writeFileSync(`${flowName}.yaml`, yamlContent);
        console.log(`✓ YAML configuration saved to: ${flowName}.yaml\n`);
    }
}

async function main() {
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';
    const FLOW_NAME = 'Testflow_vj12345';
    const DIVISION_NAME = 'Home';
    const QUEUE_NAME = 'VJ_TEST_NEW';

    console.log('='.repeat(70));
    console.log('Genesys Cloud Flow Manager - Unlock, Delete & Recreate');
    console.log('='.repeat(70));
    console.log('\nConfiguration:');
    console.log(`  Flow Name: ${FLOW_NAME}`);
    console.log(`  Division: ${DIVISION_NAME}`);
    console.log(`  Queue: ${QUEUE_NAME}`);
    console.log(`  Region: ${REGION}`);
    console.log('\nFlow Requirements:');
    console.log('  1. Play welcome message: "welcome to my claude flow"');
    console.log('  2. Play hold music');
    console.log('  3. Check if caller is from US (Call.Country == "US")');
    console.log('  4. If from US, transfer to Queue: VJ_TEST_NEW');
    console.log('='.repeat(70));
    console.log();

    const manager = new GenesysFlowManager(CLIENT_ID, CLIENT_SECRET, REGION);

    try {
        // Step 1: Authenticate
        await manager.authenticate();

        // Step 2: Find existing flow
        const existingFlow = await manager.findFlow(FLOW_NAME);

        if (existingFlow) {
            // Step 3: Unlock the flow
            await manager.unlockFlow(existingFlow.id);

            // Step 4: Delete the flow
            await manager.deleteFlow(existingFlow.id);
        }

        // Step 5: Get division ID
        const divisionId = await manager.getDivisionId(DIVISION_NAME);
        if (!divisionId) {
            console.log(`ERROR: Could not find division '${DIVISION_NAME}'.`);
            process.exit(1);
        }

        // Step 6: Get queue ID
        const queueId = await manager.getQueueId(QUEUE_NAME);
        if (!queueId) {
            console.log(`WARNING: Could not find queue '${QUEUE_NAME}'.`);
            console.log('The flow will be created, but you need to configure the queue manually.\n');
        }

        // Step 7: Create new flow
        const flow = await manager.createBasicFlow(FLOW_NAME, divisionId);

        // Step 8: Save YAML configuration
        await manager.saveYamlConfig(FLOW_NAME, QUEUE_NAME, queueId, DIVISION_NAME);

        // Final output
        const architectUrl = `https://apps.${REGION}/architect/#/flows/${flow.id}/edit`;

        console.log('='.repeat(70));
        console.log('SUCCESS! FLOW CREATED');
        console.log('='.repeat(70));
        console.log(`\nFlow Details:`);
        console.log(`  Name: ${flow.name}`);
        console.log(`  ID: ${flow.id}`);
        console.log(`  Type: ${flow.type}`);
        console.log(`  Division: ${DIVISION_NAME}`);
        console.log(`\nArchitect URL:`);
        console.log(`  ${architectUrl}`);
        console.log('\n' + '='.repeat(70));
        console.log('NEXT STEPS: Configure the flow in Architect');
        console.log('='.repeat(70));
        console.log('\nYou need to add the following components in Architect:');
        console.log('\n1. PLAY AUDIO (Welcome Message)');
        console.log('   - TTS: "welcome to my claude flow"');
        console.log('   - Connect output to next action');
        console.log('\n2. PLAY AUDIO (Hold Music)');
        console.log('   - Enable "Play hold music"');
        console.log('   - Connect output to next action');
        console.log('\n3. DECISION (Check US Location)');
        console.log('   - Expression: Call.Country == "US"');
        console.log('   - If true: Connect to Transfer action');
        console.log('   - Default: Connect to Disconnect');
        console.log('\n4. TRANSFER TO ACD');
        console.log(`   - Queue: ${QUEUE_NAME}`);
        console.log('   - Connect success/failure to Disconnect');
        console.log('\n5. DISCONNECT');
        console.log('   - End the call');
        console.log('\n6. SAVE and PUBLISH the flow in Architect');
        console.log('='.repeat(70));
        console.log(`\nA YAML configuration file has been saved to: ${FLOW_NAME}.yaml`);
        console.log('This file contains the complete flow structure for reference.');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n✗ ERROR:', error.message);
        process.exit(1);
    }
}

main();
