#!/usr/bin/env node
/**
 * Update flow division
 */

const https = require('https');

class FlowUpdater {
    constructor(clientId, clientSecret, region) {
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

    async updateFlowDivision(flowId, divisionId) {
        console.log(`Updating flow ${flowId} to division ${divisionId}...`);

        // First, get the flow
        const getOptions = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const flow = await this.makeRequest(getOptions);
        console.log(`  Current division: ${flow.division?.name || 'Default'}\n`);

        // Update the flow with new division
        flow.division = { id: divisionId };

        const updateData = JSON.stringify(flow);
        const putOptions = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(updateData)
            }
        };

        try {
            const result = await this.makeRequest(putOptions, updateData);
            console.log('✓ Flow division updated successfully!');
            console.log(`  New division: ${result.division?.name || 'Default'}`);
            return result;
        } catch (error) {
            console.log(`✗ Failed to update: ${error.message}`);
            throw error;
        }
    }
}

async function main() {
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';
    const FLOW_ID = 'b2515344-5fc1-4904-8130-ec83f1530fc6';
    const DIVISION_ID = '10cf32a1-d7b9-4ce5-888b-5c357f6ceede'; // Home

    console.log('='.repeat(70));
    console.log('Flow Division Updater');
    console.log('='.repeat(70));
    console.log();

    const updater = new FlowUpdater(CLIENT_ID, CLIENT_SECRET, REGION);
    await updater.authenticate();
    await updater.updateFlowDivision(FLOW_ID, DIVISION_ID);

    console.log('\n' + '='.repeat(70));
    console.log('SUCCESS!');
    console.log('='.repeat(70));
}

main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
});
