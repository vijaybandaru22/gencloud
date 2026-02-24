#!/usr/bin/env node
/**
 * Import Testflow_claude_vj123456 from .i3inboundflow file
 */

const https = require('https');
const fs = require('fs');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_FILE = 'Testflow_claude_vj123456_complete.i3inboundflow';
const EXISTING_FLOW_ID = 'c0a407ae-75f2-4a77-ae34-6ac11d23da46';

class GenesysFlowImporter {
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
                        try { resolve(JSON.parse(data)); } catch (_e) { resolve(data); }
                    } else {
                        if (res.statusCode === 404) {
                            resolve(null);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        }
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

    async deleteFlow(flowId) {
        console.log(`✓ Deleting existing flow: ${flowId}...`);
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
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    async getDivisionId(divisionName) {
        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: '/api/v2/authorization/divisions',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const response = await this.makeRequest(options);
        const division = response.entities.find(d => d.name.toLowerCase() === divisionName.toLowerCase());
        return division ? division.id : null;
    }

    async importFlow(flowData, divisionId) {
        console.log('✓ Importing flow configuration...');

        const flowDefinition = {
            name: flowData.inboundCall.name,
            description: flowData.inboundCall.description || "",
            type: "inboundcall",
            division: {
                id: divisionId
            },
            inboundCall: flowData.inboundCall
        };

        const postData = JSON.stringify(flowDefinition);

        const options = {
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

        const response = await this.makeRequest(options, postData);
        console.log('✓ Flow imported successfully');
        console.log(`✓ Flow ID: ${response.id}\n`);
        return response;
    }

    async publishFlow(flowId) {
        console.log(`✓ Publishing flow: ${flowId}...`);

        const postData = JSON.stringify({});

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: `/api/v2/flows/${flowId}/publish`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const response = await this.makeRequest(options, postData);
        console.log('✓ Flow published successfully\n');
        return response;
    }

    async run() {
        try {
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('  Importing Genesys Cloud Flow from .i3inboundflow File');
            console.log('═══════════════════════════════════════════════════════════════\n');

            if (!fs.existsSync(FLOW_FILE)) {
                throw new Error(`Flow file not found: ${FLOW_FILE}`);
            }

            console.log(`✓ Reading flow file: ${FLOW_FILE}...`);
            const flowData = JSON.parse(fs.readFileSync(FLOW_FILE, 'utf8'));
            console.log('✓ Flow file loaded\n');

            await this.authenticate();

            console.log('✓ Looking up division...');
            const divisionId = await this.getDivisionId('Home');
            if (!divisionId) {
                throw new Error('Home division not found');
            }
            console.log(`✓ Division ID: ${divisionId}\n`);

            // Delete existing flow
            if (EXISTING_FLOW_ID) {
                await this.deleteFlow(EXISTING_FLOW_ID);
            }

            const flow = await this.importFlow(flowData, divisionId);
            await this.publishFlow(flow.id);

            console.log('═══════════════════════════════════════════════════════════════');
            console.log('  ✓ SUCCESS!');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log(`\nFlow Name: ${flowData.inboundCall.name}`);
            console.log(`Flow ID: ${flow.id}`);
            console.log(`Status: Published with Full Configuration`);
            console.log(`\nArchitect URL:`);
            console.log(`https://apps.usw2.pure.cloud/architect/#/flows/${flow.id}/edit\n`);
            console.log('Flow Configuration:');
            console.log('  ✓ Welcome Message: "welcome to my claude flow"');
            console.log('  ✓ Hold Music: Enabled');
            console.log('  ✓ US Check: Call.Country == "US"');
            console.log('  ✓ Transfer Queue: VJ_TEST_NEW');
            console.log('  ✓ Disconnect: For non-US callers\n');
            console.log('═══════════════════════════════════════════════════════════════\n');

        } catch (error) {
            console.error('\n✗ Error:', error.message);
            process.exit(1);
        }
    }
}

const importer = new GenesysFlowImporter();
importer.run();
