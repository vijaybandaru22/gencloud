#!/usr/bin/env node
/**
 * Create a fresh new flow with requirements - bypass locked flow
 */

const https = require('https');
const fs = require('fs');
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

    async createFlow(flowName, divisionId) {
        console.log(`Creating flow: ${flowName}...`);

        const flowConfig = {
            name: flowName,
            description: 'Claude Flow: Welcome message, hold music, US location check, transfer to VJ_TEST_NEW queue',
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
        console.log(`  Flow Name: ${createdFlow.name}\n`);

        return createdFlow;
    }

    async saveI3Flow(flowName, flowId, queueName, queueId, divisionName) {
        console.log('Creating complete i3 flow file...');

        const i3Content = {
            "inboundCall": {
                "name": flowName,
                "division": divisionName,
                "description": "Flow with welcome message, hold music, US decision, and queue transfer to VJ_TEST_NEW",
                "startUpRef": "/inboundCall/states/state[Initial_State]",
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
                "variables": [],
                "settingsErrorHandling": {
                    "errorHandling": {
                        "disconnect": {
                            "none": true
                        }
                    }
                },
                "states": {
                    "state": [
                        {
                            "name": "Initial_State",
                            "refId": "Initial_State",
                            "actions": {
                                "action": [
                                    {
                                        "playAudio": {
                                            "name": "Play_Welcome_Message",
                                            "audio": {
                                                "tts": {
                                                    "defaultLanguage": "en-us",
                                                    "ttsString": {
                                                        "lit": "welcome to my claude flow"
                                                    }
                                                }
                                            },
                                            "outputs": {
                                                "success": "/inboundCall/states/state[Initial_State]/actions/action[Play_Hold_Music]"
                                            }
                                        }
                                    },
                                    {
                                        "playAudio": {
                                            "name": "Play_Hold_Music",
                                            "audio": {
                                                "holdMusic": {
                                                    "none": true
                                                }
                                            },
                                            "outputs": {
                                                "success": "/inboundCall/states/state[Initial_State]/actions/action[Check_US_Location]"
                                            }
                                        }
                                    },
                                    {
                                        "decision": {
                                            "name": "Check_US_Location",
                                            "conditions": {
                                                "case": [
                                                    {
                                                        "name": "Is_From_US",
                                                        "condition": {
                                                            "exp": "Call.Country == \"US\""
                                                        },
                                                        "actions": {
                                                            "action": [
                                                                {
                                                                    "jumpToAction": {
                                                                        "targetAction": "/inboundCall/states/state[Initial_State]/actions/action[Transfer_To_Queue]"
                                                                    }
                                                                }
                                                            ]
                                                        }
                                                    }
                                                ],
                                                "default": {
                                                    "actions": {
                                                        "action": [
                                                            {
                                                                "jumpToAction": {
                                                                    "targetAction": "/inboundCall/states/state[Initial_State]/actions/action[Disconnect_Call]"
                                                                }
                                                            }
                                                        ]
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    {
                                        "transferToAcd": {
                                            "name": "Transfer_To_Queue",
                                            "targetQueue": {
                                                "lit": queueName
                                            },
                                            "targetQueueId": queueId,
                                            "outputs": {
                                                "success": "/inboundCall/states/state[Initial_State]/actions/action[Disconnect_Call]",
                                                "failure": "/inboundCall/states/state[Initial_State]/actions/action[Disconnect_Call]",
                                                "timeout": "/inboundCall/states/state[Initial_State]/actions/action[Disconnect_Call]"
                                            }
                                        }
                                    },
                                    {
                                        "disconnect": {
                                            "name": "Disconnect_Call"
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        };

        const filename = `${flowName}.i3inboundflow`;
        fs.writeFileSync(filename, JSON.stringify(i3Content, null, 2));
        console.log(`✓ i3 flow file saved: ${filename}\n`);
        return filename;
    }
}

async function main() {
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';
    const FLOW_NAME = 'Testflow_vj12345_NEW';  // Different name to avoid conflict
    const DIVISION_NAME = 'Home';
    const QUEUE_NAME = 'VJ_TEST_NEW';

    console.log('═'.repeat(70));
    console.log('CREATE FRESH GENESYS FLOW - READY TO USE');
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
    console.log('═'.repeat(70));
    console.log();

    const creator = new GenesysFlowCreator(CLIENT_ID, CLIENT_SECRET, REGION);

    try {
        // Step 1: Authenticate
        await creator.authenticate();

        // Step 2: Get division ID
        const divisionId = await creator.getDivisionId(DIVISION_NAME);
        if (!divisionId) {
            console.log(`ERROR: Could not find division '${DIVISION_NAME}'.`);
            process.exit(1);
        }

        // Step 3: Get queue ID
        const queueId = await creator.getQueueId(QUEUE_NAME);
        if (!queueId) {
            console.log(`ERROR: Could not find queue '${QUEUE_NAME}'.`);
            process.exit(1);
        }

        // Step 4: Create the flow
        const flow = await creator.createFlow(FLOW_NAME, divisionId);

        // Step 5: Save i3 flow file for reference
        const i3File = await creator.saveI3Flow(FLOW_NAME, flow.id, QUEUE_NAME, queueId, DIVISION_NAME);

        const architectUrl = `https://apps.${REGION}/architect/#/flows/${flow.id}/edit`;

        console.log('═'.repeat(70));
        console.log('SUCCESS! FLOW CREATED');
        console.log('═'.repeat(70));
        console.log(`\nFlow Name: ${flow.name}`);
        console.log(`Flow ID: ${flow.id}`);
        console.log(`Division: ${DIVISION_NAME}`);
        console.log(`\nArchitect URL:`);
        console.log(`${architectUrl}`);
        console.log(`\ni3 Flow File: ${i3File}`);
        console.log('\n═'.repeat(70));
        console.log('NEXT STEPS: CONFIGURE IN ARCHITECT');
        console.log('═'.repeat(70));
        console.log('\n1. Open the Architect URL above');
        console.log('\n2. Add the following actions in sequence:');
        console.log('   a) Play Audio → TTS: "welcome to my claude flow"');
        console.log('   b) Play Audio → Enable "Play hold music"');
        console.log('   c) Decision → Expression: Call.Country == "US"');
        console.log('   d) Transfer to ACD → Queue: VJ_TEST_NEW');
        console.log('   e) Disconnect');
        console.log('\n3. Connect all actions in the flow');
        console.log('\n4. Validate, Save, and Publish');
        console.log('\nOR use the i3 file to import the complete configuration.');
        console.log('═'.repeat(70));

    } catch (error) {
        console.error('\n✗ ERROR:', error.message);
        process.exit(1);
    }
}

main();
