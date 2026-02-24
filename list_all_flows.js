const https = require('https');

const CONFIG = {
    clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
    clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
    region: 'usw2.pure.cloud'
};

function makeRequest(options, postData = null) {
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
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function authenticate() {
    const credentials = Buffer.from(`${CONFIG.clientId}:${CONFIG.clientSecret}`).toString('base64');
    const postData = 'grant_type=client_credentials';
    
    const options = {
        hostname: `login.${CONFIG.region}`,
        path: '/oauth/token',
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const response = await makeRequest(options, postData);
    return response.access_token;
}

async function listFlows(token) {
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: '/api/v2/flows?pageSize=100&sortBy=modifiedDate&sortOrder=desc',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequest(options);
    return response.entities;
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('📋 All Flows in Your Organization');
        console.log('='.repeat(70));
        console.log();
        
        console.log('🔐 Authenticating...');
        const token = await authenticate();
        console.log('✅ Authenticated\n');
        
        console.log('📥 Fetching all flows...');
        const flows = await listFlows(token);
        console.log(`✅ Found ${flows.length} flows\n`);
        
        console.log('='.repeat(70));
        console.log('FLOWS LIST:');
        console.log('='.repeat(70));
        
        flows.forEach((flow, index) => {
            const isYourFlow = flow.name === 'Testflow_claude_vj123' ? ' ⭐ YOUR FLOW' : '';
            console.log(`\n${index + 1}. ${flow.name}${isYourFlow}`);
            console.log(`   Type: ${flow.type}`);
            console.log(`   Division: ${flow.division.name}`);
            console.log(`   Status: ${flow.status || 'N/A'}`);
            console.log(`   ID: ${flow.id}`);
            console.log(`   Created: ${new Date(flow.dateCreated).toLocaleString()}`);
            console.log(`   Modified: ${new Date(flow.dateModified).toLocaleString()}`);
            console.log(`   URL: https://apps.${CONFIG.region}/architect/#/call/inboundcalls/${flow.id}`);
        });
        
        console.log('\n' + '='.repeat(70));
        
        // Find your specific flow
        const yourFlow = flows.find(f => f.name === 'Testflow_claude_vj123');
        if (yourFlow) {
            console.log('\n⭐ YOUR FLOW FOUND:');
            console.log('='.repeat(70));
            console.log(`Name: ${yourFlow.name}`);
            console.log(`ID: ${yourFlow.id}`);
            console.log(`Type: ${yourFlow.type}`);
            console.log(`Division: ${yourFlow.division.name}`);
            console.log(`\nDirect Link:`);
            console.log(`https://apps.${CONFIG.region}/architect/#/call/inboundcalls/${yourFlow.id}`);
        }
        
        console.log('='.repeat(70));
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

main();
