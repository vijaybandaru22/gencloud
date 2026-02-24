const https = require('https');
const fs = require('fs');

const CONFIG = {
    clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
    clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
    region: 'usw2.pure.cloud',
    flowId: '9591c56a-f3e9-4ad0-a637-60e19da7e5e7',
    queueId: '3b468fbe-ecfa-477d-94f7-673c96b07aa6' // VJ_TEST_NEW
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

async function updateFlowConfiguration(token) {
    console.log('🔧 Creating flow configuration...');

    // Create the flow configuration with all required actions
    const flowConfig = {
        "name": "VJclaude123",
        "startUpRef": "/flow/states/state[Initial State]",
        "defaultLanguage": "en-us",
        "supportedLanguages": {
            "en-us": {
                "defaultLanguageSkill": {
                    "noValue": true
                }
            }
        },
        "settingsErrorHandling": {
            "errorHandling": {
                "disconnect": {}
            }
        },
        "states": [
            {
                "state": {
                    "name": "Initial State",
                    "refId": "Initial State",
                    "actions": [
                        {
                            "playAudio": {
                                "name": "Welcome Message",
                                "audio": {
                                    "tts": "welcome to my claude flow"
                                }
                            }
                        },
                        {
                            "playAudio": {
                                "name": "Hold Music",
                                "audio": {
                                    "tts": "Please hold while we connect your call"
                                }
                            }
                        },
                        {
                            "decision": {
                                "name": "Check US Caller",
                                "condition": {
                                    "expression": "StartsWith(ToString(Call.CallingAddress), \"+1\")"
                                },
                                "yesActions": [
                                    {
                                        "transferToAcd": {
                                            "name": "Transfer to VJ Queue",
                                            "targetQueue": {
                                                "id": CONFIG.queueId,
                                                "name": "VJ_TEST_NEW"
                                            },
                                            "preTransferAudio": {
                                                "tts": "Transferring you to an available agent"
                                            }
                                        }
                                    }
                                ],
                                "noActions": [
                                    {
                                        "playAudio": {
                                            "name": "Non-US Message",
                                            "audio": {
                                                "tts": "Sorry, this service is only available for US callers"
                                            }
                                        }
                                    },
                                    {
                                        "disconnect": {
                                            "name": "Disconnect Non-US"
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        ]
    };

    console.log('📋 Flow Configuration:');
    console.log('  ✓ Welcome message: "welcome to my claude flow"');
    console.log('  ✓ Hold music message');
    console.log('  ✓ US caller check (phone starts with +1)');
    console.log('  ✓ Transfer to VJ_TEST_NEW queue if US');
    console.log('  ✓ Disconnect with message if non-US\n');

    const postData = JSON.stringify(flowConfig);
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}/configuration`,
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    try {
        const response = await makeRequest(options, postData);
        console.log('✅ Flow configuration updated!\n');

        // Save configuration to file
        fs.writeFileSync('VJclaude123_config.json', postData);
        console.log('💾 Configuration saved to: VJclaude123_config.json\n');

        return response;
    } catch (error) {
        console.log('⚠️  API update failed, trying alternate method...\n');
        throw error;
    }
}

async function publishFlow(token) {
    console.log('📤 Publishing flow...');

    const postData = JSON.stringify({});
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}/publish`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    try {
        const response = await makeRequest(options, postData);
        console.log('✅ Flow published successfully!\n');
        return response;
    } catch (error) {
        console.log('⚠️  Publish failed:', error.message, '\n');
        throw error;
    }
}

async function getFlow(token) {
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    return await makeRequest(options);
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('🤖 AUTOMATED FLOW CONFIGURATION');
        console.log('='.repeat(70));
        console.log('Flow: VJclaude123');
        console.log('ID: ' + CONFIG.flowId);
        console.log('Queue: VJ_TEST_NEW');
        console.log('='.repeat(70));
        console.log();

        const token = await authenticate();

        // Update configuration
        await updateFlowConfiguration(token);

        // Publish the flow
        await publishFlow(token);

        // Get final flow state
        const flow = await getFlow(token);

        console.log('='.repeat(70));
        console.log('✅ AUTOMATION COMPLETE!');
        console.log('='.repeat(70));
        console.log('\n📋 Flow Status:');
        console.log(`   Name: ${flow.name}`);
        console.log(`   ID: ${flow.id}`);
        console.log(`   Type: ${flow.type}`);
        console.log(`   Status: Published & Active ✅`);

        console.log('\n🎯 Configured Actions:');
        console.log('   1. ✓ Play welcome: "welcome to my claude flow"');
        console.log('   2. ✓ Play hold music message');
        console.log('   3. ✓ Decision: Check if US caller (+1 prefix)');
        console.log('   4. ✓ If YES → Transfer to VJ_TEST_NEW queue');
        console.log('   5. ✓ If NO → Play message and disconnect');

        console.log('\n📊 Flow Logic:');
        console.log('   START → Welcome → Hold Music → US Check?');
        console.log('              ↓                      ↓');
        console.log('            YES                    NO');
        console.log('              ↓                      ↓');
        console.log('      Transfer to Queue      Message + Disconnect');

        console.log('\n🌐 View in Architect:');
        console.log(`   https://apps.${CONFIG.region}/architect/#/call/inboundcalls/${flow.id}`);

        console.log('\n📞 Next Step: Assign to Phone Number');
        console.log('   Admin > Telephony > DIDs > Select DID > Assign Flow');

        console.log('\n💾 Files Created:');
        console.log('   • VJclaude123_config.json - Flow configuration backup');

        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n❌ Automation Error:', error.message);

        if (error.message.includes('404') || error.message.includes('no saved')) {
            console.log('\n💡 The flow needs initial setup in Architect UI:');
            console.log('   1. Open: https://apps.' + CONFIG.region + '/architect/#/call/inboundcalls/' + CONFIG.flowId);
            console.log('   2. Manually add the actions as described in the guide');
            console.log('   3. Save and Publish');
            console.log('\n   Refer to: VJclaude123_UPDATE_GUIDE.txt');
        }

        process.exit(1);
    }
}

main();
