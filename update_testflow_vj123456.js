#!/usr/bin/env node
const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
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

async function findFlow(accessToken) {
    console.log(`Searching for flow: ${FLOW_NAME}...`);
    
    const options = {
        hostname: `api.${REGION}`,
        port: 443,
        path: `/api/v2/flows?type=inboundcall&name=${encodeURIComponent(FLOW_NAME)}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    };
    
    const response = await makeRequest(options);
    if (response.entities && response.entities.length > 0) {
        const flow = response.entities[0];
        console.log('✓ Flow found!');
        console.log(`  Flow ID: ${flow.id}`);
        console.log(`  Name: ${flow.name}`);
        return flow;
    }
    throw new Error('Flow not found');
}

async function main() {
    try {
        console.log('═'.repeat(60));
        console.log('FINDING GENESYS FLOW: ' + FLOW_NAME);
        console.log('═'.repeat(60));
        
        const accessToken = await authenticate();
        const flow = await findFlow(accessToken);
        
        console.log('\n═'.repeat(60));
        console.log('FLOW INFORMATION');
        console.log('═'.repeat(60));
        console.log(`\nFlow Name: ${flow.name}`);
        console.log(`Flow ID: ${flow.id}`);
        console.log(`Type: ${flow.type}`);
        console.log(`\nArchitect URL:`);
        console.log(`https://apps.${REGION}/architect/#/call/inboundcall/${flow.id}/latest`);
        console.log('\n═'.repeat(60));
        console.log('The flow already exists in Genesys Cloud.');
        console.log('You can edit it directly in Architect using the URL above.');
        console.log('═'.repeat(60));
    } catch (error) {
        console.error('\n✗ ERROR:', error.message);
        process.exit(1);
    }
}

main();
