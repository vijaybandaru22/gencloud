#!/usr/bin/env node
/**
 * Get an existing flow to use as a template
 */

const https = require('https');
const fs = require('fs');

class GenesysFlowExplorer {
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

    async listFlows() {
        console.log('Fetching existing flows...\n');

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: '/api/v2/flows?pageSize=10&type=inboundcall',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        try {
            const response = await this.makeRequest(options);
            const flows = response.entities || [];

            console.log(`Found ${flows.length} inbound call flows:`);
            flows.forEach((flow, idx) => {
                console.log(`  ${idx + 1}. ${flow.name} (ID: ${flow.id})`);
            });

            return flows;
        } catch (error) {
            console.error('✗ Error fetching flows:', error.message);
            return [];
        }
    }

    async getFlowDetails(flowId) {
        console.log(`\nFetching details for flow ID: ${flowId}...`);

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}/latestconfiguration`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        try {
            const flowConfig = await this.makeRequest(options);
            console.log('✓ Flow configuration retrieved\n');

            // Save to file
            fs.writeFileSync('flow_template.json', JSON.stringify(flowConfig, null, 2));
            console.log('✓ Saved to flow_template.json');

            return flowConfig;
        } catch (error) {
            console.error('✗ Error fetching flow details:', error.message);
            return null;
        }
    }
}

async function main() {
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';

    const explorer = new GenesysFlowExplorer(CLIENT_ID, CLIENT_SECRET, REGION);

    if (!await explorer.authenticate()) {
        process.exit(1);
    }

    const flows = await explorer.listFlows();

    if (flows.length > 0) {
        // Get the first flow's details as a template
        console.log('\nFetching the first flow as a template...');
        await explorer.getFlowDetails(flows[0].id);

        console.log('\n' + '='.repeat(70));
        console.log('You can now examine flow_template.json to see the structure');
        console.log('='.repeat(70));
    }
}

main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
