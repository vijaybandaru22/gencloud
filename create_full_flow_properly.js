#!/usr/bin/env node
/**
 * Create a fully configured Genesys Cloud flow using proper API methods
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

class GenesysFlowBuilder {
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
                console.log(`✓ Found division: ${divisionName}\n`);
                return division.id;
            }

            console.log(`✗ Division not found\n`);
            return null;
        } catch (error) {
            console.error('✗ Error:', error.message);
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
                console.log(`✓ Found queue: ${queueName}\n`);
                return queues[0].id;
            }

            console.log(`✗ Queue not found\n`);
            return null;
        } catch (error) {
            console.error('✗ Error:', error.message);
            return null;
        }
    }

    async deleteFlow(flowId) {
        if (!flowId) return;

        console.log(`Deleting old flow...`);

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
            console.log('✓ Old flow deleted\n');
        } catch (_error) {
            console.log('Note: Could not delete old flow\n');
        }
    }

    buildCompleteFlowConfiguration(flowName, queueId, divisionId) {
        const initialSequenceId = this.generateUUID();
        const playWelcomeId = this.generateUUID();
        const playHoldId = this.generateUUID();
        const decisionId = this.generateUUID();
        const transferId = this.generateUUID();
        const disconnectId = this.generateUUID();
        const disconnectDefaultId = this.generateUUID();

        return {
            "name": flowName,
            "description": "Flow with welcome message, hold music, US decision, and queue transfer",
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
                    "name": "Main Flow",
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
                    "name": "Play Welcome Message",
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
                    "name": "Play Hold Music",
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
                    "name": "Check if from US",
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
                            "nextActionId": disconnectDefaultId
                        }
                    ]
                },
                {
                    "id": transferId,
                    "name": "Transfer to Queue VJ_TEST_NEW",
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
                    "name": "Disconnect After Transfer",
                    "trackingId": 6,
                    "__type": "Disconnect",
                    "paths": []
                },
                {
                    "id": disconnectDefaultId,
                    "name": "Disconnect Default",
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
    }

    async createFlowWithConfiguration(flowName, divisionId, queueId) {
        console.log(`Creating flow: ${flowName}...`);

        // Step 1: Create the basic flow first
        const basicFlow = {
            name: flowName,
            description: "Flow with welcome message, hold music, US decision, and queue transfer",
            type: "inboundcall",
            division: {
                id: divisionId
            }
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
            console.log(`✓ Basic flow created (ID: ${createdFlow.id})\n`);

            // Step 2: Now save the configuration
            console.log('Saving flow configuration...');
            const fullConfig = this.buildCompleteFlowConfiguration(flowName, queueId, divisionId);

            // Save configuration to file for debugging
            fs.writeFileSync('flow_config_debug.json', JSON.stringify(fullConfig, null, 2));

            postData = JSON.stringify(fullConfig);

            // Try to save configuration using checkin endpoint
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
                console.log('✓ Configuration saved via checkin\n');
                return { ...createdFlow, configured: true };
            } catch (error) {
                console.log(`Note: Checkin failed: ${error.message}`);
                console.log('Trying alternative save method...\n');

                // Try PUT to the flow itself
                options.method = 'PUT';
                options.path = `/api/v2/flows/${createdFlow.id}`;
                options.headers['Content-Length'] = Buffer.byteLength(postData);

                try {
                    await this.makeRequest(options, postData);
                    console.log('✓ Configuration saved via PUT\n');
                    return { ...createdFlow, configured: true };
                } catch (putError) {
                    console.error(`✗ PUT also failed: ${putError.message}\n`);
                    return { ...createdFlow, configured: false };
                }
            }

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
    const OLD_FLOW_ID = '13189c79-04b7-403c-8ab4-9f642da304f3';

    console.log('='.repeat(70));
    console.log('Genesys Cloud Complete Flow Builder');
    console.log('='.repeat(70));
    console.log();

    const builder = new GenesysFlowBuilder(CLIENT_ID, CLIENT_SECRET, REGION);

    if (!await builder.authenticate()) {
        process.exit(1);
    }

    const divisionId = await builder.getDivisionId(DIVISION_NAME);
    if (!divisionId) {
        console.error('Cannot proceed without division');
        process.exit(1);
    }

    const queueId = await builder.getQueueId(QUEUE_NAME);
    if (!queueId) {
        console.error('Cannot proceed without queue');
        process.exit(1);
    }

    await builder.deleteFlow(OLD_FLOW_ID);

    const flow = await builder.createFlowWithConfiguration(FLOW_NAME, divisionId, queueId);

    if (flow) {
        console.log('='.repeat(70));
        if (flow.configured) {
            console.log('SUCCESS! Flow created and configured.');
        } else {
            console.log('PARTIAL: Flow created but configuration may need manual setup.');
        }
        console.log('='.repeat(70));
        console.log();
        console.log(`Flow Name: ${flow.name}`);
        console.log(`Flow ID: ${flow.id}`);
        console.log(`Architect URL: https://apps.${REGION}/architect/#/flows/${flow.id}/edit`);
        console.log();
        console.log('Please open the URL above to verify the flow configuration.');
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
