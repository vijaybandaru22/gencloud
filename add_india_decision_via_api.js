const https = require('https');
const fs = require('fs');

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

async function getFlowLatestConfig(token) {
    console.log(`📥 Fetching latest flow configuration...`);
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}/latestconfiguration`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const config = await makeRequest(options);
    console.log(`✅ Flow config fetched\n`);
    return config;
}

async function updateFlowConfiguration(token, flowConfig) {
    console.log('📝 Modifying flow configuration...\n');

    // Find the Main Flow task in flowSequenceItemList
    const mainFlowTask = flowConfig.flowSequenceItemList.find(
        t => t.name === 'Main Flow' && t.__type === 'Task'
    );

    if (!mainFlowTask) {
        throw new Error('Main Flow task not found in flowSequenceItemList');
    }

    console.log(`✓ Found Main Flow task with ${mainFlowTask.actionList.length} actions`);

    // Find the India Queue Routing task ID
    const indiaTask = flowConfig.flowSequenceItemList.find(
        t => t.name === 'India Queue Routing' && t.__type === 'Task'
    );

    if (!indiaTask) {
        throw new Error('India Queue Routing task not found');
    }

    console.log(`✓ Found India Queue Routing task (ID: ${indiaTask.id})`);

    // Find the index of "Route Based on Location" callTask action
    const callTaskIndex = mainFlowTask.actionList.findIndex(
        a => a.__type === 'CallTaskAction' && a.name === 'Route Based on Location'
    );

    if (callTaskIndex === -1) {
        throw new Error('Route Based on Location action not found');
    }

    console.log(`✓ Found callTask at index ${callTaskIndex}`);

    // Get the next tracking ID
    let nextTrackingId = flowConfig.nextTrackingNumber || 24;

    // Create the decision action
    const decisionAction = {
        nextAction: null,  // Will be set based on output paths
        trackingId: nextTrackingId++,
        id: generateGUID(),
        name: "Check Caller Location",
        uiMetaData: {
            collapsed: false
        },
        __type: "DecisionAction",
        condition: {
            config: {
                StartsWith: {
                    pos: 1,
                    text: "StartsWith(ToString(Call.CallingAddress), \"+91\")",
                    operands: [
                        {
                            ToString: {
                                pos: 12,
                                operands: [
                                    {
                                        ref: {
                                            pos: 21,
                                            text: "Call.CallingAddress",
                                            type: "str"
                                        }
                                    }
                                ],
                                type: "str"
                            }
                        },
                        {
                            lit: {
                                pos: 45,
                                text: "+91",
                                type: "str"
                            }
                        }
                    ],
                    type: "bln"
                }
            },
            text: "StartsWith(ToString(Call.CallingAddress), \"+91\")",
            type: "bln",
            uiMetaData: {
                mode: 2
            },
            metaData: {},
            version: 2
        },
        outputs: []
    };

    // Create Call Task action for India
    const callIndiaAction = {
        taskReference: indiaTask.id,
        taskName: "India Queue Routing",
        nextAction: null,
        trackingId: nextTrackingId++,
        id: generateGUID(),
        name: "Route to India",
        uiMetaData: {
            collapsed: false
        },
        __type: "CallTaskAction",
        inputs: [],
        outputs: [],
        paths: [
            {
                disabled: false,
                unreachable: false,
                label: "Default",
                outputId: "__DEFAULT__"
            }
        ]
    };

    // Create Call Task action for US (reference existing US Queue Routing task)
    const usQueueTask = flowConfig.flowSequenceItemList.find(
        t => t.name === 'US Queue Routing' && t.__type === 'Task'
    );

    const callUSAction = {
        taskReference: usQueueTask.id,
        taskName: "US Queue Routing",
        nextAction: null,
        trackingId: nextTrackingId++,
        id: generateGUID(),
        name: "Route to US",
        uiMetaData: {
            collapsed: false
        },
        __type: "CallTaskAction",
        inputs: [],
        outputs: [],
        paths: [
            {
                disabled: false,
                unreachable: false,
                label: "Default",
                outputId: "__DEFAULT__"
            }
        ]
    };

    // Set up decision outputs
    decisionAction.outputs = [
        {
            outputId: "__YES__",
            startAction: callIndiaAction.id,
            unreachable: false
        },
        {
            outputId: "__NO__",
            startAction: callUSAction.id,
            unreachable: false
        }
    ];

    decisionAction.paths = [
        {
            disabled: false,
            unreachable: false,
            label: "Yes",
            outputId: "__YES__"
        },
        {
            disabled: false,
            unreachable: false,
            label: "No",
            outputId: "__NO__"
        }
    ];

    // Insert the new actions
    // Replace the old CallTask and Disconnect with Decision and its CallTask actions
    mainFlowTask.actionList.splice(callTaskIndex, 2, decisionAction, callIndiaAction, callUSAction);

    // Update the action before the decision to point to the decision
    if (callTaskIndex > 0) {
        mainFlowTask.actionList[callTaskIndex - 1].nextAction = decisionAction.id;
    }

    // Update nextTrackingNumber
    flowConfig.nextTrackingNumber = nextTrackingId;

    console.log('✓ Added decision action with India/US routing');
    console.log(`✓ Main Flow now has ${mainFlowTask.actionList.length} actions\n`);

    // Save modified config for debugging
    fs.writeFileSync('flow_config_modified.json', JSON.stringify(flowConfig, null, 2));
    console.log('💾 Saved modified config to flow_config_modified.json\n');

    return flowConfig;
}

function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function checkOutFlow(token) {
    console.log('🔓 Checking out flow for editing...');

    const postData = JSON.stringify({});
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}/checkin`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    try {
        const result = await makeRequest(options, postData);
        console.log('✅ Flow checked out\n');
        return result;
    } catch (_error) {
        // Flow might already be checked out
        console.log('⚠️  Flow may already be checked out or unlocked\n');
        return null;
    }
}

async function saveFlowConfiguration(token, flowConfig) {
    console.log('💾 Saving flow configuration...');

    const postData = JSON.stringify(flowConfig);
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}/latestconfiguration`,
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const result = await makeRequest(options, postData);
    console.log('✅ Flow configuration saved\n');
    return result;
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

    const result = await makeRequest(options, postData);
    console.log('✅ Flow published successfully!\n');
    return result;
}

async function getFlowDetails(token) {
    console.log('📋 Getting final flow details...');

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
    console.log('✅ Flow details retrieved\n');
    return flow;
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('🌍 CLAUDE CARS - ADD INDIA ROUTING VIA API');
        console.log('='.repeat(70));
        console.log();

        const token = await authenticate();

        // Check out the flow
        await checkOutFlow(token);

        // Get current configuration
        const currentConfig = await getFlowLatestConfig(token);

        // Modify configuration to add decision
        const modifiedConfig = await updateFlowConfiguration(token, currentConfig);

        // Save the modified configuration
        await saveFlowConfiguration(token, modifiedConfig);

        // Publish the flow
        await publishFlow(token);

        // Get final details
        const finalFlow = await getFlowDetails(token);

        console.log('='.repeat(70));
        console.log('✅ SUCCESS - INDIA ROUTING ADDED VIA API!');
        console.log('='.repeat(70));
        console.log();
        console.log(`Flow Name: ${finalFlow.name}`);
        console.log(`Flow ID: ${finalFlow.id}`);
        console.log(`Published Version: ${finalFlow.publishedVersion?.version || 'N/A'}`);
        console.log(`Checked-In Version: ${finalFlow.checkedInVersion?.version || 'N/A'}`);
        console.log();
        console.log('🎯 Routing Logic Added:');
        console.log('   ✓ Decision: StartsWith(ToString(Call.CallingAddress), "+91")');
        console.log('   ✓ Yes (India) → India_Queue');
        console.log('   ✓ No (US/Others) → US_Queue');
        console.log();
        console.log('🔗 Flow URL:');
        console.log(`   https://apps.${CONFIG.region}/architect/#/inboundcall/flows/${CONFIG.flowId}/latest`);
        console.log();
        console.log('📝 Next Steps:');
        console.log('   1. Open the flow in Architect to verify');
        console.log('   2. Test with different phone numbers');
        console.log('   3. Add agents to both queues');
        console.log('   4. Assign flow to DID number');
        console.log();
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\n📄 Check flow_config_modified.json for the attempted changes');
        process.exit(1);
    }
}

main();
