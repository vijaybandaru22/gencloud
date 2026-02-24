#!/usr/bin/env node
/**
 * Genesys Cloud Flow Division Updater
 * Updates a flow's division in Genesys Cloud
 */

const https = require('https');

class GenesysFlowUpdater {
    constructor(clientId, clientSecret, region = 'usw2.pure.cloud') {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.region = region;
        this.baseUrl = `api.${region}`;
        this.accessToken = null;
    }

    /**
     * Make an HTTPS request
     */
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

    /**
     * Authenticate using OAuth2 client credentials flow
     */
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

    /**
     * Get flow details
     */
    async getFlow(flowId) {
        console.log(`Fetching flow details for ID: ${flowId}...`);

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
            console.log(`✓ Found flow: ${flow.name}`);
            return flow;
        } catch (error) {
            console.error('✗ Error fetching flow:', error.message);
            return null;
        }
    }

    /**
     * Update flow division
     */
    async updateFlowDivision(flowId, divisionId) {
        console.log(`Updating flow division...`);

        // First, get the current flow to preserve its data
        const currentFlow = await this.getFlow(flowId);
        if (!currentFlow) {
            return null;
        }

        // Update the division
        const updatedFlow = {
            ...currentFlow,
            division: {
                id: divisionId
            }
        };

        const postData = JSON.stringify(updatedFlow);

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
            console.log('✓ Flow division updated successfully!');
            console.log(`  Flow Name: ${updated.name}`);
            console.log(`  Flow ID: ${updated.id}`);
            if (updated.division) {
                console.log(`  Division ID: ${updated.division.id}`);
            }
            return updated;
        } catch (error) {
            console.error('✗ Error updating flow:', error.message);
            return null;
        }
    }
}

async function main() {
    // Configuration
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';
    const FLOW_ID = '4b89ab1f-9f3e-4d4f-9b83-6cbf35cf220a';
    const DIVISION_ID = '62acedf0-d3ba-46b3-af6a-5caac44f1ecd'; // Claude_Explortion_Vijay

    console.log('='.repeat(60));
    console.log('Genesys Cloud Flow Division Updater');
    console.log('='.repeat(60));
    console.log();

    const updater = new GenesysFlowUpdater(CLIENT_ID, CLIENT_SECRET, REGION);

    // Authenticate
    if (!await updater.authenticate()) {
        console.log('\nAuthentication failed. Please check your credentials.');
        process.exit(1);
    }

    console.log();

    // Update flow division
    const updated = await updater.updateFlowDivision(FLOW_ID, DIVISION_ID);

    if (updated) {
        console.log('\n' + '='.repeat(60));
        console.log('SUCCESS! Flow division has been updated.');
        console.log('Division: Claude_Explortion_Vijay');
        console.log('='.repeat(60));
    } else {
        console.log('\n' + '='.repeat(60));
        console.log('FAILED! Could not update flow division.');
        console.log('='.repeat(60));
        process.exit(1);
    }
}

// Run the script
main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
