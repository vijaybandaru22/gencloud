const https = require('https');

const CONFIG = {
    clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
    clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
    region: 'usw2.pure.cloud',
    divisionId: '10cf32a1-d7b9-4ce5-888b-5c357f6ceede'
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

async function createInQueueFlow(token) {
    console.log('🔨 Creating India_Queue_InQueue_Flow...');

    const flowConfig = {
        name: 'India_Queue_InQueue_Flow',
        description: 'In-queue flow for India Queue',
        type: 'inqueuecall',
        division: {
            id: CONFIG.divisionId
        }
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
    console.log(`✅ Flow created: ${flow.name}`);
    console.log(`   Flow ID: ${flow.id}\n`);
    return flow;
}

async function main() {
    try {
        const token = await authenticate();
        const flow = await createInQueueFlow(token);

        console.log('='.repeat(70));
        console.log('✅ INDIA IN-QUEUE FLOW CREATED!');
        console.log('='.repeat(70));
        console.log();
        console.log(`Flow Name: India_Queue_InQueue_Flow`);
        console.log(`Flow ID: ${flow.id}`);
        console.log();
        console.log('Next: Configure audio in Architect (see SIMPLE_INQUEUE_SETUP.txt)');
        console.log();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

main();
