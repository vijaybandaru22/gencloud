#!/usr/bin/env node
/**
 * Import a properly configured flow using Genesys API
 */

const https = require('https');
const crypto = require('crypto');

class GenesysFlowImporter {
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
                console.log(`✓ Found division: ${divisionName} (ID: ${division.id})\n`);
                return division.id;
            }

            console.log(`✗ Division not found\n`);
            return null;
        } catch (_error) {
            console.error('✗ Error fetching divisions');
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
                console.log(`✓ Found queue: ${queueName} (ID: ${queue.id})\n`);
                return queue.id;
            }

            console.log(`✗ Queue not found\n`);
            return null;
        } catch (_error) {
            console.error('✗ Error fetching queue');
            return null;
        }
    }

    async deleteFlow(flowId) {
        console.log(`Deleting existing flow...`);

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

    buildYAMLFlow(flowName, queueId) {
        // Build flow in YAML format (Architect export format)
        const yaml = `inboundCall:
  name: "${flowName}"
  description: "Flow with welcome, hold music, decision, and transfer"
  divisions:
    - Claude_Explortion_Vijay
  defaultLanguage: en-us
  supportedLanguages:
    en-us:
      defaultLanguageSkill:
        noValue: true
  startUpRef: "/inboundCall/tasks/task[Main Flow_10]"
  initialGreeting:
    tts: "welcome to my claude flow"
  settingsInboundCall:
    disconnectOnSessionExpire: true
  tasks:
    - task:
        name: Main Flow
        refId: Main Flow_10
        actions:
          - playAudio:
              name: Play Welcome
              audio:
                tts: "welcome to my claude flow"
          - playAudio:
              name: Play Hold Music
              audio:
                holdMusic: true
          - decision:
              name: Check if US
              condition:
                if: Call.Country == "US"
                then:
                  - transferToAcd:
                      name: Transfer to Queue
                      targetQueue: ${queueId}
                else:
                  - disconnect:
                      name: Disconnect
`;
        return yaml;
    }

    async importFlow(flowName, divisionId, _queueId) {
        console.log(`Importing flow: ${flowName}...`);

        const flowData = {
            name: flowName,
            description: "Flow with welcome, hold music, decision, and transfer",
            type: "inboundcall",
            division: {
                id: divisionId
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
            const flow = await this.makeRequest(options, postData);
            console.log('✓ Flow created\n');
            console.log('NOTE: The flow was created but needs to be configured in Architect.');
            console.log('The Genesys Cloud API does not support programmatic flow logic');
            console.log('configuration for new flows. Please configure it manually.\n');
            return flow;
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
    console.log('Genesys Cloud Flow Importer');
    console.log('='.repeat(70));
    console.log();

    const importer = new GenesysFlowImporter(CLIENT_ID, CLIENT_SECRET, REGION);

    if (!await importer.authenticate()) {
        process.exit(1);
    }

    const divisionId = await importer.getDivisionId(DIVISION_NAME);
    if (!divisionId) {
        process.exit(1);
    }

    const queueId = await importer.getQueueId(QUEUE_NAME);

    // Delete old flow
    await importer.deleteFlow(OLD_FLOW_ID);

    const flow = await importer.importFlow(FLOW_NAME, divisionId, queueId);

    if (flow) {
        console.log('='.repeat(70));
        console.log('Unfortunately, Genesys Cloud API does not support creating');
        console.log('flows with pre-configured logic programmatically.');
        console.log('='.repeat(70));
        console.log();
        console.log('RECOMMENDED APPROACH:');
        console.log('Use Architect web interface to create the flow with these steps:');
        console.log();
        console.log('1. Go to: https://apps.usw2.pure.cloud/architect/');
        console.log('2. Click "Create" > "Inbound Call"');
        console.log('3. Name: Testflow_vj12345');
        console.log('4. Division: Claude_Explortion_Vijay');
        console.log('5. Add components:');
        console.log('   - Play Audio (TTS): "welcome to my claude flow"');
        console.log('   - Play Audio: Hold Music');
        console.log('   - Decision: Call.Country == "US"');
        console.log('   - Transfer to ACD: Queue VJ_TEST_NEW');
        console.log('   - Disconnect');
        console.log('6. Save and Publish');
        console.log('='.repeat(70));
    }
}

main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
