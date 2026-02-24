const https = require('https');

const CONFIG = {
    clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
    clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
    region: 'usw2.pure.cloud',
    flowId: '5f77fa2e-ca69-4d87-9e03-a619a28755c1'
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

async function getQueues(token) {
    console.log('📋 Fetching queues...');
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: '/api/v2/routing/queues?pageSize=5',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const response = await makeRequest(options);
    console.log(`✅ Found ${response.entities.length} queues\n`);
    return response.entities;
}

async function publishFlow(token) {
    console.log('📤 Publishing flow...');

    const postData = JSON.stringify({});
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}/publish`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const response = await makeRequest(options, postData);
    console.log('✅ Flow published successfully!\n');
    return response;
}

async function getFlow(token) {
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    return await makeRequest(options);
}

async function checkInFlow(token) {
    console.log('💾 Checking in flow (saving draft)...');

    const postData = JSON.stringify({});
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}/checkin`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    try {
        const response = await makeRequest(options, postData);
        console.log('✅ Flow checked in\n');
        return response;
    } catch (_error) {
        console.log('⚠️  Check-in not needed or already saved\n');
        return null;
    }
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('🚀 Publishing Flow');
        console.log('='.repeat(70));
        console.log('Flow ID: ' + CONFIG.flowId);
        console.log('='.repeat(70));
        console.log();

        const token = await authenticate();
        const queues = await getQueues(token);

        if (queues.length === 0) {
            throw new Error('No queues available.');
        }

        const selectedQueue = queues[0];
        console.log(`📍 Queue available: ${selectedQueue.name}\n`);

        // Try to check in first
        await checkInFlow(token);

        // Publish the flow
        await publishFlow(token);

        const flow = await getFlow(token);

        console.log('='.repeat(70));
        console.log('✅ FLOW PUBLISHED!');
        console.log('='.repeat(70));
        console.log('\n📋 Flow Details:');
        console.log(`   Name: ${flow.name}`);
        console.log(`   ID: ${flow.id}`);
        console.log(`   Type: ${flow.type}`);
        console.log(`   Status: Published ✅`);

        console.log('\n⚠️  IMPORTANT - Manual Configuration Required:');
        console.log('   The flow is now published but needs configuration.');
        console.log('   Please open Architect to add flow logic:');
        console.log(`   https://apps.${CONFIG.region}/architect/#/call/inboundcalls/${flow.id}`);

        console.log('\n📝 Add these actions in Architect:');
        console.log('   1. Play Audio - Welcome message');
        console.log('   2. Transfer to ACD - Select queue: ' + selectedQueue.name);
        console.log('   3. Disconnect');

        console.log('\n📞 Then assign to phone number:');
        console.log('   Admin > Telephony > DIDs');

        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n❌ Error:', error.message);

        if (error.message.includes('no saved or checked-in configuration')) {
            console.log('\n💡 Solution: The flow needs to be configured first.');
            console.log('   1. Open: https://apps.' + CONFIG.region + '/architect/#/call/inboundcalls/' + CONFIG.flowId);
            console.log('   2. Add flow actions (Play Audio, Transfer to Queue, etc.)');
            console.log('   3. Click Save');
            console.log('   4. Click Publish');
        }

        process.exit(1);
    }
}

main();
