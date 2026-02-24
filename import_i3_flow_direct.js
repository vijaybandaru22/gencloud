#!/usr/bin/env node
/**
 * Import i3inboundflow file directly to Genesys Cloud
 */

const https = require('https');
const fs = require('fs');

class GenesysFlowImporter {
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
        console.log(`Searching for existing flow: ${flowName}...`);

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

        try {
            const response = await this.makeRequest(options);
            const flows = response.entities || [];

            if (flows.length > 0) {
                console.log(`✓ Found existing flow (ID: ${flows[0].id})\n`);
                return flows[0];
            }

            console.log('✗ Flow not found\n');
            return null;
        } catch (error) {
            console.log('✗ Error searching:', error.message);
            return null;
        }
    }

    async unlockFlow(flowId) {
        console.log(`Attempting to unlock flow: ${flowId}...`);

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}/checkin`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': 0
            }
        };

        try {
            await this.makeRequest(options, '');
            console.log('✓ Flow unlocked successfully\n');
            return true;
        } catch (_error) {
            console.log('Note: Could not unlock flow (may not be locked)\n');
            return false;
        }
    }

    async deleteFlow(flowId) {
        console.log(`Deleting existing flow: ${flowId}...`);

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
            console.log('✓ Flow deleted successfully\n');
            return true;
        } catch (error) {
            console.log('✗ Could not delete flow:', error.message);
            return false;
        }
    }

    async importI3Flow(i3FilePath) {
        console.log(`Reading i3 flow file: ${i3FilePath}...`);

        const flowContent = fs.readFileSync(i3FilePath, 'utf8');
        const _flowData = JSON.parse(flowContent);
        console.log('✓ Flow file loaded\n');

        console.log('Importing flow to Genesys Cloud...');

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: '/api/v2/architect/flows/import',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(flowContent)
            }
        };

        try {
            const result = await this.makeRequest(options, flowContent);
            console.log('✓ Flow imported successfully!\n');
            return result;
        } catch (error) {
            console.log('✗ Import failed:', error.message);
            throw error;
        }
    }

    async updateFlowConfiguration(flowId, i3FilePath) {
        console.log(`Updating flow configuration: ${flowId}...`);

        const flowContent = fs.readFileSync(i3FilePath, 'utf8');

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}/latestconfiguration`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(flowContent)
            }
        };

        try {
            const result = await this.makeRequest(options, flowContent);
            console.log('✓ Flow configuration updated!\n');
            return result;
        } catch (error) {
            console.log('✗ Update failed:', error.message);
            return null;
        }
    }
}

async function main() {
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';
    const I3_FILE = 'Testflow_vj12345_complete.i3inboundflow';
    const FLOW_NAME = 'Testflow_vj12345';

    console.log('═'.repeat(70));
    console.log('GENESYS CLOUD - IMPORT I3 FLOW');
    console.log('═'.repeat(70));
    console.log(`\nFlow File: ${I3_FILE}`);
    console.log(`Flow Name: ${FLOW_NAME}`);
    console.log(`Region: ${REGION}`);
    console.log('═'.repeat(70));
    console.log();

    const importer = new GenesysFlowImporter(CLIENT_ID, CLIENT_SECRET, REGION);

    try {
        // Step 1: Authenticate
        await importer.authenticate();

        // Step 2: Check if flow exists
        const existingFlow = await importer.findFlow(FLOW_NAME);

        if (existingFlow) {
            console.log('Existing flow found. Options:');
            console.log('  1. Try to unlock and delete');
            console.log('  2. Try to update configuration\n');

            // Try to unlock
            await importer.unlockFlow(existingFlow.id);

            // Try to delete
            const deleted = await importer.deleteFlow(existingFlow.id);

            if (!deleted) {
                console.log('\n═'.repeat(70));
                console.log('CANNOT DELETE EXISTING FLOW');
                console.log('═'.repeat(70));
                console.log('\nThe flow is locked or cannot be deleted.');
                console.log('\nPlease:');
                console.log('  1. Close the flow in Architect UI');
                console.log('  2. Delete it manually, or');
                console.log('  3. Rename your flow in the i3 file');
                console.log('\nThen run this script again.');
                console.log('═'.repeat(70));
                process.exit(1);
            }

            // Wait a moment for deletion to complete
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Step 3: Import the flow
        console.log('Importing flow from i3 file...');
        const result = await importer.importI3Flow(I3_FILE);

        const architectUrl = `https://apps.${REGION}/architect/#/flows/${result.id || 'FLOW_ID'}/edit`;

        console.log('═'.repeat(70));
        console.log('SUCCESS! FLOW IMPORTED');
        console.log('═'.repeat(70));
        console.log('\nFlow Details:');
        console.log(`  Name: ${FLOW_NAME}`);
        if (result.id) {
            console.log(`  Flow ID: ${result.id}`);
            console.log(`\n  Architect URL: ${architectUrl}`);
        }
        console.log('\n═'.repeat(70));
        console.log('NEXT STEPS:');
        console.log('═'.repeat(70));
        console.log('\n1. Open the flow in Architect');
        console.log('2. Validate the flow configuration');
        console.log('3. Save and Publish the flow');
        console.log('\n═'.repeat(70));

    } catch (error) {
        console.error('\n✗ ERROR:', error.message);
        console.log('\n═'.repeat(70));
        console.log('IMPORT FAILED');
        console.log('═'.repeat(70));
        console.log('\nGenesys Cloud API may not support direct i3 import.');
        console.log('Please use the Architect UI to import the i3 file:');
        console.log('\n1. Go to Architect > Inbound Call Flows');
        console.log('2. Click "Import"');
        console.log(`3. Select file: ${I3_FILE}`);
        console.log('4. Follow the import wizard');
        console.log('═'.repeat(70));
        process.exit(1);
    }
}

main();
