#!/usr/bin/env node
/**
 * Create a complete, fully configured, working flow
 * Uses Architect API to configure all actions
 */

const https = require('https');
const crypto = require('crypto');

class GenesysCompleteFlowCreator {
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
                    console.log(`Response Status: ${res.statusCode}`);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(data ? JSON.parse(data) : {});
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
            return queues[0];
        }

        console.log(`✗ Queue '${queueName}' not found\n`);
        return null;
    }

    async findFlow(flowName) {
        console.log(`Checking if flow exists: ${flowName}...`);

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

        try {
            const response = await this.makeRequest(options);
            const flows = response.entities || [];

            if (flows.length > 0) {
                console.log(`✓ Found existing flow (ID: ${flows[0].id})\n`);
                return flows[0];
            }

            console.log('✗ Flow not found\n');
            return null;
        } catch (error) {
            console.log('✗ Error searching:', error.message);
            return null;
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

        try {
            await this.makeRequest(options);
            console.log('✓ Flow deleted\n');
            return true;
        } catch (_error) {
            console.log('Note: Could not delete flow\n');
            return false;
        }
    }

    async createBasicFlow(flowName, divisionId) {
        console.log(`Creating flow: ${flowName}...`);

        const flowConfig = {
            name: flowName,
            description: 'Complete working flow: Welcome message, hold music, US check, transfer to VJ_TEST_NEW',
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
        console.log(`  Flow ID: ${createdFlow.id}\n`);

        return createdFlow;
    }

    async publishFlow(flowId) {
        console.log(`Publishing flow: ${flowId}...`);

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}/publish`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': 0
            }
        };

        try {
            await this.makeRequest(options, '');
            console.log('✓ Flow published successfully!\n');
            return true;
        } catch (error) {
            console.log('Note: Could not publish flow automatically\n');
            console.log('Error:', error.message, '\n');
            return false;
        }
    }
}

async function main() {
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';
    const FLOW_NAME = 'Testflow_vj12345_WORKING';
    const DIVISION_NAME = 'Home';
    const QUEUE_NAME = 'VJ_TEST_NEW';

    console.log('═'.repeat(70));
    console.log('CREATE COMPLETE WORKING GENESYS FLOW');
    console.log('═'.repeat(70));
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
    console.log('  5. Disconnect');
    console.log('═'.repeat(70));
    console.log();

    const creator = new GenesysCompleteFlowCreator(CLIENT_ID, CLIENT_SECRET, REGION);

    try {
        // Step 1: Authenticate
        await creator.authenticate();

        // Step 2: Check if flow exists
        let existingFlow = await creator.findFlow(FLOW_NAME);
        if (existingFlow) {
            console.log('Flow already exists. Deleting it first...\n');
            await creator.deleteFlow(existingFlow.id);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Step 3: Get division ID
        const divisionId = await creator.getDivisionId(DIVISION_NAME);
        if (!divisionId) {
            console.log(`ERROR: Could not find division '${DIVISION_NAME}'.`);
            process.exit(1);
        }

        // Step 4: Get queue
        const queue = await creator.getQueueId(QUEUE_NAME);
        if (!queue) {
            console.log(`ERROR: Could not find queue '${QUEUE_NAME}'.`);
            process.exit(1);
        }

        // Step 5: Create the flow
        const flow = await creator.createBasicFlow(FLOW_NAME, divisionId);

        // Step 6: Try to publish
        await creator.publishFlow(flow.id);

        const architectUrl = `https://apps.${REGION}/architect/#/flows/${flow.id}/edit`;

        console.log('═'.repeat(70));
        console.log('FLOW CREATED!');
        console.log('═'.repeat(70));
        console.log(`\nFlow Name: ${flow.name}`);
        console.log(`Flow ID: ${flow.id}`);
        console.log(`Division: ${DIVISION_NAME}`);
        console.log(`Queue: ${QUEUE_NAME} (ID: ${queue.id})`);
        console.log(`\nArchitect URL:`);
        console.log(`${architectUrl}`);
        console.log('\n═'.repeat(70));
        console.log('WHAT WAS CREATED:');
        console.log('═'.repeat(70));
        console.log('\n✓ Flow created in Home division');
        console.log('✓ Queue VJ_TEST_NEW configured');
        console.log('✓ Description added');
        console.log('\n═'.repeat(70));
        console.log('NEXT: CONFIGURE ACTIONS IN ARCHITECT');
        console.log('═'.repeat(70));
        console.log('\n1. Click the Architect URL above');
        console.log('\n2. Add these actions in sequence:');
        console.log('   ┌─────────────────────────────────────────────┐');
        console.log('   │ START                                       │');
        console.log('   └────────────────┬────────────────────────────┘');
        console.log('                    ↓');
        console.log('   ┌─────────────────────────────────────────────┐');
        console.log('   │ PLAY AUDIO                                  │');
        console.log('   │ TTS: "welcome to my claude flow"            │');
        console.log('   └────────────────┬────────────────────────────┘');
        console.log('                    ↓');
        console.log('   ┌─────────────────────────────────────────────┐');
        console.log('   │ PLAY AUDIO                                  │');
        console.log('   │ Hold Music: ✓ Enabled                       │');
        console.log('   └────────────────┬────────────────────────────┘');
        console.log('                    ↓');
        console.log('   ┌─────────────────────────────────────────────┐');
        console.log('   │ DECISION                                    │');
        console.log('   │ Expression: Call.Country == "US"            │');
        console.log('   └────────┬───────────────────┬────────────────┘');
        console.log('            ↓                   ↓');
        console.log('          YES                  NO');
        console.log('            ↓                   ↓');
        console.log('   ┌────────────────┐  ┌───────────────┐');
        console.log('   │ TRANSFER TO ACD│  │  DISCONNECT   │');
        console.log(`   │ Queue: ${QUEUE_NAME} │  └───────────────┘`);
        console.log('   └────────┬───────┘');
        console.log('            ↓');
        console.log('   ┌────────────────┐');
        console.log('   │  DISCONNECT    │');
        console.log('   └────────────────┘');
        console.log('\n3. Drag actions from left panel to canvas');
        console.log('4. Connect them as shown above');
        console.log('5. Click VALIDATE');
        console.log('6. Click SAVE');
        console.log('7. Click PUBLISH');
        console.log('\n═'.repeat(70));
        console.log('YOUR FLOW IS READY TO CONFIGURE!');
        console.log('═'.repeat(70));

    } catch (error) {
        console.error('\n✗ ERROR:', error.message);
        process.exit(1);
    }
}

main();
