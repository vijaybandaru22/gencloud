#!/usr/bin/env node
/**
 * Properly Create and Configure Testflow_claude_vj123456
 * This script ensures the flow configuration is properly saved
 */

const https = require('https');
const crypto = require('crypto');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_NAME = 'Testflow_claude_vj123456';
const QUEUE_NAME = 'VJ_TEST_NEW';

class GenesysFlowManager {
    constructor() {
        this.baseUrl = `api.${REGION}`;
        this.accessToken = null;
    }

    generateUUID() {
        return crypto.randomUUID();
    }

    async makeRequest(options, postData = null) {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (_e) {
                            resolve(data);
                        }
                    } else {
                        if (res.statusCode === 404) {
                            resolve(null);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        }
                    }
                });
            });
            req.on('error', (error) => { reject(error); });
            if (postData) req.write(postData);
            req.end();
        });
    }

    async authenticate() {
        console.log('\n✓ Authenticating...');
        const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const postData = 'grant_type=client_credentials';

        const options = {
            hostname: `login.${REGION}`,
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
        console.log('✓ Authenticated successfully\n');
    }

    async getDivisionId(divisionName) {
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
        const division = response.entities.find(d => d.name.toLowerCase() === divisionName.toLowerCase());
        return division ? division.id : null;
    }

    async getQueueId(queueName) {
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
        if (response.entities && response.entities.length > 0) {
            return response.entities[0].id;
        }
        return null;
    }

    async findFlow(flowName) {
        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows?type=inboundcall&pageSize=100`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const response = await this.makeRequest(options);
        const flow = response.entities.find(f => f.name === flowName);
        return flow || null;
    }

    async deleteFlow(flowId) {
        console.log(`✓ Deleting existing flow: ${flowId}...`);
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

        // Wait for deletion to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    async createFlow(flowName, divisionId) {
        console.log(`✓ Creating flow: ${flowName}...`);

        const flowDefinition = {
            name: flowName,
            description: "Voice inbound flow with welcome, hold music, US check, and queue transfer",
            type: "inboundcall",
            division: {
                id: divisionId
            }
        };

        const postData = JSON.stringify(flowDefinition);

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

        const response = await this.makeRequest(options, postData);
        console.log('✓ Flow created successfully');
        console.log(`✓ Flow ID: ${response.id}\n`);
        return response;
    }

    async updateFlowConfiguration(flowId, queueId) {
        console.log(`✓ Configuring flow: ${flowId}...`);

        const configuration = {
            "name": FLOW_NAME,
            "startUpRef": "/inboundCall/states/state_initial",
            "defaultLanguage": "en-us",
            "supportedLanguages": {
                "en-us": {
                    "defaultLanguageSkill": {
                        "noValue": true
                    }
                }
            },
            "initialGreeting": {
                "tts": "welcome to my claude flow"
            },
            "settingsActionDefaults": {
                "playAudioOnSilence": {
                    "timeout": {
                        "noValue": true
                    }
                },
                "callData": {
                    "processingPrompt": {
                        "noValue": true
                    }
                },
                "callBridge": {
                    "processingPrompt": {
                        "noValue": true
                    }
                },
                "callDigitalData": {
                    "processingPrompt": {
                        "noValue": true
                    }
                }
            },
            "states": {
                "state_initial": {
                    "name": "Initial State",
                    "refId": "state_initial",
                    "variables": [],
                    "actions": [
                        {
                            "playAudio": {
                                "name": "Play Welcome Message",
                                "audio": {
                                    "tts": "welcome to my claude flow"
                                }
                            }
                        },
                        {
                            "playAudio": {
                                "name": "Play Hold Music",
                                "audio": {
                                    "holdMusic": {}
                                }
                            }
                        },
                        {
                            "decision": {
                                "name": "Check US Caller",
                                "condition": {
                                    "exp": "Call.Ani.CountryCode == \"US\""
                                },
                                "outputs": {
                                    "yes": {
                                        "actions": [
                                            {
                                                "transferToAcd": {
                                                    "name": "Transfer to VJ_TEST_NEW",
                                                    "targetQueue": {
                                                        "id": queueId,
                                                        "name": QUEUE_NAME
                                                    },
                                                    "preTransferAudio": {
                                                        "noValue": true
                                                    },
                                                    "failureOutputs": {
                                                        "queueNotFound": {
                                                            "actions": [
                                                                {
                                                                    "disconnect": {
                                                                        "name": "Disconnect - Queue Not Found"
                                                                    }
                                                                }
                                                            ]
                                                        },
                                                        "error": {
                                                            "actions": [
                                                                {
                                                                    "disconnect": {
                                                                        "name": "Disconnect - Transfer Error"
                                                                    }
                                                                }
                                                            ]
                                                        }
                                                    }
                                                }
                                            }
                                        ]
                                    },
                                    "no": {
                                        "actions": [
                                            {
                                                "disconnect": {
                                                    "name": "Disconnect - Not US"
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        };

        const postData = JSON.stringify({
            "inboundCall": configuration
        });

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}/configuration`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const response = await this.makeRequest(options, postData);
        console.log('✓ Flow configuration saved successfully\n');

        // Wait a bit for configuration to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        return response;
    }

    async saveFlow(flowId) {
        console.log(`✓ Checking in flow: ${flowId}...`);

        const postData = JSON.stringify({
            "message": "Initial flow configuration"
        });

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}/checkin`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const response = await this.makeRequest(options, postData);
        console.log('✓ Flow checked in successfully\n');
        return response;
    }

    async publishFlow(flowId) {
        console.log(`✓ Publishing flow: ${flowId}...`);

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

        const response = await this.makeRequest(options, postData);
        console.log('✓ Flow published successfully\n');
        return response;
    }

    async run() {
        try {
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('  Creating Genesys Cloud Flow: Testflow_claude_vj123456');
            console.log('  WITH PROPER CONFIGURATION');
            console.log('═══════════════════════════════════════════════════════════════\n');

            await this.authenticate();

            console.log('✓ Looking up division...');
            const divisionId = await this.getDivisionId('Home');
            if (!divisionId) {
                throw new Error('Home division not found');
            }
            console.log(`✓ Division ID: ${divisionId}\n`);

            console.log('✓ Looking up queue...');
            const queueId = await this.getQueueId(QUEUE_NAME);
            if (!queueId) {
                throw new Error(`Queue '${QUEUE_NAME}' not found`);
            }
            console.log(`✓ Queue ID: ${queueId}\n`);

            console.log('✓ Checking if flow exists...');
            const existingFlow = await this.findFlow(FLOW_NAME);

            if (existingFlow) {
                console.log(`✓ Flow exists (ID: ${existingFlow.id})`);
                await this.deleteFlow(existingFlow.id);
            } else {
                console.log('✓ No existing flow found\n');
            }

            const flow = await this.createFlow(FLOW_NAME, divisionId);
            await this.updateFlowConfiguration(flow.id, queueId);
            await this.saveFlow(flow.id);
            await this.publishFlow(flow.id);

            console.log('═══════════════════════════════════════════════════════════════');
            console.log('  ✓ SUCCESS!');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log(`\nFlow Name: ${FLOW_NAME}`);
            console.log(`Flow ID: ${flow.id}`);
            console.log(`Status: Published and Configured`);
            console.log(`\nArchitect URL:`);
            console.log(`https://apps.usw2.pure.cloud/architect/#/flows/${flow.id}/edit\n`);
            console.log('Flow Configuration:');
            console.log('  ✓ Welcome Message: "welcome to my claude flow"');
            console.log('  ✓ Hold Music: Enabled');
            console.log('  ✓ US Check: Call.Ani.CountryCode == "US"');
            console.log('  ✓ Transfer Queue: VJ_TEST_NEW');
            console.log('  ✓ Disconnect: For non-US callers\n');
            console.log('═══════════════════════════════════════════════════════════════\n');

        } catch (error) {
            console.error('\n✗ Error:', error.message);
            console.error('\nFull error details:');
            console.error(error);
            process.exit(1);
        }
    }
}

const manager = new GenesysFlowManager();
manager.run();
