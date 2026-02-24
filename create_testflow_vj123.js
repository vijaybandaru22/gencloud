const https = require('https');

const CONFIG = {
    clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
    clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
    region: 'usw2.pure.cloud',
    flowName: 'Testflow_claude_vj123',
    divisionName: 'Home'
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
    console.log('🔐 Authenticating...');
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
    console.log('✅ Authenticated\n');
    return response.access_token;
}

async function getDivisionId(token) {
    console.log(`📁 Looking up division: ${CONFIG.divisionName}...`);
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: '/api/v2/authorization/divisions',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequest(options);
    const division = response.entities.find(d => d.name === CONFIG.divisionName);
    if (!division) throw new Error(`Division '${CONFIG.divisionName}' not found`);
    
    console.log(`✅ Division found: ${division.id}\n`);
    return division.id;
}

async function createFlow(token, divisionId) {
    console.log(`🔨 Creating flow: ${CONFIG.flowName}...`);
    
    const flowConfig = {
        name: CONFIG.flowName,
        description: 'Voice inbound test flow created via API',
        type: 'inboundcall',
        division: { id: divisionId }
    };
    
    const postData = JSON.stringify(flowConfig);
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: '/api/v2/flows',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const flow = await makeRequest(options, postData);
    return flow;
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('🚀 Creating Genesys Cloud Flow');
        console.log('='.repeat(70));
        console.log(`Flow Name: ${CONFIG.flowName}`);
        console.log(`Division: ${CONFIG.divisionName}`);
        console.log(`Region: ${CONFIG.region}`);
        console.log('='.repeat(70));
        console.log();
        
        const token = await authenticate();
        const divisionId = await getDivisionId(token);
        const flow = await createFlow(token, divisionId);
        
        console.log('='.repeat(70));
        console.log('✅ FLOW CREATED SUCCESSFULLY!');
        console.log('='.repeat(70));
        console.log(`Flow ID: ${flow.id}`);
        console.log(`Flow Name: ${flow.name}`);
        console.log(`Type: ${flow.type}`);
        console.log();
        console.log('🌐 Open in Architect:');
        console.log(`   https://apps.${CONFIG.region}/architect/#/call/inboundcalls/${flow.id}`);
        console.log();
        console.log('📝 Next Steps:');
        console.log('   1. Click the Architect URL above');
        console.log('   2. Configure your flow logic');
        console.log('   3. Publish the flow');
        console.log('='.repeat(70));
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

main();
