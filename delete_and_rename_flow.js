#!/usr/bin/env node
/**
 * Delete old flow and rename new flow
 */

const https = require('https');

class GenesysFlowManager {
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

    async deleteFlow(flowId, flowName) {
        console.log(`Deleting flow: ${flowName} (${flowId})...`);

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
    const OLD_FLOW_NAME = 'Testflow_vj12345';
    const NEW_FLOW_NAME = 'Testflow_vj12345_NEW';
    const TARGET_NAME = 'Testflow_vj12345';

    console.log('═'.repeat(70));
    console.log('DELETE OLD FLOW AND RENAME NEW FLOW');
    console.log('═'.repeat(70));
    console.log(`\nOld Flow: ${OLD_FLOW_NAME} (will be deleted)`);
    console.log(`New Flow: ${NEW_FLOW_NAME} (will be renamed to ${TARGET_NAME})`);
    console.log('═'.repeat(70));
    console.log();

    const manager = new GenesysFlowManager(CLIENT_ID, CLIENT_SECRET, REGION);

    try {
        // Step 1: Authenticate
        await manager.authenticate();

        // Step 2: Find and delete old flow
        const oldFlow = await manager.findFlow(OLD_FLOW_NAME);
        if (oldFlow) {
            await manager.deleteFlow(oldFlow.id, OLD_FLOW_NAME);
            // Wait for deletion to complete
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.log('Note: Old flow not found (may already be deleted)\n');
        }

        // Step 3: Find new flow
        const newFlow = await manager.findFlow(NEW_FLOW_NAME);
        if (!newFlow) {
            console.log('ERROR: New flow not found. Cannot rename.');
            process.exit(1);
        }

        // Step 4: Get full flow details
        const flowDetails = await manager.getFlow(newFlow.id);

        // Step 5: Rename the flow
        const renamedFlow = await manager.updateFlow(newFlow.id, TARGET_NAME, flowDetails);

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
        console.log('OPERATIONS COMPLETED:');
        console.log('═'.repeat(70));
        console.log(`\n✓ Deleted: ${OLD_FLOW_NAME}`);
        console.log(`✓ Renamed: ${NEW_FLOW_NAME} → ${TARGET_NAME}`);
        console.log('\n═'.repeat(70));
        console.log('NEXT STEPS:');
        console.log('═'.repeat(70));
        console.log('\n1. Open the Architect URL above');
        console.log('2. Configure the flow actions (see instructions below)');
        console.log('3. Validate, Save, and Publish');
        console.log('\nOR import the i3 file: Testflow_vj12345_NEW.i3inboundflow');
        console.log('(You may need to rename it to Testflow_vj12345.i3inboundflow)');
        console.log('═'.repeat(70));

    } catch (error) {
        console.error('\n✗ ERROR:', error.message);
        process.exit(1);
    }
}

main();
