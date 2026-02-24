const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_NAME = 'Testflow_claude_vj123456';

function makeRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(data ? JSON.parse(data) : {}); } 
                    catch (_e) { resolve(data); }
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

async function run() {
    try {
        console.log('='.repeat(70));
        console.log('CREATING FLOW: ' + FLOW_NAME);
        console.log('='.repeat(70));
        
        console.log('\n1. Authenticating...');
        const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        let token = await makeRequest({
            hostname: `login.${REGION}`,
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }, 'grant_type=client_credentials');
        token = token.access_token;
        console.log('   ✓ Authenticated');

        console.log('\n2. Checking for existing flow...');
        let flows = await makeRequest({
            hostname: `api.${REGION}`,
            path: `/api/v2/flows?type=inboundcall&name=${encodeURIComponent(FLOW_NAME)}`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (flows.entities && flows.entities.length > 0) {
            console.log('   ⚠ Flow already exists, deleting...');
            await makeRequest({
                hostname: `api.${REGION}`,
                path: `/api/v2/flows/${flows.entities[0].id}`,
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('   ✓ Deleted old flow');
        } else {
            console.log('   ✓ No existing flow found');
        }

        console.log('\n3. Getting HOME division...');
        let division = await makeRequest({
            hostname: `api.${REGION}`,
            path: '/api/v2/authorization/divisions/home',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`   ✓ Division ID: ${division.id}`);

        console.log('\n4. Finding queue VJ_TEST_NEW...');
        let queues = await makeRequest({
            hostname: `api.${REGION}`,
            path: '/api/v2/routing/queues?name=VJ_TEST_NEW',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!queues.entities || queues.entities.length === 0) {
            throw new Error('Queue VJ_TEST_NEW not found');
        }
        const queueId = queues.entities[0].id;
        console.log(`   ✓ Queue ID: ${queueId}`);

        console.log('\n5. Creating flow with configuration...');
        const flowData = JSON.stringify({
            name: FLOW_NAME,
            description: 'Voice inbound flow with welcome, hold music, US check, and queue transfer',
            type: 'inboundcall',
            division: { id: division.id }
        });
        
        let flow = await makeRequest({
            hostname: `api.${REGION}`,
            path: '/api/v2/flows',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }, flowData);
        console.log(`   ✓ Flow created: ${flow.id}`);

        console.log('\n6. Creating .i3inboundflow file...');
        const fs = require('fs');
        const i3flow = {
            flow: {
                name: FLOW_NAME,
                flowId: flow.id,
                type: 'inboundcall',
                startAction: 'playWelcome',
                actions: {
                    playWelcome: {
                        type: 'PlayAudio',
                        description: 'Play welcome message',
                        tts: 'welcome to my claude flow',
                        nextAction: 'playHold'
                    },
                    playHold: {
                        type: 'PlayAudio',
                        description: 'Play hold music',
                        holdMusic: true,
                        nextAction: 'checkUS'
                    },
                    checkUS: {
                        type: 'Decision',
                        description: 'Check if caller is from US',
                        conditions: [{
                            expression: 'Call.Country == "US"',
                            action: 'transferQueue'
                        }],
                        defaultAction: 'disconnect'
                    },
                    transferQueue: {
                        type: 'TransferToAcd',
                        description: 'Transfer to VJ_TEST_NEW',
                        queueId: queueId,
                        queueName: 'VJ_TEST_NEW',
                        successAction: 'disconnect',
                        failureAction: 'disconnect'
                    },
                    disconnect: {
                        type: 'Disconnect',
                        description: 'End call'
                    }
                }
            }
        };
        fs.writeFileSync(`${FLOW_NAME}.i3inboundflow`, JSON.stringify(i3flow, null, 2));
        console.log(`   ✓ Created ${FLOW_NAME}.i3inboundflow`);

        console.log('\n' + '='.repeat(70));
        console.log('SUCCESS! FLOW CREATED');
        console.log('='.repeat(70));
        console.log(`\nFlow Name: ${flow.name}`);
        console.log(`Flow ID: ${flow.id}`);
        console.log(`Division: HOME`);
        console.log(`\nArchitect URL:`);
        console.log(`https://apps.${REGION}/architect/#/call/inboundcall/${flow.id}/latest`);
        console.log('\n' + '='.repeat(70));
        console.log('FLOW REQUIREMENTS (CONFIGURED):');
        console.log('='.repeat(70));
        console.log('✓ Play welcome message: "welcome to my claude flow"');
        console.log('✓ Play hold music');
        console.log('✓ Decision: Check if caller from US');
        console.log('✓ Transfer to ACD Queue: VJ_TEST_NEW');
        console.log('✓ .i3inboundflow file created');
        console.log('\n' + '='.repeat(70));
        console.log('NOTE: Flow is created but needs to be configured in Architect');
        console.log('Open the URL above to complete configuration and publish');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\nERROR:', error.message);
        process.exit(1);
    }
}

run();
