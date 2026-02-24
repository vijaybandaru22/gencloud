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

async function getDivisionId(token, divisionName) {
    console.log(`📁 Looking up division: ${divisionName}...`);
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
    const division = response.entities.find(d => d.name === divisionName);
    if (!division) throw new Error(`Division '${divisionName}' not found`);

    console.log(`✅ Division found: ${division.id}\n`);
    return division.id;
}

async function createQueue(token, queueName, divisionId, description) {
    console.log(`🔨 Creating queue: ${queueName}...`);

    const queueConfig = {
        name: queueName,
        description: description,
        division: {
            id: divisionId
        },
        mediaSettings: {
            call: {
                alertingTimeoutSeconds: 30,
                serviceLevel: {
                    percentage: 0.8,
                    durationMs: 20000
                }
            }
        },
        acwSettings: {
            wrapupPrompt: "MANDATORY_TIMEOUT",
            timeoutMs: 30000
        },
        skillEvaluationMethod: "BEST",
        autoAnswerOnly: true
    };

    const postData = JSON.stringify(queueConfig);
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: '/api/v2/routing/queues',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    try {
        const queue = await makeRequest(options, postData);
        console.log(`✅ Queue created: ${queue.name} (ID: ${queue.id})\n`);
        return queue;
    } catch (error) {
        if (error.message.includes('409') || error.message.includes('already exists')) {
            console.log(`⚠️  Queue '${queueName}' already exists\n`);
            return null;
        }
        throw error;
    }
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('🏗️  CLAUDE CARS - QUEUE CREATION');
        console.log('='.repeat(70));
        console.log();

        const token = await authenticate();
        const divisionId = await getDivisionId(token, 'Home');

        console.log('='.repeat(70));
        console.log('Creating Queues');
        console.log('='.repeat(70));
        console.log();

        // Create US_Queue
        const usQueue = await createQueue(
            token,
            'US_Queue',
            divisionId,
            'Claude Cars - US Customer Queue'
        );

        // Create India_Queue
        const indiaQueue = await createQueue(
            token,
            'India_Queue',
            divisionId,
            'Claude Cars - India Customer Queue'
        );

        console.log('='.repeat(70));
        console.log('✅ QUEUE CREATION COMPLETE!');
        console.log('='.repeat(70));
        console.log();

        if (usQueue) {
            console.log('📋 US_Queue Details:');
            console.log(`   Name: ${usQueue.name}`);
            console.log(`   ID: ${usQueue.id}`);
            console.log(`   Division: ${usQueue.division.name}`);
            console.log(`   Auto Answer: ${usQueue.autoAnswerOnly}`);
            console.log();
        }

        if (indiaQueue) {
            console.log('📋 India_Queue Details:');
            console.log(`   Name: ${indiaQueue.name}`);
            console.log(`   ID: ${indiaQueue.id}`);
            console.log(`   Division: ${indiaQueue.division.name}`);
            console.log(`   Auto Answer: ${indiaQueue.autoAnswerOnly}`);
            console.log();
        }

        console.log('🌐 Manage Queues:');
        console.log(`   https://apps.${CONFIG.region}/#/admin/routing/queues`);
        console.log();

        console.log('📝 Next Steps:');
        console.log('   1. ✅ Queues created');
        console.log('   2. Add agents to queues (Admin > Queues > Members)');
        console.log('   3. Update Claude_Cars_Flow with queue routing');
        console.log('   4. Create in-queue flows for PIQ/EWT');
        console.log('   5. Test the complete flow');
        console.log();

        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

main();
