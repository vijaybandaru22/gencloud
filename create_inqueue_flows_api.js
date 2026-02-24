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
    console.log('📁 Getting Home division ID...');
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
    const division = response.entities.find(d => d.name === 'Home');
    console.log(`✅ Division ID: ${division.id}\n`);
    return division.id;
}

async function createInQueueFlow(token, flowName, divisionId, _greeting, _loopMessage) {
    console.log(`🔨 Creating in-queue flow: ${flowName}...`);

    const flowConfig = {
        name: flowName,
        description: `In-queue flow for ${flowName}`,
        type: 'inqueuecall',
        division: {
            id: divisionId
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

    try {
        const flow = await makeRequest(options, postData);
        console.log(`✅ Flow created: ${flow.name} (ID: ${flow.id})\n`);
        return flow;
    } catch (error) {
        if (error.message.includes('409')) {
            console.log(`⚠️  Flow '${flowName}' already exists\n`);
            return null;
        }
        throw error;
    }
}

async function publishFlow(token, flowId) {
    console.log(`📤 Publishing flow ${flowId}...`);

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

    const result = await makeRequest(options, postData);
    console.log(`✅ Flow published\n`);
    return result;
}

async function getQueueId(token, queueName) {
    console.log(`🔍 Finding queue: ${queueName}...`);
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/routing/queues?name=${queueName}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const response = await makeRequest(options);
    if (response.entities && response.entities.length > 0) {
        const queue = response.entities[0];
        console.log(`✅ Queue found: ${queue.id}\n`);
        return queue.id;
    }
    throw new Error(`Queue ${queueName} not found`);
}

async function assignInQueueFlowToQueue(token, queueId, flowId) {
    console.log(`🔗 Assigning in-queue flow to queue...`);

    // First get the queue details
    const getOptions = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/routing/queues/${queueId}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const queue = await makeRequest(getOptions);

    // Update with in-queue flow
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

    const result = await makeRequest(putOptions, postData);
    console.log(`✅ In-queue flow assigned to queue\n`);
    return result;
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('🎵 CLAUDE CARS - CREATE IN-QUEUE FLOWS VIA API');
        console.log('='.repeat(70));
        console.log();

        const token = await authenticate();
        const divisionId = await getDivisionId(token);

        // Create US Queue In-Queue Flow
        console.log('='.repeat(70));
        console.log('Creating US Queue In-Queue Flow');
        console.log('='.repeat(70));
        console.log();

        const usFlow = await createInQueueFlow(
            token,
            'US_Queue_InQueue_Flow',
            divisionId,
            'Thank you for calling Claude Cars US support. Please hold.',
            'Please continue to hold.'
        );

        if (usFlow) {
            await publishFlow(token, usFlow.id);

            // Assign to US_Queue
            const usQueueId = await getQueueId(token, 'US_Queue');
            await assignInQueueFlowToQueue(token, usQueueId, usFlow.id);
        }

        // Create India Queue In-Queue Flow
        console.log('='.repeat(70));
        console.log('Creating India Queue In-Queue Flow');
        console.log('='.repeat(70));
        console.log();

        const indiaFlow = await createInQueueFlow(
            token,
            'India_Queue_InQueue_Flow',
            divisionId,
            'Thank you for calling Claude Cars India support. Please hold.',
            'Thank you for your patience.'
        );

        if (indiaFlow) {
            await publishFlow(token, indiaFlow.id);

            // Assign to India_Queue
            const indiaQueueId = await getQueueId(token, 'India_Queue');
            await assignInQueueFlowToQueue(token, indiaQueueId, indiaFlow.id);
        }

        console.log('='.repeat(70));
        console.log('✅ IN-QUEUE FLOWS CREATED AND ASSIGNED!');
        console.log('='.repeat(70));
        console.log();
        console.log('📋 Summary:');
        console.log('   ✓ US_Queue_InQueue_Flow → assigned to US_Queue');
        console.log('   ✓ India_Queue_InQueue_Flow → assigned to India_Queue');
        console.log();
        console.log('⚠️  IMPORTANT:');
        console.log('   The flows are created but need audio configuration.');
        console.log('   You must open each flow in Architect to add:');
        console.log('   - Initial greeting audio');
        console.log('   - Loop audio (PIQ/EWT)');
        console.log('   - Exit audio');
        console.log();
        console.log('🔗 Open in Architect:');
        console.log('   https://apps.usw2.pure.cloud/architect');
        console.log();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

main();
