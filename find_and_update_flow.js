const https = require('https');

const CONFIG = {
    clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
    clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
    region: 'usw2.pure.cloud',
    flowName: 'VJclaude123'
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

async function searchFlowByName(token, flowName) {
    console.log(`🔍 Searching for flow: ${flowName}...`);
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows?name=${encodeURIComponent(flowName)}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequest(options);
    return response.entities || [];
}

async function getQueue(token, queueName) {
    console.log(`📋 Looking up queue: ${queueName}...`);
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/routing/queues?name=${encodeURIComponent(queueName)}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequest(options);
    if (response.entities && response.entities.length > 0) {
        console.log(`✅ Queue found: ${response.entities[0].id}\n`);
        return response.entities[0];
    }
    throw new Error(`Queue '${queueName}' not found`);
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('🔍 Finding Flow: VJclaude123');
        console.log('='.repeat(70));
        console.log();
        
        const token = await authenticate();
        const flows = await searchFlowByName(token, CONFIG.flowName);
        
        if (flows.length === 0) {
            console.log('❌ Flow "VJclaude123" not found!\n');
            console.log('Available options:');
            console.log('1. Create a new flow with this name');
            console.log('2. Check if the flow name is correct');
            console.log('3. List all flows to find the correct name');
            process.exit(1);
        }
        
        const flow = flows[0];
        console.log('✅ Flow found!\n');
        
        console.log('='.repeat(70));
        console.log('📋 Flow Details:');
        console.log('='.repeat(70));
        console.log(`Name: ${flow.name}`);
        console.log(`ID: ${flow.id}`);
        console.log(`Type: ${flow.type}`);
        console.log(`Division: ${flow.division.name}`);
        console.log(`\nArchitect URL:`);
        console.log(`https://apps.${CONFIG.region}/architect/#/call/inboundcalls/${flow.id}`);
        console.log('='.repeat(70));
        
        // Get the queue
        const queue = await getQueue(token, 'VJ_TEST_NEW');
        
        console.log('\n📝 Required Changes:');
        console.log('='.repeat(70));
        console.log('1. ✓ Play welcome message: "welcome to my claude flow"');
        console.log('2. ✓ Play hold music');
        console.log('3. ✓ Decision: Check if caller from US');
        console.log('4. ✓ If US: Transfer to queue VJ_TEST_NEW');
        console.log('='.repeat(70));
        
        console.log('\n⚠️  Manual Configuration Required:');
        console.log('Please open Architect and make these changes:\n');
        console.log('STEP 1: Add Play Audio');
        console.log('  - Text: "welcome to my claude flow"');
        console.log('\nSTEP 2: Add Play Audio (Hold Music)');
        console.log('  - Select Audio File or Sequence for hold music');
        console.log('\nSTEP 3: Add Decision');
        console.log('  - Expression: Call.CallingAddress.CountryCode == "US"');
        console.log('  - Or: GetCountryByCallingAddress(Call.CallingAddress) == "United States"');
        console.log('\nSTEP 4: Add Transfer to ACD (in "Yes" path)');
        console.log(`  - Queue: VJ_TEST_NEW (ID: ${queue.id})`);
        console.log('\nSTEP 5: Save and Publish');
        
        console.log('\n🌐 Open this URL to configure:');
        console.log(`https://apps.${CONFIG.region}/architect/#/call/inboundcalls/${flow.id}`);
        console.log('='.repeat(70));
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

main();
