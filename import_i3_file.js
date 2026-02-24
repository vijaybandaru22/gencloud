#!/usr/bin/env node
/**
 * Import .i3inboundflow file via Genesys API
 */

const https = require('https');
const fs = require('fs');

class I3FileImporter {
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

    async importI3File(filePath) {
        console.log(`Reading .i3inboundflow file: ${filePath}...`);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        console.log('✓ File loaded\n');

        // Try different endpoints for importing
        const endpoints = [
            { path: '/api/v2/flows/import', contentType: 'application/xml' },
            { path: '/api/v2/flows/import', contentType: 'text/xml' },
            { path: '/api/v2/flows', contentType: 'application/xml' },
            { path: '/api/v2/architect/flows/import', contentType: 'application/xml' }
        ];

        for (const endpoint of endpoints) {
            console.log(`Trying: POST ${endpoint.path} (${endpoint.contentType})`);

            const options = {
                hostname: this.baseUrl,
                port: 443,
                path: endpoint.path,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': endpoint.contentType,
                    'Content-Length': Buffer.byteLength(fileContent)
                }
            };

            try {
                const result = await this.makeRequest(options, fileContent);
                console.log('✓ SUCCESS! Flow imported via API\n');
                return result;
            } catch (error) {
                console.log(`  Failed: ${error.message}\n`);
            }
        }

        // Try with JSON wrapper
        console.log('Trying with JSON wrapper...');
        const jsonPayload = JSON.stringify({
            file: fileContent,
            fileName: 'Testflow_vj12345.i3inboundflow'
        });

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: '/api/v2/flows/import',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonPayload)
            }
        };

        try {
            const result = await this.makeRequest(options, jsonPayload);
            console.log('✓ SUCCESS! Flow imported via API\n');
            return result;
        } catch (error) {
            console.log(`  Failed: ${error.message}\n`);
        }

        return null;
    }
}

async function main() {
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud';
    const I3_FILE = 'Testflow_vj12345.i3inboundflow';

    console.log('='.repeat(70));
    console.log('.i3inboundflow File Importer');
    console.log('='.repeat(70));
    console.log();

    const importer = new I3FileImporter(CLIENT_ID, CLIENT_SECRET, REGION);
    await importer.authenticate();

    const result = await importer.importI3File(I3_FILE);

    if (result) {
        console.log('='.repeat(70));
        console.log('SUCCESS! Flow imported programmatically!');
        console.log('='.repeat(70));
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log('='.repeat(70));
        console.log('API import not available.');
        console.log('The .i3inboundflow file has been created.');
        console.log('It must be imported through the Architect web interface.');
        console.log('='.repeat(70));
    }
}

main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
});
