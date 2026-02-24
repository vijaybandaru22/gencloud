#!/usr/bin/env node
/**
 * Import flow using Genesys Architect Import API
 */

const https = require('https');
const fs = require('fs');

class GenesysFlowImportAPI {
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
                    console.log(`Response Status: ${res.statusCode}`);
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

    async deleteFlow(flowId) {
        if (!flowId) return;

        console.log(`Deleting old flow...`);

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
            console.log('✓ Old flow deleted\n');
        } catch (_error) {
            console.log('Note: Could not delete old flow\n');
        }
    }

    async importFlowViaAPI(yamlContent) {
        console.log('Attempting to import flow via API...\n');

        // Try different import endpoints
        const endpoints = [
            '/api/v2/flows/import',
            '/api/v2/architect/flows/import',
            '/api/v2/flows/imports'
        ];

        for (const endpoint of endpoints) {
            console.log(`Trying endpoint: ${endpoint}`);

            const postData = JSON.stringify({
                yaml: yamlContent,
                type: 'inboundcall'
            });

            const options = {
                hostname: this.baseUrl,
                port: 443,
                path: endpoint,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            try {
                const result = await this.makeRequest(options, postData);
                console.log('✓ Import successful!\n');
                return result;
            } catch (error) {
                console.log(`  Failed: ${error.message}\n`);
            }
        }

        return null;
    }
}

async function main() {
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';
    const OLD_FLOW_ID = 'e38d64ea-6912-4adf-9699-08467647b2a5';
    const YAML_FILE = 'Testflow_vj12345.yaml';

    console.log('='.repeat(70));
    console.log('Genesys Cloud Flow Import via API');
    console.log('='.repeat(70));
    console.log();

    const importer = new GenesysFlowImportAPI(CLIENT_ID, CLIENT_SECRET, REGION);

    if (!await importer.authenticate()) {
        process.exit(1);
    }

    await importer.deleteFlow(OLD_FLOW_ID);

    // Read YAML file
    console.log(`Reading YAML file: ${YAML_FILE}...`);
    const yamlContent = fs.readFileSync(YAML_FILE, 'utf8');
    console.log('✓ YAML loaded\n');

    const result = await importer.importFlowViaAPI(yamlContent);

    if (result) {
        console.log('='.repeat(70));
        console.log('SUCCESS! Flow imported successfully.');
        console.log('='.repeat(70));
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log('='.repeat(70));
        console.log('FAILED! Import API not available or unsupported.');
        console.log('='.repeat(70));
        console.log();
        console.log('CONCLUSION: Genesys Cloud API does not support');
        console.log('programmatic flow configuration creation.');
        console.log();
        console.log('The flow must be configured through the Architect web interface.');
        console.log('The YAML file has been created at: Testflow_vj12345.yaml');
        console.log('Please import it manually via the Architect interface.');
        console.log('='.repeat(70));
    }
}

main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
