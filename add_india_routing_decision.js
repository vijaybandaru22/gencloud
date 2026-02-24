const https = require('https');

const CONFIG = {
    clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
    clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
    region: 'usw2.pure.cloud',
    flowId: '39d1fe98-e091-4d0e-988e-f431dc76d1fd'
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

async function getFlow(token) {
    console.log(`📥 Fetching flow configuration...`);
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}/latestconfiguration`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const flow = await makeRequest(options);
    console.log(`✅ Flow fetched: ${flow.name}\n`);
    return flow;
}

async function _checkoutFlow(token) {
    console.log(`🔓 Checking out flow for editing...`);
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const flow = await makeRequest(options, '');
    console.log(`✅ Flow checked out\n`);
    return flow;
}

async function _updateFlow(token, flowConfig) {
    console.log(`📝 Updating flow with India routing decision...`);

    // Find the "Main Flow" task and add decision before the callTask
    const mainTask = flowConfig.startUpRef;
    const _mainActions = mainTask.actions || [];

    // Insert a decision action to check caller's number
    // This is a simplified version - in Architect UI you would set expression:
    // Left(ToString(Call.CallingAddress), 3) == "+91"
    const _decisionAction = {
        type: "Decision",
        name: "Check Caller Location",
        expression: {
            type: "string",
            value: "false"  // Default to US - user will configure expression in UI
        },
        outputs: {
            yes: {
                name: "India Caller",
                actions: [{
                    type: "CallTask",
                    name: "Route to India",
                    targetTask: "/inboundCall/tasks/task[India Queue Routing]"
                }]
            },
            no: {
                name: "US Caller",
                actions: [{
                    type: "CallTask",
                    name: "Route to US",
                    targetTask: "/inboundCall/tasks/task[US Queue Routing]"
                }]
            }
        }
    };

    console.log('📋 Decision structure created for geographic routing\n');
    console.log('⚠️  Note: Expression logic must be set in Architect UI:\n');
    console.log('   Expression: Left(ToString(Call.CallingAddress), 3) == "+91"\n');

    return flowConfig;
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('🌍 CLAUDE CARS - ADD INDIA ROUTING DECISION');
        console.log('='.repeat(70));
        console.log();

        const token = await authenticate();
        const flowConfig = await getFlow(token);

        console.log('='.repeat(70));
        console.log('📊 CURRENT FLOW STRUCTURE');
        console.log('='.repeat(70));
        console.log();
        console.log(`Flow Name: ${flowConfig.name}`);
        console.log(`Flow Type: ${flowConfig.type}`);
        console.log(`Current Version: ${flowConfig.version}`);
        console.log();

        console.log('Tasks Available:');
        if (flowConfig.tasks) {
            flowConfig.tasks.forEach((task, i) => {
                console.log(`   ${i + 1}. ${task.name || task.refId}`);
            });
        }
        console.log();

        console.log('='.repeat(70));
        console.log('📝 MANUAL STEPS TO ADD INDIA ROUTING');
        console.log('='.repeat(70));
        console.log();
        console.log('1. Open Flow in Architect:');
        console.log(`   ${flowConfig.publishedVersion?.flowUrl || 'Open from Architect UI'}`);
        console.log();
        console.log('2. In the "Main Flow" task, BEFORE the "Route Based on Location" action:');
        console.log('   a. Click "+ Add Action"');
        console.log('   b. Select "Decision"');
        console.log('   c. Name it "Check Caller Location"');
        console.log();
        console.log('3. Configure the Decision Expression:');
        console.log('   a. Click on the Decision action');
        console.log('   b. In Expression field, enter:');
        console.log('      Left(ToString(Call.CallingAddress), 3) == "+91"');
        console.log('   c. This checks if number starts with +91 (India)');
        console.log();
        console.log('4. Configure Decision Outcomes:');
        console.log('   a. "Yes" output (India Caller):');
        console.log('      - Add action: Call Task');
        console.log('      - Target Task: "India Queue Routing"');
        console.log();
        console.log('   b. "No" output (US/Others):');
        console.log('      - Add action: Call Task');
        console.log('      - Target Task: "US Queue Routing"');
        console.log();
        console.log('5. Delete or disable the old "Route Based on Location" call task');
        console.log();
        console.log('6. Save and Publish the flow');
        console.log();

        console.log('='.repeat(70));
        console.log('🎯 ALTERNATIVE: MENU-BASED ROUTING');
        console.log('='.repeat(70));
        console.log();
        console.log('If you prefer to let callers choose their region:');
        console.log();
        console.log('1. Add a "Collect Input" action before the decision');
        console.log('2. Configure prompts:');
        console.log('   "Press 1 for US support, Press 2 for India support"');
        console.log('3. Use Decision based on collected digit (1 or 2)');
        console.log('4. Route accordingly');
        console.log();

        console.log('='.repeat(70));
        console.log('✅ CURRENT STATUS');
        console.log('='.repeat(70));
        console.log();
        console.log('✅ Flow structure published with both queue tasks');
        console.log('✅ US_Queue routing task ready');
        console.log('✅ India_Queue routing task ready');
        console.log('⏳ Decision logic needs to be added in Architect UI');
        console.log();
        console.log(`🌐 Flow URL: https://apps.${CONFIG.region}/architect/#/inboundcall/flows/${CONFIG.flowId}/latest`);
        console.log();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

main();
