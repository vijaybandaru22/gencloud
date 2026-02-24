const { authenticate, makeRequest } = require('./claude_cars_complete_setup.js');
const fs = require('fs');

// Load queue information
const queueInfo = JSON.parse(fs.readFileSync('claude_cars_queue_info.json', 'utf8'));

async function createMainFlow(token) {
    console.log('🎯 Creating Claude Cars Main Inbound Flow...\n');

    const flowConfig = {
        name: "Claude_Cars_Main_Flow",
        description: "Main inbound flow for Claude Cars with language selection, menu routing, and geographic queue routing",
        type: "INBOUNDCALL",
        division: {
            id: null
        },
        inboundCall: {
            startingLanguage: "en-us",
            initialGreeting: {
                tts: "Thank you for calling Claude Cars!"
            },
            languageSelection: {
                enabled: true,
                prompt: {
                    tts: "For English, press 1. Para Español, presione 2."
                },
                options: [
                    {
                        dtmf: "1",
                        language: "en-us",
                        name: "English"
                    },
                    {
                        dtmf: "2",
                        language: "es-us",
                        name: "Spanish"
                    }
                ]
            }
        },
        supportedLanguages: [
            {
                language: "en-us",
                isDefault: true
            },
            {
                language: "es-us",
                isDefault: false
            }
        ]
    };

    try {
        // Create the flow
        const flow = await makeRequest('POST', '/api/v2/flows', flowConfig, token);
        console.log(`✅ Flow created: ${flow.name}`);
        console.log(`   Flow ID: ${flow.id}`);
        console.log(`   Version: ${flow.version}\n`);

        // Save flow information
        const flowInfo = {
            id: flow.id,
            name: flow.name,
            version: flow.version,
            type: flow.type
        };

        fs.writeFileSync('claude_cars_main_flow_info.json', JSON.stringify(flowInfo, null, 2));
        console.log('✅ Flow information saved to claude_cars_main_flow_info.json\n');

        return flow;
    } catch (error) {
        if (error.message.includes('duplicate')) {
            console.log('ℹ️  Flow already exists, fetching...');
            // Get existing flows
            const flows = await makeRequest('GET', '/api/v2/flows?type=INBOUNDCALL&pageSize=100', null, token);
            const existing = flows.entities.find(f => f.name === 'Claude_Cars_Main_Flow');
            if (existing) {
                console.log(`✅ Found existing flow: ${existing.name} (ID: ${existing.id})\n`);
                return existing;
            }
        }
        throw error;
    }
}

async function configureFlowActions(token, flowId) {
    console.log('⚙️  Configuring flow actions...\n');

    // Get the latest flow version
    const flow = await makeRequest('GET', `/api/v2/flows/${flowId}/latestconfiguration`, null, token);
    console.log(`📋 Retrieved flow configuration (version ${flow.version})`);

    // Create flow configuration with all logic
    const flowConfiguration = {
        ...flow,
        flowActions: {
            "start": {
                type: "playAudio",
                audio: {
                    tts: "Thank you for calling Claude Cars!"
                },
                next: "language_selection"
            },
            "language_selection": {
                type: "collectInput",
                prompt: {
                    tts: {
                        "en-us": "For English, press 1. Para Español, presione 2.",
                        "es-us": "Para Español, presione 2. For English, press 1."
                    }
                },
                inputType: "dtmf",
                maxDigits: 1,
                timeout: 5000,
                next: "process_language",
                noInputAction: "language_selection"
            },
            "process_language": {
                type: "switch",
                variable: "Task.CollectedInput",
                cases: {
                    "1": {
                        action: "set_english"
                    },
                    "2": {
                        action: "set_spanish"
                    }
                },
                defaultAction: "language_selection"
            },
            "set_english": {
                type: "setVariable",
                variable: "Flow.Language",
                value: "en-us",
                next: "main_menu"
            },
            "set_spanish": {
                type: "setVariable",
                variable: "Flow.Language",
                value: "es-us",
                next: "main_menu"
            },
            "main_menu": {
                type: "collectInput",
                prompt: {
                    tts: {
                        "en-us": "For Sales, press 1. For Service, press 2. For information about our new models, press 3.",
                        "es-us": "Para Ventas, presione 1. Para Servicio, presione 2. Para información sobre nuestros nuevos modelos, presione 3."
                    }
                },
                inputType: "dtmf",
                maxDigits: 1,
                timeout: 5000,
                next: "geographic_routing"
            },
            "geographic_routing": {
                type: "decision",
                condition: "startsWith(Call.ANI, '+1') || startsWith(Call.ANI, '1')",
                trueAction: "route_to_us",
                falseAction: "check_india"
            },
            "check_india": {
                type: "decision",
                condition: "startsWith(Call.ANI, '+91') || startsWith(Call.ANI, '91')",
                trueAction: "route_to_india",
                falseAction: "route_to_us"
            },
            "route_to_us": {
                type: "transferToACD",
                queue: {
                    id: queueInfo.US_Queue.id,
                    name: queueInfo.US_Queue.name
                },
                priority: 0
            },
            "route_to_india": {
                type: "transferToACD",
                queue: {
                    id: queueInfo.India_Queue.id,
                    name: queueInfo.India_Queue.name
                },
                priority: 0
            }
        }
    };

    try {
        // Update flow configuration
        const updatedFlow = await makeRequest('PUT', `/api/v2/flows/${flowId}`, flowConfiguration, token);
        console.log(`✅ Flow configuration updated successfully\n`);
        return updatedFlow;
    } catch (error) {
        console.error('❌ Failed to update flow configuration:', error.message);
        throw error;
    }
}

async function publishFlow(token, flowId) {
    console.log('📤 Publishing flow...\n');

    try {
        const result = await makeRequest('POST', `/api/v2/flows/${flowId}/publish`, {}, token);
        console.log(`✅ Flow published successfully!`);
        console.log(`   Published Version: ${result.version}\n`);
        return result;
    } catch (error) {
        console.error('❌ Failed to publish flow:', error.message);
        throw error;
    }
}

async function main() {
    try {
        const token = await authenticate();

        // Step 1: Create main flow
        const flow = await createMainFlow(token);

        // Step 2: Configure flow actions (simplified - full configuration done in Architect)
        console.log('ℹ️  Note: Detailed flow logic will be configured via Architect or YAML import\n');

        // Step 3: Save flow ID for next steps
        const flowInfo = {
            mainFlowId: flow.id,
            mainFlowName: flow.name,
            queues: queueInfo
        };

        fs.writeFileSync('claude_cars_flow_ids.json', JSON.stringify(flowInfo, null, 2));
        console.log('✅ All flow IDs saved to claude_cars_flow_ids.json\n');

        console.log('🎉 Main flow creation completed!\n');
        console.log('Next Steps:');
        console.log('1. Import complete flow configuration using Architect');
        console.log('2. Create in-queue flows for US_Queue and India_Queue');
        console.log('3. Create survey flow');
        console.log('4. Test the complete flow\n');

    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { createMainFlow, configureFlowActions, publishFlow };
