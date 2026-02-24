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

async function publishFlow(token, flowId, flowName) {
    console.log(`📤 Attempting to publish ${flowName}...`);

    const postData = JSON.stringify({});
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${flowId}/publish`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    try {
        const result = await makeRequest(options, postData);
        console.log(`✅ ${flowName} published successfully!\n`);
        return result;
    } catch (error) {
        console.log(`❌ ${flowName} failed: ${error.message}\n`);
        return null;
    }
}

async function assignToQueue(token, queueName, flowId) {
    console.log(`🔗 Assigning ${queueName} in-queue flow...`);

    // Get queue ID
    const getQueueOptions = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/routing/queues?name=${queueName}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const queueResponse = await makeRequest(getQueueOptions);
        if (!queueResponse.entities || queueResponse.entities.length === 0) {
            console.log(`❌ Queue ${queueName} not found\n`);
            return;
        }

        const queue = queueResponse.entities[0];
        const queueId = queue.id;

        // Update queue with in-queue flow
        const updateConfig = {
            name: queue.name,
            inQueueFlow: {
                id: flowId
            }
        };

        const postData = JSON.stringify(updateConfig);
        const putOptions = {
            hostname: `api.${CONFIG.region}`,
            path: `/api/v2/routing/queues/${queueId}`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        await makeRequest(putOptions, postData);
        console.log(`✅ ${queueName} configured with in-queue flow\n`);
    } catch (error) {
        console.log(`❌ Failed to assign to ${queueName}: ${error.message}\n`);
    }
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('📤 FORCE PUBLISH IN-QUEUE FLOWS');
        console.log('='.repeat(70));
        console.log();

        const token = await authenticate();

        // Try to publish both flows
        for (const flow of CONFIG.flows) {
            await publishFlow(token, flow.id, flow.name);
        }

        // Try to assign them to queues anyway
        console.log('='.repeat(70));
        console.log('Assigning flows to queues (even if unpublished)');
        console.log('='.repeat(70));
        console.log();

        await assignToQueue(token, 'US_Queue', CONFIG.flows[0].id);
        await assignToQueue(token, 'India_Queue', CONFIG.flows[1].id);

        console.log('='.repeat(70));
        console.log('✅ PROCESS COMPLETE');
        console.log('='.repeat(70));
        console.log();
        console.log('Status:');
        console.log('- Flows created: YES');
        console.log('- Flows published: Attempted (may fail without audio)');
        console.log('- Assigned to queues: Attempted');
        console.log();
        console.log('If publishing failed, flows exist but are unpublished.');
        console.log('Queues can still be assigned unpublished flows in some cases.');
        console.log();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

main();
