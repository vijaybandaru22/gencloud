#!/usr/bin/env node
/**
 * Update flow with proper configuration based on template
 */

const https = require('https');
const crypto = require('crypto');

class GenesysFlowConfigurator {
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
        console.log('Authenticating...');

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
                console.log(`✓ Found queue: ${queueName} (ID: ${queue.id})\n`);
                return queue.id;
            }

            console.log(`✗ Queue '${queueName}' not found\n`);
            return null;
        } catch (error) {
            console.error('✗ Error fetching queue:', error.message);
            return null;
        }
    }

    buildFlowConfiguration(queueId) {
        // Generate UUIDs for all components
        const initialSequenceId = this.generateUUID();
        const playWelcomeId = this.generateUUID();
        const playHoldMusicId = this.generateUUID();
        const decisionId = this.generateUUID();
        const transferId = this.generateUUID();
        const disconnectId = this.generateUUID();

        // Build proper flow configuration based on Architect format
        const config = {
            "defaultLanguage": "en-US",
            "description": "Flow with welcome message, hold music, US decision, and queue transfer",
            "initialSequence": initialSequenceId,
            "name": "Testflow_vj123456",
            "nextTrackingNumber": 10,
            "supportedLanguages": ["en-US"],
            "type": "inboundcall",
            "isSecure": false,
            "flowSequenceItemList": [
                {
                    "id": initialSequenceId,
                    "name": "Main Flow",
                    "trackingId": 1,
                    "startAction": playWelcomeId,
                    "__type": "Task",
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
                    "name": "Play Welcome Message",
                    "trackingId": 2,
                    "__type": "PlayAudio",
                    "tts": {
                        "config": {
                            "lit": {
                                "text": "welcome to my claude flow",
                                "type": "str"
                            }
                        },
                        "text": "welcome to my claude flow",
                        "type": "str"
                    },
                    "paths": [
                        {
                            "label": "Success",
                            "outputId": "__SUCCESS__",
                            "nextActionId": playHoldMusicId
                        }
                    ]
                },
                {
                    "id": playHoldMusicId,
                    "name": "Play Hold Music",
                    "trackingId": 3,
                    "__type": "PlayAudio",
                    "holdMusic": {
                        "config": {
                            "lit": {
                                "text": "true",
                                "type": "bln"
                            }
                        },
                        "text": "true",
                        "type": "bln"
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
                    "name": "Check if from US",
                    "trackingId": 4,
                    "__type": "Decision",
                    "paths": [
                        {
                            "label": "Is from US",
                            "outputId": this.generateUUID(),
                            "nextActionId": transferId,
                            "expression": {
                                "config": {
                                    "exp": {
                                        "text": "Call.Country == \"US\"",
                                        "type": "bln"
                                    }
                                },
                                "text": "Call.Country == \"US\"",
                                "type": "bln"
                            }
                        },
                        {
                            "label": "Default",
                            "outputId": "__DEFAULT__",
                            "nextActionId": disconnectId
                        }
                    ]
                },
                {
                    "id": transferId,
                    "name": "Transfer to Queue",
                    "trackingId": 5,
                    "__type": "TransferToAcd",
                    "targetQueue": {
                        "config": {
                            "lit": {
                                "text": queueId || "QUEUE_ID_HERE",
                                "type": "queueid"
                            }
                        },
                        "text": queueId || "QUEUE_ID_HERE",
                        "type": "queueid"
                    },
                    "paths": [
                        {
                            "label": "Success",
                            "outputId": "__SUCCESS__",
                            "nextActionId": disconnectId
                        },
                        {
                            "label": "Failure",
                            "outputId": "__FAILURE__",
                            "nextActionId": disconnectId
                        }
                    ]
                },
                {
                    "id": disconnectId,
                    "name": "Disconnect",
                    "trackingId": 6,
                    "__type": "Disconnect",
                    "paths": []
                }
            ],
            "flowMetaData": {
                "flowDocumentVersion": "1.0",
                "minimumServerVersion": "1.0"
            }
        };

        return config;
    }

    async updateFlowConfiguration(flowId, config) {
        console.log('Updating flow configuration...');

        const postData = JSON.stringify(config);

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

        try {
            const result = await this.makeRequest(options, postData);
            console.log('✓ Flow configuration updated successfully!\n');
            return result;
        } catch (error) {
            console.error('✗ Error updating flow configuration:', error.message);
            return null;
        }
    }
}

async function main() {
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';
    const FLOW_ID = '2920d834-0ffe-4534-b1f8-48b3a9675dbd';
    const QUEUE_NAME = 'VJ_TEST_NEW';

    console.log('='.repeat(70));
    console.log('Genesys Cloud Flow Configurator');
    console.log('='.repeat(70));
    console.log();

    const configurator = new GenesysFlowConfigurator(CLIENT_ID, CLIENT_SECRET, REGION);

    if (!await configurator.authenticate()) {
        process.exit(1);
    }

    const queueId = await configurator.getQueueId(QUEUE_NAME);

    console.log('Building flow configuration...');
    const config = configurator.buildFlowConfiguration(queueId);
    console.log('✓ Configuration built\n');

    const result = await configurator.updateFlowConfiguration(FLOW_ID, config);

    if (result) {
        console.log('='.repeat(70));
        console.log('SUCCESS! Flow is now properly configured.');
        console.log('='.repeat(70));
        console.log();
        console.log('Flow URL:');
        console.log(`https://apps.${REGION}/architect/#/flows/${FLOW_ID}/edit`);
        console.log();
        console.log('Flow includes:');
        console.log('  ✓ Welcome Message: "welcome to my claude flow"');
        console.log('  ✓ Hold Music');
        console.log('  ✓ Decision: Check if from US');
        console.log('  ✓ Transfer to Queue: VJ_TEST_NEW');
        console.log('  ✓ Disconnect');
        console.log('='.repeat(70));
    } else {
        console.log('='.repeat(70));
        console.log('FAILED! Could not configure flow.');
        console.log('='.repeat(70));
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
