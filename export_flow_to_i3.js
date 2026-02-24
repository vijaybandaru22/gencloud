#!/usr/bin/env node
/**
 * Export Testflow_claude_vj123456 to .i3inboundflow format
 */

const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_ID = 'd0c1ac74-9fa1-4c58-9045-209508e4d842';
const FLOW_NAME = 'Testflow_claude_vj123456';

class GenesysFlowExporter {
    constructor() {
        this.baseUrl = `api.${REGION}`;
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
        console.log('\n✓ Authenticating...');
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
        console.log('✓ Authenticated successfully\n');
    }

    async exportFlow(flowId) {
        console.log(`✓ Exporting flow: ${flowId}...`);

        // First try to get the flow details
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

        const response = await this.makeRequest(options);
        console.log('✓ Flow exported successfully\n');
        return response;
    }

    async run() {
        try {
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('  Exporting Flow to .i3inboundflow Format');
            console.log('═══════════════════════════════════════════════════════════════\n');

            await this.authenticate();

            const flowData = await this.exportFlow(FLOW_ID);

            const fs = require('fs');
            const fileName = `${FLOW_NAME}.i3inboundflow`;
            fs.writeFileSync(fileName, JSON.stringify(flowData, null, 2));

            console.log('═══════════════════════════════════════════════════════════════');
            console.log('  ✓ SUCCESS!');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log(`\nFile: ${fileName}`);
            console.log(`Flow ID: ${FLOW_ID}`);
            console.log(`\n✓ Flow exported successfully\n`);
            console.log('═══════════════════════════════════════════════════════════════\n');

        } catch (error) {
            console.error('\n✗ Error:', error.message);
            process.exit(1);
        }
    }
}

const exporter = new GenesysFlowExporter();
exporter.run();
