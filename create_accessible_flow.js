#!/usr/bin/env node
/**
 * Create accessible flow without locking
 */

const https = require('https');
const fs = require('fs');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_NAME = 'Testflow_claude_vj123456';

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
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Creating Accessible Flow');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Authenticate
    console.log('✓ Authenticating...');
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const postData = 'grant_type=client_credentials';
    const token = await makeRequest({
        hostname: `login.${REGION}`,
        path: '/oauth/token',
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, postData);
    console.log('✓ Authenticated\n');

    // Get division
    console.log('✓ Getting division...');
    const divisions = await makeRequest({
        hostname: `api.${REGION}`,
        path: '/api/v2/authorization/divisions',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json'
        }
    });
    const division = divisions.entities.find(d => d.name === 'Home');
    console.log(`✓ Division: ${division.name}\n`);

    // Create basic flow WITHOUT configuration (to avoid locking)
    console.log('✓ Creating flow...');
    const flowData = JSON.stringify({
        name: FLOW_NAME,
        description: "Voice inbound flow with welcome, hold music, US check, and queue transfer",
        type: "inboundcall",
        division: {
            id: division.id
        }
    });

    const flow = await makeRequest({
        hostname: `api.${REGION}`,
        path: '/api/v2/flows',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(flowData)
        }
    }, flowData);

    console.log('✓ Flow created!\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ✓✓✓ FLOW CREATED SUCCESSFULLY ✓✓✓');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Flow Details:');
    console.log('  Name:', flow.name);
    console.log('  ID:', flow.id);
    console.log('  Division:', division.name);
    console.log('  Type:', flow.type);
    console.log('\nArchitect URLs:');
    console.log('  Main flows list:');
    console.log('    https://apps.usw2.pure.cloud/architect/#/flows');
    console.log('\n  Direct edit link:');
    console.log('    https://apps.usw2.pure.cloud/architect/#/flows/' + flow.id + '/edit');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  NEXT STEP: IMPORT CONFIGURATION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('1. Open either URL above');
    console.log('2. Find "Testflow_claude_vj123456" in the list');
    console.log('3. Click the three dots (...) menu');
    console.log('4. Select "Import"');
    console.log('5. Choose: Testflow_claude_vj123456_complete.i3inboundflow');
    console.log('6. Click "Import" and then "Publish"');
    console.log('\n═══════════════════════════════════════════════════════════════\n');

    // Save flow ID
    fs.writeFileSync('CURRENT_FLOW_ID.txt', flow.id);
    console.log('✓ Flow ID saved to: CURRENT_FLOW_ID.txt\n');
}

run().catch((error) => {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
});
