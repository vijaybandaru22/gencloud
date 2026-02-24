const https = require('https');

const CONFIG = {
    clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
    clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
    region: 'usw2.pure.cloud',
    flowId: '5f77fa2e-ca69-4d87-9e03-a619a28755c1',
    flowName: 'Testflow_claude_vj123'
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

async function getFlowById(token) {
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequest(options);
    return response;
}

async function searchFlowByName(token) {
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows?name=${encodeURIComponent(CONFIG.flowName)}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    try {
        const response = await makeRequest(options);
        return response.entities || [];
    } catch (_error) {
        return [];
    }
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('🔍 Searching for Your Flow');
        console.log('='.repeat(70));
        console.log(`Flow Name: ${CONFIG.flowName}`);
        console.log(`Flow ID: ${CONFIG.flowId}`);
        console.log('='.repeat(70));
        console.log();
        
        const token = await authenticate();
        console.log('✅ Authenticated\n');
        
        console.log('📥 Getting flow by ID...');
        const flowById = await getFlowById(token);
        
        console.log('📥 Searching flow by name...');
        const _flowsByName = await searchFlowByName(token);
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ FLOW FOUND!');
        console.log('='.repeat(70));
        console.log(`\n📋 Flow Details:`);
        console.log(`   Name: ${flowById.name}`);
        console.log(`   ID: ${flowById.id}`);
        console.log(`   Type: ${flowById.type}`);
        console.log(`   Division: ${flowById.division.name}`);
        console.log(`   Created: ${new Date(flowById.dateCreated).toLocaleString()}`);
        console.log(`   Modified: ${new Date(flowById.dateModified).toLocaleString()}`);
        console.log(`   Published: ${flowById.publishedVersion ? 'Yes' : 'No (Draft)'}`);
        
        console.log('\n🌐 WHERE TO FIND IT:');
        console.log('='.repeat(70));
        console.log('\n1. In Genesys Cloud Web UI:');
        console.log('   • Go to: Admin > Architect');
        console.log('   • Click on: Flows > Inbound Call');
        console.log('   • Search for: "Testflow_claude_vj123"');
        console.log('   • Or filter by Division: Home');
        
        console.log('\n2. Direct Architect Link:');
        console.log(`   https://apps.${CONFIG.region}/architect/#/call/inboundcalls/${flowById.id}`);
        
        console.log('\n3. API Endpoint:');
        console.log(`   GET https://api.${CONFIG.region}/api/v2/flows/${flowById.id}`);
        
        console.log('\n📊 Flow Status:');
        if (!flowById.publishedVersion) {
            console.log('   ⚠️  Flow is in DRAFT mode (not published yet)');
            console.log('   ℹ️  You need to configure and publish it in Architect');
        } else {
            console.log('   ✅ Flow is published and active');
        }
        
        console.log('\n' + '='.repeat(70));
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

main();
