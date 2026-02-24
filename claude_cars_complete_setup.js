const https = require('https');
const fs = require('fs');

// Load configuration
const config = JSON.parse(fs.readFileSync('genesys_config.json', 'utf8'));

// Helper function to make API requests
function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.usw2.pure.cloud',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const response = body ? JSON.parse(body) : {};
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(response);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(response)}`));
                    }
                } catch (_e) {
                    reject(new Error(`Failed to parse response: ${body}`));
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Authenticate and get access token
async function authenticate() {
    console.log('🔐 Authenticating with Genesys Cloud...');

    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'login.usw2.pure.cloud',
            port: 443,
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (response.access_token) {
                        console.log('✅ Authentication successful!');
                        resolve(response.access_token);
                    } else {
                        reject(new Error('No access token received'));
                    }
                } catch (_e) {
                    reject(new Error(`Authentication failed: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.write('grant_type=client_credentials');
        req.end();
    });
}

// Create a queue
async function createQueue(token, queueName, description) {
    console.log(`📋 Creating queue: ${queueName}...`);

    const queueData = {
        name: queueName,
        description: description,
        mediaSettings: {
            call: {
                alertingTimeoutSeconds: 30,
                serviceLevel: {
                    percentage: 0.8,
                    durationMs: 20000
                }
            }
        },
        routingRules: [],
        acwSettings: {
            wrapupPrompt: "MANDATORY_TIMEOUT",
            timeoutMs: 300000
        },
        skillEvaluationMethod: "BEST",
        queueFlow: null,
        callingPartyName: `${queueName}`,
        callingPartyNumber: "",
        defaultScripts: {},
        outboundMessagingAddresses: {
            smsAddress: null
        },
        outboundEmailAddress: null
    };

    try {
        const result = await makeRequest('POST', '/api/v2/routing/queues', queueData, token);
        console.log(`✅ Queue created: ${queueName} (ID: ${result.id})`);
        return result;
    } catch (error) {
        // If queue already exists, try to fetch it
        if (error.message.includes('duplicate.name')) {
            console.log(`ℹ️  Queue ${queueName} already exists, fetching details...`);

            // Try to extract queue ID from error message
            const queueIdMatch = error.message.match(/queue ([a-f0-9-]{36})/i);
            if (queueIdMatch) {
                const queueId = queueIdMatch[1];
                console.log(`📋 Fetching queue by ID: ${queueId}`);
                try {
                    const existing = await makeRequest('GET', `/api/v2/routing/queues/${queueId}`, null, token);
                    console.log(`✅ Found existing queue: ${queueName} (ID: ${existing.id})`);
                    return existing;
                } catch (fetchError) {
                    console.error(`❌ Failed to fetch queue:`, fetchError.message);
                }
            }

            // Fallback: try to find in queue list
            const queues = await getQueues(token);
            const existing = queues.find(q => q.name === queueName);
            if (existing) {
                console.log(`✅ Found existing queue: ${queueName} (ID: ${existing.id})`);
                return existing;
            }
        }
        console.error(`❌ Failed to create queue ${queueName}:`, error.message);
        throw error;
    }
}

// Get existing queues
async function getQueues(token) {
    console.log('🔍 Fetching existing queues...');
    try {
        const result = await makeRequest('GET', '/api/v2/routing/queues?pageSize=100', null, token);
        return result.entities || [];
    } catch (error) {
        console.error('❌ Failed to fetch queues:', error.message);
        throw error;
    }
}

// Create or get queue
async function ensureQueue(token, queueName, description) {
    const queues = await getQueues(token);
    const existing = queues.find(q => q.name === queueName);

    if (existing) {
        console.log(`✅ Queue already exists: ${queueName} (ID: ${existing.id})`);
        return existing;
    }

    return await createQueue(token, queueName, description);
}

// Main setup function
async function setupClaudeCars() {
    try {
        console.log('🚗 Claude Cars - Genesys Cloud Setup');
        console.log('=====================================\n');

        // Step 1: Authenticate
        const token = await authenticate();
        console.log('');

        // Step 2: Create Queues
        console.log('📋 Setting up queues...');
        const usQueue = await ensureQueue(token, 'US_Queue', 'Queue for US callers - Claude Cars');
        const indiaQueue = await ensureQueue(token, 'India_Queue', 'Queue for India callers - Claude Cars');
        console.log('');

        // Save queue information
        const queueInfo = {
            US_Queue: {
                id: usQueue.id,
                name: usQueue.name
            },
            India_Queue: {
                id: indiaQueue.id,
                name: indiaQueue.name
            }
        };

        fs.writeFileSync('claude_cars_queue_info.json', JSON.stringify(queueInfo, null, 2));
        console.log('✅ Queue information saved to claude_cars_queue_info.json\n');

        console.log('🎉 Setup completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Create the call flows using Architect');
        console.log('2. Assign DID numbers to the main flow');
        console.log('3. Test the complete flow\n');

        return { token, queues: queueInfo };

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        throw error;
    }
}

// Run setup if called directly
if (require.main === module) {
    setupClaudeCars()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { authenticate, createQueue, ensureQueue, makeRequest, setupClaudeCars };
