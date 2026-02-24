#!/usr/bin/env node
/**
 * Genesys Cloud Flow Creator with Specific Requirements
 * Creates a flow with welcome message, hold music, decision, and queue transfer
 */

const https = require('https');

class GenesysFlowCreatorAdvanced {
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

        try {
            const response = await this.makeRequest(options, postData);
            this.accessToken = response.access_token;
            console.log('✓ Authentication successful');
            return true;
        } catch (error) {
            console.error('✗ Authentication failed:', error.message);
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

        try {
            const response = await this.makeRequest(options);
            const divisions = response.entities || [];

            const division = divisions.find(d => d.name === divisionName);

            if (division) {
                console.log(`✓ Found division: ${divisionName} (ID: ${division.id})`);
                return division.id;
            }

            console.log(`✗ Division '${divisionName}' not found`);
            console.log('Available divisions:');
            divisions.forEach(d => {
                console.log(`  - ${d.name} (ID: ${d.id})`);
            });
            return null;
        } catch (error) {
            console.error('✗ Error fetching divisions:', error.message);
            return null;
        }
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

        try {
            const response = await this.makeRequest(options);
            const queues = response.entities || [];

            if (queues.length > 0) {
                const queue = queues[0];
                console.log(`✓ Found queue: ${queueName} (ID: ${queue.id})`);
                return queue.id;
            }

            console.log(`✗ Queue '${queueName}' not found`);
            return null;
        } catch (error) {
            console.error('✗ Error fetching queue:', error.message);
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
            console.log('✓ Existing flow deleted');
            return true;
        } catch (_error) {
            console.log('Note: Could not delete existing flow (it may not exist)');
            return false;
        }
    }

    async createFlowWithRequirements(flowName, divisionId, queueId) {
        console.log(`Creating flow: ${flowName} with custom requirements...`);

        // Build the flow configuration based on requirements
        const flowData = {
            name: flowName,
            description: 'Flow with welcome message, hold music, US decision, and queue transfer',
            type: 'inboundcall',
            division: {
                id: divisionId
            },
            inboundCall: {
                name: 'Start',
                refId: 'start_state',
                actions: {
                    playAudioWelcome: {
                        name: 'Play Welcome Message',
                        type: 'PlayAudio',
                        tts: 'welcome to my claude flow',
                        outputs: {
                            success: 'playHoldMusic'
                        }
                    },
                    playHoldMusic: {
                        name: 'Play Hold Music',
                        type: 'PlayAudio',
                        tts: '',
                        holdMusic: true,
                        outputs: {
                            success: 'checkUSLocation'
                        }
                    },
                    checkUSLocation: {
                        name: 'Check if Caller from US',
                        type: 'Decision',
                        conditions: [
                            {
                                name: 'Is from US',
                                expression: 'Call.Country == "US"',
                                output: 'transferToQueue'
                            }
                        ],
                        defaultOutput: 'disconnect'
                    },
                    transferToQueue: {
                        name: 'Transfer to VJ_TEST_NEW Queue',
                        type: 'TransferToAcd',
                        queueId: queueId,
                        outputs: {
                            success: 'disconnect',
                            failure: 'disconnect'
                        }
                    },
                    disconnect: {
                        name: 'Disconnect',
                        type: 'Disconnect'
                    }
                }
            }
        };

        const postData = JSON.stringify(flowData);

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
            console.log('✓ Flow created successfully!');
            console.log(`  Flow Name: ${createdFlow.name}`);
            console.log(`  Flow ID: ${createdFlow.id}`);
            console.log(`  Flow Type: ${createdFlow.type}`);

            const architectUrl = `https://apps.${this.region}/architect/#/flows/${createdFlow.id}/edit`;
            console.log(`  Architect URL: ${architectUrl}`);

            return createdFlow;
        } catch (error) {
            console.error('✗ Error creating flow:', error.message);
            return null;
        }
    }
}

async function main() {
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';
    const FLOW_NAME = 'Testflow_vj12345';
    const DIVISION_NAME = 'Claude_Explortion_Vijay';
    const QUEUE_NAME = 'VJ_TEST_NEW';
    const OLD_FLOW_ID = null; // No old flow to delete

    console.log('='.repeat(70));
    console.log('Genesys Cloud Flow Creator - Advanced Configuration');
    console.log('='.repeat(70));
    console.log('\nFlow Requirements:');
    console.log('  1. Play welcome message: "welcome to my claude flow"');
    console.log('  2. Play hold music');
    console.log('  3. Check if caller is from US');
    console.log('  4. If from US, transfer to Queue: VJ_TEST_NEW');
    console.log('='.repeat(70));
    console.log();

    const creator = new GenesysFlowCreatorAdvanced(CLIENT_ID, CLIENT_SECRET, REGION);

    // Step 1: Authenticate
    if (!await creator.authenticate()) {
        console.log('\nAuthentication failed.');
        process.exit(1);
    }

    console.log();

    // Step 2: Get division ID
    const divisionId = await creator.getDivisionId(DIVISION_NAME);
    if (!divisionId) {
        console.log(`\nCould not find division '${DIVISION_NAME}'. Exiting.`);
        process.exit(1);
    }

    console.log();

    // Step 3: Get queue ID
    const queueId = await creator.getQueueId(QUEUE_NAME);
    if (!queueId) {
        console.log(`\nWarning: Queue '${QUEUE_NAME}' not found.`);
        console.log('The flow will be created, but you may need to update the queue reference manually.');
    }

    console.log();

    // Step 4: Delete old flow if exists
    if (OLD_FLOW_ID) {
        await creator.deleteFlow(OLD_FLOW_ID);
        console.log();
    }

    // Step 5: Create new flow with requirements
    const flow = await creator.createFlowWithRequirements(FLOW_NAME, divisionId, queueId);

    if (flow) {
        console.log('\n' + '='.repeat(70));
        console.log('SUCCESS! Flow has been created with all requirements.');
        console.log('='.repeat(70));
        console.log('\nFlow Components:');
        console.log('  ✓ Welcome Message (TTS): "welcome to my claude flow"');
        console.log('  ✓ Hold Music');
        console.log('  ✓ Decision: Check if caller from US');
        console.log('  ✓ Transfer to Queue: VJ_TEST_NEW');
        console.log('  ✓ Disconnect action');
        console.log('='.repeat(70));
    } else {
        console.log('\n' + '='.repeat(70));
        console.log('FAILED! Could not create flow.');
        console.log('='.repeat(70));
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
