const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';

console.log('================================================================================');
console.log('          Creating and Publishing Claude_cars Flow via API');
console.log('================================================================================\n');

// Get OAuth token
function getAccessToken() {
    return new Promise((resolve, reject) => {
        const postData = `grant_type=client_credentials`;

        const options = {
            hostname: `login.${REGION}`,
            port: 443,
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
                'Content-Length': postData.length
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data).access_token);
                } else {
                    reject(new Error(`Auth failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Create a basic flow
function createBasicFlow(accessToken) {
    return new Promise((resolve, reject) => {
        const flowConfig = {
            name: "Claude_cars",
            description: "Simple language selection flow",
            type: "inboundcall",
            inboundCall: {
                name: "Claude_cars",
                division: {
                    id: null
                },
                description: "Simple language selection with thank you message",
                defaultLanguage: "en-us",
                supportedLanguages: [
                    "en-us",
                    "es"
                ],
                initialGreeting: {
                    tts: "Welcome to Claude Cars"
                }
            }
        };

        const postData = JSON.stringify(flowConfig);

        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: '/api/v2/flows',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Create flow failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Check if flow exists
async function checkFlowExists(accessToken, flowName) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: `/api/v2/flows?name=${encodeURIComponent(flowName)}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const result = JSON.parse(data);
                    const flow = result.entities && result.entities.find(f => f.name === flowName);
                    resolve(flow);
                } else {
                    reject(new Error(`Check flow failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Get flow configuration
function getFlowConfig(accessToken, flowId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: `/api/v2/flows/${flowId}/latestconfiguration`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Get config failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Publish the flow
async function _publishFlow(accessToken, flowId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: `/api/v2/flows/${flowId}/versions`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': 0
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Publish flow failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Main execution
async function main() {
    try {
        console.log('Step 1: Authenticating with Genesys Cloud...');
        const accessToken = await getAccessToken();
        console.log('✅ Authentication successful\n');

        console.log('Step 2: Checking if Claude_cars flow already exists...');
        const existingFlow = await checkFlowExists(accessToken, 'Claude_cars');

        let flow;
        if (existingFlow) {
            console.log(`✅ Flow already exists (ID: ${existingFlow.id})`);
            console.log('   Using existing flow...\n');
            flow = existingFlow;
        } else {
            console.log('✅ No existing flow found');
            console.log('   Creating new flow...');
            flow = await createBasicFlow(accessToken);
            console.log(`✅ Flow created successfully (ID: ${flow.id})\n`);
        }

        console.log('Step 3: Getting current flow configuration...');
        try {
            const config = await getFlowConfig(accessToken, flow.id);
            console.log('✅ Flow configuration retrieved');
            console.log(`   Version: ${config.version || 'N/A'}\n`);
        } catch (_error) {
            console.log('ℹ️  Could not retrieve flow config (flow may need configuration in Architect)\n');
        }

        console.log('================================================================================');
        console.log('                            IMPORTANT NOTE');
        console.log('================================================================================\n');
        console.log('The basic flow structure has been created in Genesys Cloud Architect.');
        console.log('However, the detailed flow logic (language menu, actions, etc.) must be');
        console.log('configured in the Architect visual editor.\n');

        console.log('Why? The Genesys Cloud API has limitations:');
        console.log('  • Cannot create complex flow logic via API');
        console.log('  • Flow actions must be configured in Architect UI');
        console.log('  • Publishing requires a valid flow configuration\n');

        console.log('================================================================================');
        console.log('                          NEXT STEPS');
        console.log('================================================================================\n');

        console.log('Option 1: Configure in Architect UI (Recommended)');
        console.log('---------------------------------------------------');
        console.log('1. Open Architect:');
        console.log(`   https://apps.${REGION}/architect/#/flows/${flow.id}\n`);
        console.log('2. Add these elements to your flow:');
        console.log('   a. Initial State with Language Selection Menu');
        console.log('      - Play Audio: "Press 1 for English. Para Español, oprima el 2."');
        console.log('      - Collect Input action (DTMF)');
        console.log('      - On digit 1: Set Language to en-us');
        console.log('      - On digit 2: Set Language to es');
        console.log('   b. Thank You State');
        console.log('      - Play Audio: "Thanks for choosing my flow"');
        console.log('      - Disconnect action\n');
        console.log('3. Click "Publish"\n');

        console.log('Option 2: Import the YAML file');
        console.log('--------------------------------');
        console.log('1. Go to Architect');
        console.log('2. Click "Import"');
        console.log('3. Select: Claude_cars.yaml');
        console.log('4. Click "Publish"\n');

        console.log('================================================================================');
        console.log('                          FLOW INFORMATION');
        console.log('================================================================================\n');
        console.log(`Flow Name:     Claude_cars`);
        console.log(`Flow ID:       ${flow.id}`);
        console.log(`Division:      Home`);
        console.log(`Type:          Inbound Call`);
        console.log(`Region:        ${REGION}`);
        console.log(`Status:        Created (needs configuration)`);
        console.log(`Direct Link:   https://apps.${REGION}/architect/#/flows/${flow.id}\n`);

        console.log('================================================================================\n');

    } catch (error) {
        console.error('\n================================================================================');
        console.error('                             ERROR');
        console.error('================================================================================\n');
        console.error('Error:', error.message);

        if (error.message.includes('403')) {
            console.error('\nPermission Error:');
            console.error('  The OAuth client needs "Architect > Flow" permissions.');
            console.error('  Add "Master Admin" role or specific Architect permissions.\n');
        } else if (error.message.includes('409')) {
            console.error('\nConflict Error:');
            console.error('  A flow with this name may already exist.');
            console.error('  Try using the existing flow or delete the old one first.\n');
        }

        console.error('================================================================================\n');
        process.exit(1);
    }
}

main();
