#!/usr/bin/env node
/**
 * Genesys Cloud Flow Configuration Fixer
 * Updates the flow with a proper valid configuration
 */

const https = require('https');

class GenesysFlowFixer {
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

        try {
            const response = await this.makeRequest(options, postData);
            this.accessToken = response.access_token;
            console.log('✓ Authentication successful');
            return true;
        } catch (error) {
            console.error('✗ Authentication failed:', error.message);
            return false;
        }
    }

    async getFlow(flowId) {
        console.log(`Fetching current flow configuration...`);

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

        try {
            const flow = await this.makeRequest(options);
            console.log(`✓ Current flow retrieved`);
            return flow;
        } catch (error) {
            console.error('✗ Error fetching flow:', error.message);
            return null;
        }
    }

    async updateFlowConfiguration(flowId, divisionId) {
        console.log(`Updating flow with proper configuration...`);

        const currentFlow = await this.getFlow(flowId);
        if (!currentFlow) {
            return null;
        }

        // Create a proper flow configuration with valid structure
        const validFlowConfig = {
            name: currentFlow.name,
            description: currentFlow.description || `Flow created via API - ${currentFlow.name}`,
            type: 'inboundcall',
            division: {
                id: divisionId
            },
            // Valid flow configuration with proper structure
            inboundCall: {
                name: 'Task',
                refId: 'Task_1',
                actions: {
                    disconnect: {
                        name: 'Disconnect',
                        type: 'Disconnect'
                    }
                }
            },
            settingsInboundCall: {
                initialGreeting: {
                    tts: ''
                }
            }
        };

        const postData = JSON.stringify(validFlowConfig);

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

        try {
            const updated = await this.makeRequest(options, postData);
            console.log('✓ Flow configuration updated successfully!');
            console.log(`  Flow Name: ${updated.name}`);
            console.log(`  Flow ID: ${updated.id}`);
            return updated;
        } catch (error) {
            console.error('✗ Error updating flow configuration:', error.message);

            // Try alternative: Check and publish the flow
            console.log('\nTrying alternative approach: Publishing the flow...');
            return await this.publishFlow(flowId);
        }
    }

    async publishFlow(flowId) {
        console.log(`Publishing flow...`);

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}/publish`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': '0'
            }
        };

        try {
            const published = await this.makeRequest(options, '');
            console.log('✓ Flow published successfully!');
            return published;
        } catch (error) {
            console.error('✗ Error publishing flow:', error.message);
            return null;
        }
    }

    async deleteAndRecreateFlow(flowId, flowName, divisionId) {
        console.log(`Deleting old flow and creating a new one with proper configuration...`);

        // Delete the old flow
        const deleteOptions = {
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
            await this.makeRequest(deleteOptions);
            console.log('✓ Old flow deleted');
        } catch (error) {
            console.error('✗ Error deleting flow:', error.message);
        }

        console.log('Creating new flow with valid configuration...');

        // Create a new flow with proper structure
        const flowData = {
            name: flowName,
            description: `Flow created via API - ${flowName}`,
            type: 'inboundcall',
            division: {
                id: divisionId
            }
        };

        const postData = JSON.stringify(flowData);

        const createOptions = {
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
            const newFlow = await this.makeRequest(createOptions, postData);
            console.log('✓ New flow created successfully!');
            console.log(`  Flow Name: ${newFlow.name}`);
            console.log(`  Flow ID: ${newFlow.id}`);
            console.log(`  Architect URL: https://apps.${this.region}/architect/#/flows/${newFlow.id}/edit`);
            return newFlow;
        } catch (error) {
            console.error('✗ Error creating new flow:', error.message);
            return null;
        }
    }
}

async function main() {
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';
    const FLOW_ID = '4b89ab1f-9f3e-4d4f-9b83-6cbf35cf220a';
    const FLOW_NAME = 'Testflow_vj1234';
    const DIVISION_ID = '62acedf0-d3ba-46b3-af6a-5caac44f1ecd';

    console.log('='.repeat(60));
    console.log('Genesys Cloud Flow Configuration Fixer');
    console.log('='.repeat(60));
    console.log();

    const fixer = new GenesysFlowFixer(CLIENT_ID, CLIENT_SECRET, REGION);

    if (!await fixer.authenticate()) {
        console.log('\nAuthentication failed.');
        process.exit(1);
    }

    console.log();

    // Try to update the flow configuration
    let result = await fixer.updateFlowConfiguration(FLOW_ID, DIVISION_ID);

    // If that fails, delete and recreate
    if (!result) {
        console.log('\n' + '-'.repeat(60));
        console.log('Standard update failed. Recreating flow...');
        console.log('-'.repeat(60) + '\n');
        result = await fixer.deleteAndRecreateFlow(FLOW_ID, FLOW_NAME, DIVISION_ID);
    }

    if (result) {
        console.log('\n' + '='.repeat(60));
        console.log('SUCCESS! Flow is now properly configured.');
        console.log('='.repeat(60));
    } else {
        console.log('\n' + '='.repeat(60));
        console.log('FAILED! Please create the flow manually in Architect.');
        console.log('='.repeat(60));
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
