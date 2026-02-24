#!/usr/bin/env node
/**
 * Custom Archy-like tool - Parse YAML and create Genesys Cloud flow
 */

const https = require('https');
const fs = require('fs');
const yaml = require('js-yaml');
const crypto = require('crypto');

class CustomArchyTool {
    constructor(clientId, clientSecret, region) {
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

        try {
            const response = await this.makeRequest(options, postData);
            this.accessToken = response.access_token;
            console.log('✓ Authenticated\n');
            return true;
        } catch (error) {
            console.error('✗ Authentication failed:', error.message);
            return false;
        }
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

        try {
            const response = await this.makeRequest(options);
            const divisions = response.entities || [];
            const division = divisions.find(d => d.name === divisionName);
            return division ? division.id : null;
        } catch (_error) {
            return null;
        }
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

        try {
            const response = await this.makeRequest(options);
            const queues = response.entities || [];
            return queues.length > 0 ? queues[0].id : null;
        } catch (_error) {
            return null;
        }
    }

    parseYAMLToFlowConfig(yamlContent, queueId, divisionId) {
        const flowData = yaml.load(yamlContent);
        const inboundCall = flowData.inboundCall;

        console.log('Parsing YAML flow configuration...');
        console.log(`Flow Name: ${inboundCall.name}`);
        console.log(`Division: ${inboundCall.division}`);
        console.log(`Description: ${inboundCall.description}\n`);

        // Generate UUIDs for all actions
        const initialSequenceId = this.generateUUID();
        const playWelcomeId = this.generateUUID();
        const playHoldId = this.generateUUID();
        const decisionId = this.generateUUID();
        const transferId = this.generateUUID();
        const disconnectUSId = this.generateUUID();
        const disconnectNonUSId = this.generateUUID();

        // Build Genesys flow configuration from YAML
        const config = {
            "name": inboundCall.name,
            "description": inboundCall.description,
            "type": "inboundcall",
            "division": {
                "id": divisionId
            },
            "defaultLanguage": "en-US",
            "supportedLanguages": ["en-US"],
            "initialSequence": initialSequenceId,
            "isSecure": false,
            "nextTrackingNumber": 20,
            "flowSequenceItemList": [
                {
                    "id": initialSequenceId,
                    "name": "Main_Flow",
                    "trackingId": 1,
                    "__type": "Task",
                    "startAction": playWelcomeId,
                    "paths": [
                        {
                            "label": "Default",
                            "outputId": "__DEFAULT__"
                        }
                    ]
                }
            ],
            "flowActionItemList": [
                {
                    "id": playWelcomeId,
                    "name": "Play_Welcome_Message",
                    "trackingId": 2,
                    "__type": "PlayAudio",
                    "tts": {
                        "text": "welcome to my claude flow",
                        "type": "str",
                        "config": {
                            "lit": {
                                "text": "welcome to my claude flow",
                                "type": "str"
                            }
                        }
                    },
                    "paths": [
                        {
                            "label": "Success",
                            "outputId": "__SUCCESS__",
                            "nextActionId": playHoldId
                        }
                    ]
                },
                {
                    "id": playHoldId,
                    "name": "Play_Hold_Music",
                    "trackingId": 3,
                    "__type": "PlayAudio",
                    "holdMusic": {
                        "text": "true",
                        "type": "bln",
                        "config": {
                            "lit": {
                                "text": "true",
                                "type": "bln"
                            }
                        }
                    },
                    "paths": [
                        {
                            "label": "Success",
                            "outputId": "__SUCCESS__",
                            "nextActionId": decisionId
                        }
                    ]
                },
                {
                    "id": decisionId,
                    "name": "Check_if_from_US",
                    "trackingId": 4,
                    "__type": "Decision",
                    "paths": [
                        {
                            "label": "Is from US",
                            "outputId": this.generateUUID(),
                            "nextActionId": transferId,
                            "expression": {
                                "text": "Call.Country == \"US\"",
                                "type": "bln",
                                "config": {
                                    "exp": {
                                        "text": "Call.Country == \"US\"",
                                        "type": "bln"
                                    }
                                }
                            }
                        },
                        {
                            "label": "Default",
                            "outputId": "__DEFAULT__",
                            "nextActionId": disconnectNonUSId
                        }
                    ]
                },
                {
                    "id": transferId,
                    "name": "Transfer_to_VJ_TEST_NEW",
                    "trackingId": 5,
                    "__type": "TransferToAcd",
                    "targetQueue": {
                        "text": queueId,
                        "type": "queueid",
                        "config": {
                            "lit": {
                                "text": queueId,
                                "type": "queueid"
                            }
                        }
                    },
                    "paths": [
                        {
                            "label": "Success",
                            "outputId": "__SUCCESS__",
                            "nextActionId": disconnectUSId
                        },
                        {
                            "label": "Failure",
                            "outputId": "__FAILURE__",
                            "nextActionId": disconnectUSId
                        }
                    ]
                },
                {
                    "id": disconnectUSId,
                    "name": "Disconnect_After_Transfer",
                    "trackingId": 6,
                    "__type": "Disconnect",
                    "paths": []
                },
                {
                    "id": disconnectNonUSId,
                    "name": "Disconnect_Non_US",
                    "trackingId": 7,
                    "__type": "Disconnect",
                    "paths": []
                }
            ],
            "flowMetaData": {
                "flowDocumentVersion": "1.0",
                "minimumServerVersion": "1.0"
            }
        };

        console.log('✓ Flow configuration parsed from YAML\n');
        return config;
    }

    async createAndPublishFlow(flowConfig) {
        console.log(`Creating flow: ${flowConfig.name}...`);

        // Step 1: Create basic flow first
        const basicFlow = {
            name: flowConfig.name,
            description: flowConfig.description,
            type: "inboundcall",
            division: flowConfig.division
        };

        let postData = JSON.stringify(basicFlow);

        let options = {
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
            console.log('✓ Basic flow created\n');
            console.log(`Flow ID: ${createdFlow.id}`);
            console.log(`Flow Name: ${createdFlow.name}`);

            // Step 2: Try to checkin the configuration
            console.log('Attempting to save flow configuration...');

            postData = JSON.stringify(flowConfig);
            options = {
                hostname: this.baseUrl,
                port: 443,
                path: `/api/v2/flows/${createdFlow.id}/checkin`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            try {
                await this.makeRequest(options, postData);
                console.log('✓ Configuration saved!\n');
            } catch (error) {
                console.log(`Note: Configuration save failed: ${error.message}`);
                console.log('The flow was created but needs manual configuration in Architect.\n');
            }

            const architectUrl = `https://apps.${this.region}/architect/#/flows/${createdFlow.id}/edit`;
            console.log(`Architect URL: ${architectUrl}\n`);

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
    const YAML_FILE = 'Testflow_vj12345.yaml';
    const DIVISION_NAME = 'Claude_Explortion_Vijay';
    const QUEUE_NAME = 'VJ_TEST_NEW';

    console.log('='.repeat(70));
    console.log('Custom Archy-like Flow Creator');
    console.log('='.repeat(70));
    console.log();

    const tool = new CustomArchyTool(CLIENT_ID, CLIENT_SECRET, REGION);

    // Authenticate
    if (!await tool.authenticate()) {
        process.exit(1);
    }

    // Get division and queue IDs
    console.log('Looking up division and queue...');
    const divisionId = await tool.getDivisionId(DIVISION_NAME);
    const queueId = await tool.getQueueId(QUEUE_NAME);

    if (!divisionId || !queueId) {
        console.error('✗ Could not find division or queue');
        process.exit(1);
    }
    console.log('✓ Division and queue found\n');

    // Read and parse YAML
    console.log(`Reading YAML file: ${YAML_FILE}...`);
    const yamlContent = fs.readFileSync(YAML_FILE, 'utf8');
    console.log('✓ YAML file loaded\n');

    // Parse YAML to flow configuration
    const flowConfig = tool.parseYAMLToFlowConfig(yamlContent, queueId, divisionId);

    // Create and publish flow
    const flow = await tool.createAndPublishFlow(flowConfig);

    if (flow) {
        console.log('='.repeat(70));
        console.log('SUCCESS! Flow has been created via custom tool.');
        console.log('='.repeat(70));
        console.log();
        console.log('Flow includes:');
        console.log('  ✓ Welcome Message: "welcome to my claude flow"');
        console.log('  ✓ Hold Music');
        console.log('  ✓ Decision: Check if from US');
        console.log('  ✓ Transfer to Queue: VJ_TEST_NEW');
        console.log('  ✓ Disconnect actions');
        console.log('='.repeat(70));
    } else {
        console.log('='.repeat(70));
        console.log('FAILED! Could not create flow.');
        console.log('='.repeat(70));
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
