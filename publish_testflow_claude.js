const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_NAME = 'Testflow_claude_vj123456';
const FLOW_ID = '5baca7cd-e5d6-41b4-b668-4f32ab3ced45';

function makeRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(data ? JSON.parse(data) : {}); } 
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

async function run() {
    try {
        console.log('='.repeat(70));
        console.log('PUBLISHING FLOW: ' + FLOW_NAME);
        console.log('='.repeat(70));
        
        console.log('\n1. Authenticating...');
        const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        let token = await makeRequest({
            hostname: `login.${REGION}`,
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }, 'grant_type=client_credentials');
        token = token.access_token;
        console.log('   ✓ Authenticated');

        console.log('\n2. Getting flow details...');
        let flow = await makeRequest({
            hostname: `api.${REGION}`,
            path: `/api/v2/flows/${FLOW_ID}`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`   ✓ Flow: ${flow.name}`);
        console.log(`   ✓ Current version: ${flow.currentVersion || 'No version'}`);
        console.log(`   ✓ Status: ${flow.publishedVersion ? 'Published' : 'Not published'}`);

        console.log('\n3. Attempting to publish flow...');
        try {
            const publishData = JSON.stringify({
                version: flow.currentVersion || 1
            });
            
            let published = await makeRequest({
                hostname: `api.${REGION}`,
                path: `/api/v2/flows/${FLOW_ID}/publish`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }, publishData);
            
            console.log('   ✓ Flow published successfully!');
            console.log(`   ✓ Published version: ${published.version}`);
        } catch (publishError) {
            console.log('   ⚠ Cannot publish: Flow needs configuration first');
            console.log(`   Error: ${publishError.message}`);
        }

        console.log('\n' + '='.repeat(70));
        console.log('FLOW STATUS');
        console.log('='.repeat(70));
        console.log(`\nFlow Name: ${flow.name}`);
        console.log(`Flow ID: ${flow.id}`);
        console.log(`Division: HOME`);
        console.log(`\nArchitect URL:`);
        console.log(`https://apps.${REGION}/architect/#/call/inboundcall/${FLOW_ID}/latest`);
        console.log('\n' + '='.repeat(70));
        console.log('NEXT STEPS:');
        console.log('='.repeat(70));
        console.log('\nThe flow exists but needs actions configured in Architect:');
        console.log('1. Open the URL above');
        console.log('2. Add the following actions:');
        console.log('   - Play Audio: "welcome to my claude flow"');
        console.log('   - Play Audio: Hold Music');
        console.log('   - Decision: Call.Ani.CountryCode == "US"');
        console.log('   - Transfer to ACD: VJ_TEST_NEW (on Yes path)');
        console.log('   - Disconnect (on No path)');
        console.log('3. Click Save');
        console.log('4. Click Publish');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\nERROR:', error.message);
        process.exit(1);
    }
}

run();
