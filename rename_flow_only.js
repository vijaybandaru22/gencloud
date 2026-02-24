#!/usr/bin/env node
/**
 * Rename the new flow only (skip old flow deletion)
 */

const https = require('https');

class GenesysFlowRenamer {
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

        const response = await this.makeRequest(options, postData);
        this.accessToken = response.access_token;
        console.log('✓ Authentication successful\n');
    }

    async findFlow(flowName) {
        console.log(`Searching for flow: ${flowName}...`);

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

        const response = await this.makeRequest(options);
        const flows = response.entities || [];

        if (flows.length > 0) {
            console.log(`✓ Found flow (ID: ${flows[0].id})\n`);
            return flows[0];
        }

        console.log('✗ Flow not found\n');
        return null;
    }

    async getFlow(flowId) {
        console.log(`Getting flow details: ${flowId}...`);

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const flow = await this.makeRequest(options);
        console.log('✓ Flow details retrieved\n');
        return flow;
    }

    async updateFlow(flowId, newName, currentFlow) {
        console.log(`Renaming flow to: ${newName}...`);

        const updateData = {
            name: newName,
            description: currentFlow.description,
            type: currentFlow.type,
            division: currentFlow.division
        };

        const postData = JSON.stringify(updateData);

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const updatedFlow = await this.makeRequest(options, postData);
        console.log('✓ Flow renamed successfully!\n');
        return updatedFlow;
    }
}

async function main() {
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';
    const CURRENT_NAME = 'Testflow_vj12345_NEW';
    const NEW_NAME = 'Testflow_vj12345';

    console.log('═'.repeat(70));
    console.log('RENAME FLOW');
    console.log('═'.repeat(70));
    console.log(`\nCurrent Name: ${CURRENT_NAME}`);
    console.log(`New Name: ${NEW_NAME}`);
    console.log('═'.repeat(70));
    console.log();

    const renamer = new GenesysFlowRenamer(CLIENT_ID, CLIENT_SECRET, REGION);

    try {
        // Step 1: Authenticate
        await renamer.authenticate();

        // Step 2: Find the flow
        const flow = await renamer.findFlow(CURRENT_NAME);
        if (!flow) {
            console.log('ERROR: Flow not found. Cannot rename.');
            process.exit(1);
        }

        // Step 3: Get full flow details
        const flowDetails = await renamer.getFlow(flow.id);

        // Step 4: Rename the flow
        const renamedFlow = await renamer.updateFlow(flow.id, NEW_NAME, flowDetails);

        const architectUrl = `https://apps.${REGION}/architect/#/flows/${renamedFlow.id}/edit`;

        console.log('═'.repeat(70));
        console.log('SUCCESS! FLOW RENAMED');
        console.log('═'.repeat(70));
        console.log(`\nFlow Name: ${renamedFlow.name}`);
        console.log(`Flow ID: ${renamedFlow.id}`);
        console.log(`Division: Home`);
        console.log(`\nArchitect URL:`);
        console.log(`${architectUrl}`);
        console.log('\n═'.repeat(70));
        console.log('IMPORTANT NOTE:');
        console.log('═'.repeat(70));
        console.log('\nThe old locked flow still exists. To delete it:');
        console.log('1. Go to Architect > Inbound Call Flows');
        console.log('2. Find the OLD "Testflow_vj12345" (locked)');
        console.log('3. Right-click > Delete (once unlocked)');
        console.log('\n═'.repeat(70));
        console.log('NEXT STEPS:');
        console.log('═'.repeat(70));
        console.log('\n1. Open the Architect URL above');
        console.log('2. Import the i3 file or manually configure:');
        console.log('   - Play Audio: "welcome to my claude flow"');
        console.log('   - Play Hold Music');
        console.log('   - Decision: Call.Country == "US"');
        console.log('   - Transfer to ACD: VJ_TEST_NEW');
        console.log('   - Disconnect');
        console.log('3. Validate, Save, and Publish');
        console.log('═'.repeat(70));

    } catch (error) {
        console.error('\n✗ ERROR:', error.message);

        if (error.message.includes('409')) {
            console.log('\n═'.repeat(70));
            console.log('NAME CONFLICT');
            console.log('═'.repeat(70));
            console.log('\nA flow named "Testflow_vj12345" already exists.');
            console.log('Please delete the old flow first from Architect UI:');
            console.log('\n1. Go to Architect > Inbound Call Flows');
            console.log('2. Find "Testflow_vj12345" (the old one)');
            console.log('3. Right-click > Delete');
            console.log('4. Run this script again');
            console.log('═'.repeat(70));
        }

        process.exit(1);
    }
}

main();
