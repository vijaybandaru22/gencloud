#!/usr/bin/env node
/**
 * Check flow API endpoints and structure
 */

const https = require('https');

class GenesysFlowChecker {
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
                    console.log(`Status: ${res.statusCode}`);
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
        } catch (_error) {
            console.error('✗ Authentication failed');
            return false;
        }
    }

    async checkFlow(flowId) {
        console.log('Checking flow endpoints...\n');

        // Try getting flow details
        console.log('1. GET /api/v2/flows/{id}');
        let options = {
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
            console.log(`  Name: ${flow.name}`);
            console.log(`  Has configuration: ${!!flow.configuration}`);
            console.log();
        } catch (error) {
            console.error(`  Error: ${error.message}\n`);
        }

        // Try getting latest configuration
        console.log('2. GET /api/v2/flows/{id}/latestconfiguration');
        options.path = `/api/v2/flows/${flowId}/latestconfiguration`;

        try {
            const config = await this.makeRequest(options);
            console.log(`  Configuration exists: ${!!config}`);
            console.log(`  Has sequences: ${!!config.flowSequenceItemList}`);
            console.log();
        } catch (error) {
            console.error(`  Error: ${error.message}\n`);
        }
    }
}

async function main() {
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';
    const FLOW_ID = '13189c79-04b7-403c-8ab4-9f642da304f3';

    const checker = new GenesysFlowChecker(CLIENT_ID, CLIENT_SECRET, REGION);

    if (!await checker.authenticate()) {
        process.exit(1);
    }

    await checker.checkFlow(FLOW_ID);
}

main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
