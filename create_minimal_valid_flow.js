#!/usr/bin/env node
/**
 * Create a minimal but valid flow that opens in Architect
 */

const https = require('https');
const crypto = require('crypto');

class MinimalFlowCreator {
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
                res.on('data', (chunk) => { data += chunk; });
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
            req.on('error', (error) => { reject(error); });
            if (postData) req.write(postData);
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

        const response = await this.makeRequest(options, postData);
        this.accessToken = response.access_token;
        console.log('✓ Authenticated\n');
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
        const divisions = response.entities || [];
        const division = divisions.find(d => d.name === divisionName);
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
        const queues = response.entities || [];
        return queues.length > 0 ? queues[0].id : null;
    }

    async deleteFlow(flowId) {
        console.log('Deleting old flow...');
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
            console.log('Note: No old flow to delete\n');
        }
    }

    buildMinimalValidConfig(flowName, divisionId, queueId) {
        const taskId = this.generateUUID();
        const playAudioId = this.generateUUID();
        const playHoldId = this.generateUUID();
        const decisionId = this.generateUUID();
        const transferId = this.generateUUID();
        const disconnectId = this.generateUUID();
        const disconnectDefaultId = this.generateUUID();
        const decisionOutputId = this.generateUUID();

        return {
            "defaultLanguage": "en-US",
            "description": "Flow with welcome message, hold music, US decision, and queue transfer",
            "initialSequence": taskId,
            "name": flowName,
            "nextTrackingNumber": 10,
            "supportedLanguages": ["en-US"],
            "type": "inboundcall",
            "isSecure": false,
            "flowSequenceItemList": [
                {
                    "id": taskId,
                    "name": "Main Flow",
                    "trackingId": 1,
                    "startAction": playAudioId,
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
                    "id": playAudioId,
                    "name": "Welcome Message",
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
                            "nextActionId": playHoldId
                        }
                    ]
                },
                {
                    "id": playHoldId,
                    "name": "Hold Music",
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
                    "name": "Check US",
                    "trackingId": 4,
                    "__type": "Decision",
                    "paths": [
                        {
                            "label": "From US",
                            "outputId": decisionOutputId,
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
                            "nextActionId": disconnectDefaultId
                        }
                    ]
                },
                {
                    "id": transferId,
                    "name": "Transfer to VJ_TEST_NEW",
                    "trackingId": 5,
                    "__type": "TransferToAcd",
                    "targetQueue": {
                        "config": {
                            "lit": {
                                "text": queueId,
                                "type": "queueid"
                            }
                        },
                        "text": queueId,
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

    async createFlowViaCheckin(flowName, divisionId, queueId) {
        console.log(`Creating flow: ${flowName}...`);

        // Step 1: Create empty flow
        let postData = JSON.stringify({
            name: flowName,
            description: "Flow with welcome, hold music, decision, and transfer",
            type: "inboundcall",
            division: { id: divisionId }
        });

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

        const flow = await this.makeRequest(options, postData);
        console.log(`✓ Flow shell created (ID: ${flow.id})\n`);

        // Step 2: Build configuration and save it
        console.log('Saving configuration...');
        const config = this.buildMinimalValidConfig(flowName, divisionId, queueId);

        postData = JSON.stringify(config);
        options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flow.id}`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        try {
            const updated = await this.makeRequest(options, postData);
            console.log('✓ Configuration saved!\n');
            return updated;
        } catch (error) {
            console.error(`✗ Configuration save failed: ${error.message}\n`);
            return flow;
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
    const OLD_FLOW_ID = 'f7b2f3b5-3584-4267-aef1-58f8bb3365ef';

    console.log('='.repeat(70));
    console.log('Minimal Valid Flow Creator');
    console.log('='.repeat(70));
    console.log();

    const creator = new MinimalFlowCreator(CLIENT_ID, CLIENT_SECRET, REGION);

    await creator.authenticate();

    console.log('Looking up division and queue...');
    const divisionId = await creator.getDivisionId(DIVISION_NAME);
    const queueId = await creator.getQueueId(QUEUE_NAME);
    console.log('✓ Division and queue found\n');

    await creator.deleteFlow(OLD_FLOW_ID);

    const flow = await creator.createFlowViaCheckin(FLOW_NAME, divisionId, queueId);

    console.log('='.repeat(70));
    console.log('Flow Created:');
    console.log(`  Name: ${flow.name}`);
    console.log(`  ID: ${flow.id}`);
    console.log(`  URL: https://apps.${REGION}/architect/#/flows/${flow.id}/edit`);
    console.log('='.repeat(70));
    console.log();
    console.log('Try opening the flow now in Architect.');
    console.log('If it still shows an error, the YAML import is the only option.');
    console.log('='.repeat(70));
}

main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
});
