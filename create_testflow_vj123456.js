#!/usr/bin/env node
/**
 * Create Testflow_vj123456 in Genesys Cloud
 */

const https = require('https');
const crypto = require('crypto');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';

class GenesysFlowCreator {
    constructor() {
        this.accessToken = null;
    }

    async makeRequest(options, postData = null) {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    console.log(`  Response Status: ${res.statusCode}`);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const parsed = JSON.parse(data);
                            resolve(parsed);
                        } catch (_e) {
                            resolve(data);
                        }
                    } else {
                        console.error(`  Response Body: ${data}`);
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });
            req.on('error', (error) => { reject(error); });
            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }

    async authenticate() {
        console.log('Authenticating with Genesys Cloud...');
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
        console.log('✓ Authenticated\n');
    }

    async getQueueId(queueName) {
        console.log(`Looking up queue: ${queueName}...`);
        const options = {
            hostname: `api.${REGION}`,
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
        if (queues.length === 0) {
            throw new Error(`Queue '${queueName}' not found`);
        }
        console.log(`✓ Queue found: ${queues[0].id}\n`);
        return queues[0].id;
    }

    async getDivisionId(divisionName) {
        console.log(`Looking up division: ${divisionName}...`);
        const options = {
            hostname: `api.${REGION}`,
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
        if (!division) {
            console.log(`⚠ Division '${divisionName}' not found, using Home division\n`);
            const homeDivision = divisions.find(d => d.name === 'Home');
            return homeDivision ? homeDivision.id : null;
        }
        console.log(`✓ Division found: ${division.id}\n`);
        return division.id;
    }

    generateUUID() {
        return crypto.randomUUID();
    }

    async createFlow(flowName, divisionName, queueName) {
        console.log('='.repeat(70));
        console.log('Creating Genesys Cloud Flow');
        console.log('='.repeat(70));
        console.log();

        await this.authenticate();

        const queueId = await this.getQueueId(queueName);
        const divisionId = await this.getDivisionId(divisionName);

        // Create the flow
        console.log(`Creating flow: ${flowName}...`);
        const flowPayload = {
            name: flowName,
            description: 'Flow with welcome message, hold music, US check, and transfer to queue',
            type: 'inboundcall',
            division: {
                id: divisionId
            }
        };

        const postData = JSON.stringify(flowPayload);
        const options = {
            hostname: `api.${REGION}`,
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
        console.log(`✓ Flow created with ID: ${flow.id}\n`);

        console.log('='.repeat(70));
        console.log('Flow Created Successfully!');
        console.log('='.repeat(70));
        console.log(`Flow Name: ${flow.name}`);
        console.log(`Flow ID: ${flow.id}`);
        console.log(`Flow Type: ${flow.type}`);
        console.log(`Architect URL: https://apps.${REGION}/architect/#/flows/${flow.id}/edit`);
        console.log('='.repeat(70));
        console.log();
        console.log('NEXT STEPS:');
        console.log('1. Open the flow in Architect using the URL above');
        console.log('2. Add the following actions:');
        console.log('   - Play Audio: "welcome to my claude flow"');
        console.log('   - Play Audio: Hold music');
        console.log('   - Decision: Check if caller is from US');
        console.log(`   - Transfer to ACD: Queue "${queueName}" (ID: ${queueId})`);
        console.log('3. Save and publish the flow');
        console.log('='.repeat(70));

        return flow;
    }
}

async function main() {
    try {
        const creator = new GenesysFlowCreator();
        await creator.createFlow('Testflow_vj123456', 'Home', 'VJ_TEST_NEW');
    } catch (error) {
        console.error('\n✗ Error:', error.message);
        process.exit(1);
    }
}

main();
