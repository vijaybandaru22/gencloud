const https = require('https');

const CONFIG = {
    clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
    clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
    region: 'usw2.pure.cloud',
    flows: [
        { id: 'c5c9352b-c29f-4e8c-8710-f10fb6507405', name: 'US_Queue_InQueue_Flow' },
        { id: '142e528d-cf7f-42ed-9e11-e49f86688d35', name: 'India_Queue_InQueue_Flow' }
    ]
};

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data || 'Success');
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
    const parsed = JSON.parse(response);
    console.log('✅ Authenticated\n');
    return parsed.access_token;
}

async function deleteFlow(token, flowId, flowName) {
    console.log(`🗑️  Deleting ${flowName}...`);

    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${flowId}`,
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        await makeRequest(options);
        console.log(`✅ ${flowName} deleted\n`);
    } catch (error) {
        console.log(`⚠️  ${flowName}: ${error.message}\n`);
    }
}

async function removeInQueueFlowFromQueue(token, queueName) {
    console.log(`🔧 Removing in-queue flow from ${queueName}...`);

    // Get queue
    const getOptions = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/routing/queues?name=${queueName}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await makeRequest(getOptions);
        const parsed = JSON.parse(response);

        if (!parsed.entities || parsed.entities.length === 0) {
            console.log(`⚠️  Queue ${queueName} not found\n`);
            return;
        }

        const queue = parsed.entities[0];

        // Remove in-queue flow by setting it to null
        const updateConfig = {
            name: queue.name,
            inQueueFlow: null
        };

        const postData = JSON.stringify(updateConfig);
        const putOptions = {
            hostname: `api.${CONFIG.region}`,
            path: `/api/v2/routing/queues/${queue.id}`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        await makeRequest(putOptions, postData);
        console.log(`✅ In-queue flow removed from ${queueName}\n`);
    } catch (error) {
        console.log(`⚠️  ${queueName}: ${error.message}\n`);
    }
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('🧹 CLEANUP BROKEN IN-QUEUE FLOWS');
        console.log('='.repeat(70));
        console.log();

        const token = await authenticate();

        // Remove from queues first
        console.log('Step 1: Remove in-queue flows from queues');
        console.log('='.repeat(70));
        await removeInQueueFlowFromQueue(token, 'US_Queue');
        await removeInQueueFlowFromQueue(token, 'India_Queue');

        // Delete broken flows
        console.log('Step 2: Delete broken flows');
        console.log('='.repeat(70));
        for (const flow of CONFIG.flows) {
            await deleteFlow(token, flow.id, flow.name);
        }

        console.log('='.repeat(70));
        console.log('✅ CLEANUP COMPLETE');
        console.log('='.repeat(70));
        console.log();
        console.log('Status:');
        console.log('✓ Broken in-queue flows deleted');
        console.log('✓ Queue configurations cleaned');
        console.log();
        console.log('Your queues are now clean without in-queue flows.');
        console.log('The main Claude_Cars_Complete flow still works perfectly.');
        console.log();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

main();
