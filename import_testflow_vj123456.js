#!/usr/bin/env node
const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const _I3_FILE = 'Testflow_vj123456.i3inboundflow';
const FLOW_NAME = 'Testflow_vj123456';

async function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); } 
                    catch (_e) { resolve(data); }
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

async function authenticate() {
    console.log('Authenticating...');
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
    
    const response = await makeRequest(options, postData);
    console.log('✓ Authenticated\n');
    return response.access_token;
}

async function createFlow(accessToken) {
    console.log(`Creating flow: ${FLOW_NAME}...`);
    
    const flowData = JSON.stringify({
        name: FLOW_NAME,
        description: 'Test flow created by Claude Code',
        type: 'inboundcall',
        inboundCall: {
            name: FLOW_NAME,
            division: { id: 'HOME' },
            startUpRef: 'Task_Initial',
            defaultLanguage: 'en-us',
            supportedLanguages: { 'en-us': { none: true } },
            initialGreeting: {
                tts: 'welcome to my claude flow'
            },
            menu: {}
        }
    });
    
    const options = {
        hostname: `api.${REGION}`,
        port: 443,
        path: '/api/v2/flows',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(flowData)
        }
    };
    
    const response = await makeRequest(options, flowData);
    console.log('✓ Flow created successfully!');
    console.log(`  Flow ID: ${response.id}`);
    console.log(`  Name: ${response.name}`);
    console.log(`\n  Architect URL: https://apps.${REGION}/architect/#/call/inboundcall/${response.id}/1`);
    return response;
}

async function main() {
    try {
        console.log('═'.repeat(60));
        console.log('CREATING GENESYS FLOW: ' + FLOW_NAME);
        console.log('═'.repeat(60));
        
        const accessToken = await authenticate();
        const _flow = await createFlow(accessToken);
        
        console.log('\n═'.repeat(60));
        console.log('SUCCESS! Flow created in Genesys Cloud');
        console.log('═'.repeat(60));
        console.log('\nNEXT STEPS:');
        console.log('1. Open the flow in Architect (URL above)');
        console.log('2. Configure the flow actions as needed');
        console.log('3. Save and Publish the flow');
        console.log('═'.repeat(60));
    } catch (error) {
        console.error('\n✗ ERROR:', error.message);
        process.exit(1);
    }
}

main();
