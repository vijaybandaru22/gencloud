#!/usr/bin/env node
const https = require('https');
const fs = require('fs');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_ID = 'c0a407ae-75f2-4a77-ae34-6ac11d23da46';

async function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); } catch (_e) { resolve(data); }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function run() {
    console.log('\n✓ Authenticating...');
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const postData = 'grant_type=client_credentials';

    const token = await makeRequest({
        hostname: `login.${REGION}`,
        port: 443,
        path: '/oauth/token',
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, postData);

    console.log('✓ Authenticated\n');
    console.log('✓ Exporting flow configuration...');

    const config = await makeRequest({
        hostname: `api.${REGION}`,
        port: 443,
        path: `/api/v2/flows/${FLOW_ID}/latestconfiguration`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json'
        }
    });

    fs.writeFileSync('Testflow_claude_vj123456.i3inboundflow', JSON.stringify(config, null, 2));
    console.log('✓ Exported to: Testflow_claude_vj123456.i3inboundflow\n');
}

run().catch(console.error);
