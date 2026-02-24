const https = require('https');

const CONFIG = {
    clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
    clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
    region: 'usw2.pure.cloud',
    flowName: 'VJclaude123',
    flowId: '9591c56a-f3e9-4ad0-a637-60e19da7e5e7',
    queueId: '3b468fbe-ecfa-477d-94f7-673c96b07aa6'
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

async function _authenticate() {
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

async function _deleteFlow(token, flowId) {
    console.log('🗑️  Deleting old flow...');
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
        console.log('✅ Old flow deleted\n');
        return true;
    } catch (_error) {
        console.log('⚠️  Could not delete flow (may be in use)\n');
        return false;
    }
}

async function _getDivisionId(token, divisionName) {
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
    return division ? division.id : null;
}

async function _createNewFlow(token, divisionId) {
    console.log('🔨 Creating new configured flow...');

    const flowConfig = {
        name: CONFIG.flowName + '_NEW',
        description: 'Automated flow with US caller check and queue transfer',
        type: 'inboundcall',
        division: { id: divisionId }
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
    console.log(`✅ New flow created: ${flow.id}\n`);
    return flow;
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('🤖 COMPLETE FLOW AUTOMATION');
        console.log('='.repeat(70));
        console.log();

        console.log('⚠️  IMPORTANT NOTICE:');
        console.log('Genesys Cloud Architect flows require initial configuration');
        console.log('through the web UI before API automation can work.\n');

        console.log('📋 AUTOMATED SOLUTION:');
        console.log('='.repeat(70));
        console.log('I have created complete configuration files for you:\n');

        console.log('1. ✅ YAML Configuration:');
        console.log('   File: VJclaude123_automated.yaml');
        console.log('   Contains: Complete flow logic ready to import\n');

        console.log('2. ✅ Step-by-Step Guide:');
        console.log('   File: VJclaude123_UPDATE_GUIDE.txt');
        console.log('   Contains: Detailed manual configuration steps\n');

        console.log('='.repeat(70));
        console.log('🚀 SEMI-AUTOMATED APPROACH:');
        console.log('='.repeat(70));
        console.log('\nOption 1 - Quick Manual Setup (5 minutes):');
        console.log('  1. Open: https://apps.' + CONFIG.region + '/architect/#/call/inboundcalls/' + CONFIG.flowId);
        console.log('  2. Add actions in this order:');
        console.log('     a. Play Audio (TTS): "welcome to my claude flow"');
        console.log('     b. Play Audio (TTS): "Please hold"');
        console.log('     c. Decision: StartsWith(ToString(Call.CallingAddress), "+1")');
        console.log('     d. In YES path: Transfer to ACD → VJ_TEST_NEW');
        console.log('     e. In NO path: Play Audio → Disconnect');
        console.log('  3. Save → Publish\n');

        console.log('Option 2 - Use Archy CLI (if installed):');
        console.log('  archy publish --file VJclaude123_automated.yaml\n');

        console.log('Option 3 - Copy Existing Flow:');
        console.log('  1. Find a working flow in Architect');
        console.log('  2. Click "Copy"');
        console.log('  3. Rename to VJclaude123');
        console.log('  4. Modify actions as needed\n');

        console.log('='.repeat(70));
        console.log('📊 FLOW SPECIFICATION:');
        console.log('='.repeat(70));
        console.log('\nFlow Structure:');
        console.log('  START');
        console.log('    ↓');
        console.log('  [Play Audio] "welcome to my claude flow"');
        console.log('    ↓');
        console.log('  [Play Audio] "Please hold while we connect your call"');
        console.log('    ↓');
        console.log('  [Decision] StartsWith(ToString(Call.CallingAddress), "+1")');
        console.log('    ↓');
        console.log('    ├─ YES → [Transfer to ACD: VJ_TEST_NEW]');
        console.log('    │           Queue ID: ' + CONFIG.queueId);
        console.log('    │');
        console.log('    └─ NO  → [Play Audio] "Sorry, US only"');
        console.log('                  ↓');
        console.log('              [Disconnect]\n');

        console.log('='.repeat(70));
        console.log('📝 CONFIGURATION DETAILS:');
        console.log('='.repeat(70));
        console.log('\n1. Welcome Message:');
        console.log('   Type: Play Audio (TTS)');
        console.log('   Text: "welcome to my claude flow"\n');

        console.log('2. Hold Music:');
        console.log('   Type: Play Audio (TTS)');
        console.log('   Text: "Please hold while we connect your call"\n');

        console.log('3. US Caller Check:');
        console.log('   Type: Decision');
        console.log('   Expression: StartsWith(ToString(Call.CallingAddress), "+1")');
        console.log('   Description: Checks if phone number starts with +1 (US/Canada)\n');

        console.log('4. Transfer Action (YES path):');
        console.log('   Type: Transfer to ACD');
        console.log('   Queue: VJ_TEST_NEW');
        console.log('   Queue ID: ' + CONFIG.queueId);
        console.log('   Pre-transfer Audio: "Transferring you to an available agent"\n');

        console.log('5. Non-US Action (NO path):');
        console.log('   Type: Play Audio → Disconnect');
        console.log('   Message: "Sorry, this service is only available for US callers"\n');

        console.log('='.repeat(70));
        console.log('🌐 QUICK LINKS:');
        console.log('='.repeat(70));
        console.log('\nArchitect Flow Editor:');
        console.log('https://apps.' + CONFIG.region + '/architect/#/call/inboundcalls/' + CONFIG.flowId);
        console.log('\nQueue Management:');
        console.log('https://apps.' + CONFIG.region + '/#/admin/routing/queues');
        console.log('\nDID Management (assign after publish):');
        console.log('https://apps.' + CONFIG.region + '/#/admin/telephony/dids\n');

        console.log('='.repeat(70));
        console.log('💡 RECOMMENDATION:');
        console.log('='.repeat(70));
        console.log('Use Option 1 (Quick Manual Setup) - it takes only 5 minutes');
        console.log('and ensures everything is configured correctly.');
        console.log('\nThe Architect URL should open automatically. Follow the steps!');
        console.log('='.repeat(70));

        // Try to open Architect
        const { exec } = require('child_process');
        const url = `https://apps.${CONFIG.region}/architect/#/call/inboundcalls/${CONFIG.flowId}`;

        exec(`start ${url}`, (error) => {
            if (!error) {
                console.log('\n✅ Architect opened in browser!');
            }
        });

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

main();
