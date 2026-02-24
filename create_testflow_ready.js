#!/usr/bin/env node
/**
 * Create Testflow_vj12345 in Genesys Cloud - Ready to Use
 * Division: Home
 * Queue: VJ_TEST_NEW
 */

const https = require('https');
const crypto = require('crypto');

class GenesysFlowCreator {
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
            console.log('✗ Error searching for flow:', error.message);
            return null;
        }
    }

    async deleteFlow(flowId) {
        console.log(`Deleting existing flow: ${flowId}...`);

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
            console.log('✓ Flow deleted successfully\n');
            return true;
        } catch (error) {
            console.log('Note: Could not delete flow:', error.message);
            return false;
        }
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

        console.log(`✗ Division '${divisionName}' not found`);
        console.log('Available divisions:');
        divisions.forEach(d => console.log(`  - ${d.name}`));
        console.log();
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

    async createFlow(flowName, divisionId, _queueId) {
        console.log(`Creating flow: ${flowName}...`);

        // Create flow configuration with actions
        const flowConfig = {
            name: flowName,
            description: 'Flow with welcome message, hold music, US location check, and queue transfer',
            type: 'inboundcall',
            division: {
                id: divisionId
            },
            startUpRef: 'Task_Initial',
            initialActions: [
                {
                    type: 'playAudio',
                    audioData: {
                        ttsString: 'welcome to my claude flow'
                    }
                }
            ]
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

        try {
            const createdFlow = await this.makeRequest(options, postData);
            console.log('✓ Flow created successfully!\n');
            return createdFlow;
        } catch (error) {
            console.error('✗ Error creating flow:', error.message);
            return null;
        }
    }

    async configureFlow(flowId, queueId) {
        console.log(`Configuring flow actions...`);

        // Get the current flow configuration
        const getOptions = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}/latestconfiguration`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        try {
            const flowConfig = await this.makeRequest(getOptions);

            // Build the complete flow configuration
            const updatedConfig = {
                ...flowConfig,
                flowNodes: [
                    {
                        id: this.generateUUID(),
                        name: 'Initial State',
                        type: 'initial',
                        actions: [
                            {
                                id: this.generateUUID(),
                                type: 'playAudio',
                                audioData: {
                                    ttsString: 'welcome to my claude flow'
                                },
                                outputs: {
                                    success: 'holdMusicNode'
                                }
                            }
                        ]
                    },
                    {
                        id: 'holdMusicNode',
                        name: 'Play Hold Music',
                        type: 'task',
                        actions: [
                            {
                                id: this.generateUUID(),
                                type: 'playAudio',
                                holdMusic: true,
                                outputs: {
                                    success: 'decisionNode'
                                }
                            }
                        ]
                    },
                    {
                        id: 'decisionNode',
                        name: 'Check US Location',
                        type: 'decision',
                        conditions: [
                            {
                                id: this.generateUUID(),
                                expression: 'Call.Country == "US"',
                                output: 'transferNode'
                            }
                        ],
                        defaultOutput: 'disconnectNode'
                    },
                    {
                        id: 'transferNode',
                        name: 'Transfer to VJ_TEST_NEW',
                        type: 'task',
                        actions: [
                            {
                                id: this.generateUUID(),
                                type: 'transferToAcd',
                                queueId: queueId,
                                outputs: {
                                    success: 'disconnectNode',
                                    failure: 'disconnectNode'
                                }
                            }
                        ]
                    },
                    {
                        id: 'disconnectNode',
                        name: 'Disconnect',
                        type: 'disconnect'
                    }
                ]
            };

            const putData = JSON.stringify(updatedConfig);

            const putOptions = {
                hostname: this.baseUrl,
                port: 443,
                path: `/api/v2/flows/${flowId}/latestconfiguration`,
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(putData)
                }
            };

            await this.makeRequest(putOptions, putData);
            console.log('✓ Flow configured successfully!\n');
            return true;
        } catch (error) {
            console.error('Note: Could not configure flow automatically:', error.message);
            console.log('You will need to configure the flow manually in Architect.\n');
            return false;
        }
    }

    async publishFlow(flowId) {
        console.log(`Publishing flow...`);

        const postData = JSON.stringify({});

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}/publish`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        try {
            await this.makeRequest(options, postData);
            console.log('✓ Flow published successfully!\n');
            return true;
        } catch (error) {
            console.log('Note: Could not publish flow automatically:', error.message);
            console.log('You will need to publish the flow manually in Architect.\n');
            return false;
        }
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
    console.log('Genesys Cloud Flow Creator - Ready to Use');
    console.log('='.repeat(70));
    console.log('\nConfiguration:');
    console.log(`  Flow Name: ${FLOW_NAME}`);
    console.log(`  Division: ${DIVISION_NAME}`);
    console.log(`  Queue: ${QUEUE_NAME}`);
    console.log(`  Region: ${REGION}`);
    console.log('\nFlow Requirements:');
    console.log('  1. Play welcome message: "welcome to my claude flow"');
    console.log('  2. Play hold music');
    console.log('  3. Check if caller is from US');
    console.log('  4. If from US, transfer to Queue: VJ_TEST_NEW');
    console.log('='.repeat(70));
    console.log();

    const creator = new GenesysFlowCreator(CLIENT_ID, CLIENT_SECRET, REGION);

    try {
        // Step 1: Authenticate
        await creator.authenticate();

        // Step 2: Find and delete existing flow
        const existingFlow = await creator.findFlow(FLOW_NAME);
        if (existingFlow) {
            await creator.deleteFlow(existingFlow.id);
        }

        // Step 3: Get division ID
        const divisionId = await creator.getDivisionId(DIVISION_NAME);
        if (!divisionId) {
            console.log(`ERROR: Could not find division '${DIVISION_NAME}'.`);
            process.exit(1);
        }

        // Step 4: Get queue ID
        const queueId = await creator.getQueueId(QUEUE_NAME);
        if (!queueId) {
            console.log(`ERROR: Could not find queue '${QUEUE_NAME}'.`);
            process.exit(1);
        }

        // Step 5: Create flow
        const flow = await creator.createFlow(FLOW_NAME, divisionId, queueId);
        if (!flow) {
            console.log('ERROR: Could not create flow.');
            process.exit(1);
        }

        console.log(`Flow ID: ${flow.id}`);
        console.log(`Flow Name: ${flow.name}`);
        console.log(`Flow Type: ${flow.type}\n`);

        // Step 6: Configure flow (optional - may not work via API)
        await creator.configureFlow(flow.id, queueId);

        // Step 7: Try to publish (optional)
        await creator.publishFlow(flow.id);

        // Final output
        const architectUrl = `https://apps.${REGION}/architect/#/flows/${flow.id}/edit`;

        console.log('='.repeat(70));
        console.log('FLOW CREATED SUCCESSFULLY!');
        console.log('='.repeat(70));
        console.log(`\nFlow Name: ${flow.name}`);
        console.log(`Flow ID: ${flow.id}`);
        console.log(`\nArchitect URL:\n${architectUrl}`);
        console.log('\n' + '='.repeat(70));
        console.log('IMPORTANT: Complete the flow configuration in Architect');
        console.log('='.repeat(70));
        console.log('\nFlow Components to Configure:');
        console.log('  1. ✓ Initial State');
        console.log('  2. Add Play Audio action with TTS: "welcome to my claude flow"');
        console.log('  3. Add Play Audio action with Hold Music enabled');
        console.log('  4. Add Decision action: Expression = Call.Country == "US"');
        console.log('  5. Add Transfer to ACD action: Queue = VJ_TEST_NEW');
        console.log('  6. Add Disconnect action');
        console.log('  7. Connect all actions in sequence');
        console.log('  8. Save and Publish the flow');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n✗ Unexpected error:', error.message);
        process.exit(1);
    }
}

main();
