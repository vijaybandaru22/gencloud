const https = require('https');
const fs = require('fs');

const CONFIG = {
    clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
    clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
    region: 'usw2.pure.cloud',
    flowId: '9591c56a-f3e9-4ad0-a637-60e19da7e5e7',
    queueId: '3b468fbe-ecfa-477d-94f7-673c96b07aa6',
    flowName: 'VJclaude123'
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
    console.log('📥 Getting flow details...');
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const flow = await makeRequest(options);
    console.log('✅ Flow retrieved\n');
    return flow;
}

async function checkoutFlow(token) {
    console.log('📤 Checking out flow for editing...');
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}/checkout`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': 0
        }
    };

    try {
        const response = await makeRequest(options, '');
        console.log('✅ Flow checked out\n');
        return response;
    } catch (_error) {
        console.log('⚠️  Flow already checked out or not needed\n');
        return null;
    }
}

async function updateFlowConfiguration(token) {
    console.log('🔧 Attempting to configure flow...\n');

    const flowConfiguration = {
        "name": CONFIG.flowName,
        "description": "Automated configuration with US caller check",
        "type": "inboundcall",
        "startUpRef": "Task_Welcome",
        "defaultLanguage": "en-us",
        "supportedLanguages": {
            "en-us": {
                "defaultLanguageSkill": {
                    "noValue": true
                }
            }
        },
        "variables": [],
        "settingsErrorHandling": {
            "errorHandling": {
                "disconnect": {}
            }
        },
        "settingsPrompts": {
            "ensureAudioInPrompts": false
        },
        "tasks": [
            {
                "name": "Welcome",
                "refId": "Task_Welcome",
                "description": "Play welcome message",
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
                        "callTask": {
                            "name": "Go to Hold Music",
                            "targetTask": {
                                "taskRef": "Task_HoldMusic"
                            }
                        }
                    }
                ]
            },
            {
                "name": "Hold Music",
                "refId": "Task_HoldMusic",
                "description": "Play hold music",
                "actions": [
                    {
                        "playAudio": {
                            "name": "Hold Audio",
                            "audio": {
                                "tts": "Please hold while we connect your call"
                            }
                        }
                    },
                    {
                        "callTask": {
                            "name": "Check US",
                            "targetTask": {
                                "taskRef": "Task_CheckUS"
                            }
                        }
                    }
                ]
            },
            {
                "name": "Check US Caller",
                "refId": "Task_CheckUS",
                "description": "Decision to check if caller is from US",
                "actions": [
                    {
                        "decision": {
                            "name": "Is US Caller",
                            "condition": {
                                "expression": "StartsWith(ToString(Call.CallingAddress), \"+1\")"
                            },
                            "yesActions": [
                                {
                                    "callTask": {
                                        "name": "Transfer",
                                        "targetTask": {
                                            "taskRef": "Task_Transfer"
                                        }
                                    }
                                }
                            ],
                            "noActions": [
                                {
                                    "callTask": {
                                        "name": "Non-US Handler",
                                        "targetTask": {
                                            "taskRef": "Task_NonUS"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            {
                "name": "Transfer to Queue",
                "refId": "Task_Transfer",
                "description": "Transfer US callers to queue",
                "actions": [
                    {
                        "transferToAcd": {
                            "name": "Transfer to VJ Queue",
                            "targetQueue": {
                                "id": CONFIG.queueId
                            },
                            "preTransferAudio": {
                                "tts": "Transferring you to an available agent"
                            }
                        }
                    }
                ]
            },
            {
                "name": "Non-US Handler",
                "refId": "Task_NonUS",
                "description": "Handle non-US callers",
                "actions": [
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
                            "name": "End Call"
                        }
                    }
                ]
            }
        ]
    };

    const postData = JSON.stringify(flowConfiguration);

    // Save configuration to file for reference
    fs.writeFileSync('VJclaude123_api_config.json', postData);
    console.log('💾 Configuration saved to: VJclaude123_api_config.json\n');

    // Try method 1: Update configuration directly
    console.log('Attempt 1: Direct configuration update...');
    try {
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

        const response = await makeRequest(options, postData);
        console.log('✅ SUCCESS: Configuration updated!\n');
        return { success: true, method: 1, response };
    } catch (error1) {
        console.log('❌ Method 1 failed:', error1.message, '\n');

        // Try method 2: Using latest configuration endpoint
        console.log('Attempt 2: Using latest configuration endpoint...');
        try {
            const options2 = {
                hostname: `api.${CONFIG.region}`,
                path: `/api/v2/flows/${CONFIG.flowId}/latestconfiguration`,
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const response2 = await makeRequest(options2, postData);
            console.log('✅ SUCCESS: Configuration updated via method 2!\n');
            return { success: true, method: 2, response: response2 };
        } catch (error2) {
            console.log('❌ Method 2 failed:', error2.message, '\n');
            return { success: false, error: error2.message };
        }
    }
}

async function checkinFlow(token) {
    console.log('💾 Checking in flow (saving)...');
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}/checkin`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': 0
        }
    };

    try {
        const response = await makeRequest(options, '');
        console.log('✅ Flow checked in (saved)\n');
        return response;
    } catch (_error) {
        console.log('⚠️  Check-in not needed or already saved\n');
        return null;
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
        return { success: true, response };
    } catch (error) {
        console.log('❌ Publish failed:', error.message, '\n');
        return { success: false, error: error.message };
    }
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('🚀 FULL AUTOMATION ATTEMPT');
        console.log('='.repeat(70));
        console.log('Flow: VJclaude123');
        console.log('ID: ' + CONFIG.flowId);
        console.log('Queue: VJ_TEST_NEW (' + CONFIG.queueId + ')');
        console.log('='.repeat(70));
        console.log();

        const token = await authenticate();
        const flow = await getFlow(token);

        console.log('📊 Current Flow Status:');
        console.log('  Name: ' + flow.name);
        console.log('  Type: ' + flow.type);
        console.log('  Published Version: ' + (flow.publishedVersion ? flow.publishedVersion.version : 'None'));
        console.log();

        // Step 1: Try to checkout the flow
        await checkoutFlow(token);

        // Step 2: Try to update configuration
        console.log('='.repeat(70));
        console.log('ATTEMPTING CONFIGURATION UPDATE');
        console.log('='.repeat(70));
        console.log();

        const configResult = await updateFlowConfiguration(token);

        if (configResult.success) {
            console.log('='.repeat(70));
            console.log('✅ CONFIGURATION SUCCESSFUL!');
            console.log('='.repeat(70));
            console.log(`Method used: ${configResult.method}\n`);

            // Step 3: Check in (save)
            await checkinFlow(token);

            // Step 4: Publish
            console.log('='.repeat(70));
            console.log('ATTEMPTING PUBLICATION');
            console.log('='.repeat(70));
            console.log();

            const publishResult = await publishFlow(token);

            if (publishResult.success) {
                const finalFlow = await getFlow(token);

                console.log('='.repeat(70));
                console.log('🎉 COMPLETE SUCCESS!');
                console.log('='.repeat(70));
                console.log('\n✅ Flow fully configured and published!\n');

                console.log('📋 Final Flow State:');
                console.log('  Name: ' + finalFlow.name);
                console.log('  ID: ' + finalFlow.id);
                console.log('  Type: ' + finalFlow.type);
                console.log('  Published: YES ✅');
                console.log('  Version: ' + (finalFlow.publishedVersion ? finalFlow.publishedVersion.version : 'N/A'));

                console.log('\n🎯 Configured Features:');
                console.log('  ✓ Welcome message: "welcome to my claude flow"');
                console.log('  ✓ Hold music message');
                console.log('  ✓ US caller detection (+1 prefix)');
                console.log('  ✓ Transfer to VJ_TEST_NEW queue for US');
                console.log('  ✓ Non-US caller handling');

                console.log('\n🌐 View in Architect:');
                console.log(`  https://apps.${CONFIG.region}/architect/#/call/inboundcalls/${finalFlow.id}`);

                console.log('\n📞 Next Step:');
                console.log('  Assign to phone number:');
                console.log('  Admin > Telephony > DIDs > Select DID > Assign VJclaude123');

                console.log('\n' + '='.repeat(70));
                return;
            }
        }

        // If we get here, configuration or publishing failed
        console.log('='.repeat(70));
        console.log('⚠️  PARTIAL SUCCESS / MANUAL STEPS NEEDED');
        console.log('='.repeat(70));
        console.log();
        console.log('The API has limitations for flow configuration.');
        console.log('I have prepared everything for you:\n');

        console.log('✅ Created Files:');
        console.log('  • VJclaude123_automated.yaml - Flow configuration');
        console.log('  • VJclaude123_api_config.json - API format config');
        console.log('  • VJclaude123_UPDATE_GUIDE.txt - Step-by-step guide\n');

        console.log('📝 Quick Manual Steps (5 minutes):');
        console.log('  1. Open: https://apps.' + CONFIG.region + '/architect/#/call/inboundcalls/' + CONFIG.flowId);
        console.log('  2. Add Play Audio: "welcome to my claude flow"');
        console.log('  3. Add Play Audio: "Please hold"');
        console.log('  4. Add Decision: StartsWith(ToString(Call.CallingAddress), "+1")');
        console.log('  5. YES path: Transfer to ACD → VJ_TEST_NEW');
        console.log('  6. NO path: Play Audio + Disconnect');
        console.log('  7. Save → Publish\n');

        console.log('🌐 Open Architect:');
        console.log(`  https://apps.${CONFIG.region}/architect/#/call/inboundcalls/${CONFIG.flowId}`);
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n❌ Automation Error:', error.message);
        console.log('\n💡 Fallback: Use manual configuration guide');
        console.log('   File: VJclaude123_UPDATE_GUIDE.txt');
        process.exit(1);
    }
}

main();
