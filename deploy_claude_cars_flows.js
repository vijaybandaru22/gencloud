const { authenticate, makeRequest } = require('./claude_cars_complete_setup.js');
const fs = require('fs');

// Load queue information
const queueInfo = JSON.parse(fs.readFileSync('claude_cars_queue_info.json', 'utf8'));

// Main Inbound Flow Configuration
const mainFlowConfig = {
    name: "Claude_Cars_Main_Flow",
    description: "Main inbound flow for Claude Cars with language selection, menu routing, and geographic queue routing",
    type: "inboundcall",
    inboundCall: {
        name: "Claude_Cars_Main_Flow",
        division: {
            id: null
        },
        startUpRef: "/inboundCall/states/state[Initial_State]",
        defaultLanguage: "en-us",
        supportedLanguages: {
            "en-us": {
                defaultLanguageSkill: {
                    noValue: true
                },
                language: "en-us"
            },
            "es": {
                defaultLanguageSkill: {
                    noValue: true
                },
                language: "es"
            }
        },
        initialGreeting: {
            tts: "Thank you for calling Claude Cars!"
        },
        variables: [
            {
                stringVariable: {
                    name: "Flow.CallerNumber",
                    initialValue: {
                        noValue: true
                    },
                    isInput: false,
                    isOutput: false
                }
            },
            {
                stringVariable: {
                    name: "Flow.CallerLocation",
                    initialValue: {
                        noValue: true
                    },
                    isInput: false,
                    isOutput: false
                }
            },
            {
                stringVariable: {
                    name: "Flow.QueueName",
                    initialValue: {
                        noValue: true
                    },
                    isInput: false,
                    isOutput: false
                }
            },
            {
                stringVariable: {
                    name: "Survey.KnowledgeRating",
                    initialValue: {
                        noValue: true
                    },
                    isInput: false,
                    isOutput: false
                }
            },
            {
                stringVariable: {
                    name: "Survey.QuestionsRating",
                    initialValue: {
                        noValue: true
                    },
                    isInput: false,
                    isOutput: false
                }
            }
        ],
        settingsErrorHandling: {
            errorHandling: {
                disconnect: {
                    none: true
                }
            }
        },
        states: {
            "state[Initial_State]": {
                name: "Initial State",
                refId: "Initial_State",
                actions: [
                    {
                        playAudio: {
                            name: "Welcome Message",
                            audio: {
                                tts: {
                                    "en-us": "Thank you for calling Claude Cars! Your premier destination for innovative vehicles.",
                                    "es": "¡Gracias por llamar a Claude Cars! Su destino principal para vehículos innovadores."
                                }
                            }
                        }
                    },
                    {
                        collectInput: {
                            name: "Select Language",
                            input: {
                                audioOrTts: {
                                    tts: {
                                        "en-us": "For English, press 1. Para Español, presione 2.",
                                        "es": "Para Español, presione 2. For English, press 1."
                                    }
                                }
                            },
                            noEntryTimeout: {
                                lit: {
                                    seconds: 5
                                }
                            },
                            outputs: {
                                success: {
                                    outputActions: [
                                        {
                                            decision: {
                                                name: "Check Language Selection",
                                                condition: {
                                                    exp: "Task.Result == \"1\""
                                                },
                                                outputs: {
                                                    yes: {
                                                        outputActions: [
                                                            {
                                                                setLanguage: {
                                                                    name: "Set English",
                                                                    language: {
                                                                        lit: "en-us"
                                                                    }
                                                                }
                                                            },
                                                            {
                                                                jumpToState: {
                                                                    name: "Jump to Main Menu",
                                                                    targetStateRef: "/inboundCall/states/state[Main_Menu]"
                                                                }
                                                            }
                                                        ]
                                                    },
                                                    no: {
                                                        outputActions: [
                                                            {
                                                                decision: {
                                                                    name: "Check Spanish",
                                                                    condition: {
                                                                        exp: "Task.Result == \"2\""
                                                                    },
                                                                    outputs: {
                                                                        yes: {
                                                                            outputActions: [
                                                                                {
                                                                                    setLanguage: {
                                                                                        name: "Set Spanish",
                                                                                        language: {
                                                                                            lit: "es"
                                                                                        }
                                                                                    }
                                                                                },
                                                                                {
                                                                                    jumpToState: {
                                                                                        name: "Jump to Main Menu",
                                                                                        targetStateRef: "/inboundCall/states/state[Main_Menu]"
                                                                                    }
                                                                                }
                                                                            ]
                                                                        },
                                                                        no: {
                                                                            outputActions: [
                                                                                {
                                                                                    jumpToState: {
                                                                                        name: "Retry Language",
                                                                                        targetStateRef: "/inboundCall/states/state[Initial_State]"
                                                                                    }
                                                                                }
                                                                            ]
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        ]
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            },
            "state[Main_Menu]": {
                name: "Main Menu",
                refId: "Main_Menu",
                actions: [
                    {
                        collectInput: {
                            name: "Menu Selection",
                            input: {
                                audioOrTts: {
                                    tts: {
                                        "en-us": "For Sales, press 1. For Service, press 2. For information about our new models, press 3.",
                                        "es": "Para Ventas, presione 1. Para Servicio, presione 2. Para información sobre nuestros nuevos modelos, presione 3."
                                    }
                                }
                            },
                            noEntryTimeout: {
                                lit: {
                                    seconds: 5
                                }
                            },
                            outputs: {
                                success: {
                                    outputActions: [
                                        {
                                            setVariable: {
                                                name: "Set Caller Number",
                                                variable: {
                                                    var: "Flow.CallerNumber"
                                                },
                                                value: {
                                                    exp: "Call.ANI"
                                                }
                                            }
                                        },
                                        {
                                            jumpToState: {
                                                name: "Route to Geographic Decision",
                                                targetStateRef: "/inboundCall/states/state[Geographic_Routing]"
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            },
            "state[Geographic_Routing]": {
                name: "Geographic Routing",
                refId: "Geographic_Routing",
                actions: [
                    {
                        decision: {
                            name: "Check US Number",
                            condition: {
                                exp: "StartsWith(Call.ANI, \"+1\") || StartsWith(Call.ANI, \"1\")"
                            },
                            outputs: {
                                yes: {
                                    outputActions: [
                                        {
                                            setVariable: {
                                                name: "Set Location US",
                                                variable: {
                                                    var: "Flow.CallerLocation"
                                                },
                                                value: {
                                                    lit: "United States"
                                                }
                                            }
                                        },
                                        {
                                            setVariable: {
                                                name: "Set Queue Name US",
                                                variable: {
                                                    var: "Flow.QueueName"
                                                },
                                                value: {
                                                    lit: "US_Queue"
                                                }
                                            }
                                        },
                                        {
                                            transferToAcd: {
                                                name: "Transfer to US_Queue",
                                                targetQueue: {
                                                    lit: {
                                                        id: queueInfo.US_Queue.id,
                                                        name: queueInfo.US_Queue.name
                                                    }
                                                },
                                                preTransferAudio: {
                                                    tts: {
                                                        "en-us": "Please hold while we connect you to our US team.",
                                                        "es": "Por favor espere mientras lo conectamos con nuestro equipo de Estados Unidos."
                                                    }
                                                },
                                                outputs: {
                                                    success: {
                                                        outputActions: [
                                                            {
                                                                jumpToState: {
                                                                    name: "Post Call Survey",
                                                                    targetStateRef: "/inboundCall/states/state[Survey]"
                                                                }
                                                            }
                                                        ]
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                },
                                no: {
                                    outputActions: [
                                        {
                                            decision: {
                                                name: "Check India Number",
                                                condition: {
                                                    exp: "StartsWith(Call.ANI, \"+91\") || StartsWith(Call.ANI, \"91\")"
                                                },
                                                outputs: {
                                                    yes: {
                                                        outputActions: [
                                                            {
                                                                setVariable: {
                                                                    name: "Set Location India",
                                                                    variable: {
                                                                        var: "Flow.CallerLocation"
                                                                    },
                                                                    value: {
                                                                        lit: "India"
                                                                    }
                                                                }
                                                            },
                                                            {
                                                                setVariable: {
                                                                    name: "Set Queue Name India",
                                                                    variable: {
                                                                        var: "Flow.QueueName"
                                                                    },
                                                                    value: {
                                                                        lit: "India_Queue"
                                                                    }
                                                                }
                                                            },
                                                            {
                                                                transferToAcd: {
                                                                    name: "Transfer to India_Queue",
                                                                    targetQueue: {
                                                                        lit: {
                                                                            id: queueInfo.India_Queue.id,
                                                                            name: queueInfo.India_Queue.name
                                                                        }
                                                                    },
                                                                    preTransferAudio: {
                                                                        tts: {
                                                                            "en-us": "Please hold while we connect you to our India team.",
                                                                            "es": "Por favor espere mientras lo conectamos con nuestro equipo de India."
                                                                        }
                                                                    },
                                                                    outputs: {
                                                                        success: {
                                                                            outputActions: [
                                                                                {
                                                                                    jumpToState: {
                                                                                        name: "Post Call Survey",
                                                                                        targetStateRef: "/inboundCall/states/state[Survey]"
                                                                                    }
                                                                                }
                                                                            ]
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        ]
                                                    },
                                                    no: {
                                                        outputActions: [
                                                            {
                                                                setVariable: {
                                                                    name: "Set Location Default",
                                                                    variable: {
                                                                        var: "Flow.CallerLocation"
                                                                    },
                                                                    value: {
                                                                        lit: "Other"
                                                                    }
                                                                }
                                                            },
                                                            {
                                                                setVariable: {
                                                                    name: "Set Queue Name Default",
                                                                    variable: {
                                                                        var: "Flow.QueueName"
                                                                    },
                                                                    value: {
                                                                        lit: "US_Queue"
                                                                    }
                                                                }
                                                            },
                                                            {
                                                                transferToAcd: {
                                                                    name: "Transfer to US_Queue Default",
                                                                    targetQueue: {
                                                                        lit: {
                                                                            id: queueInfo.US_Queue.id,
                                                                            name: queueInfo.US_Queue.name
                                                                        }
                                                                    },
                                                                    preTransferAudio: {
                                                                        tts: {
                                                                            "en-us": "Please hold while we connect you to our team.",
                                                                            "es": "Por favor espere mientras lo conectamos con nuestro equipo."
                                                                        }
                                                                    },
                                                                    outputs: {
                                                                        success: {
                                                                            outputActions: [
                                                                                {
                                                                                    jumpToState: {
                                                                                        name: "Post Call Survey",
                                                                                        targetStateRef: "/inboundCall/states/state[Survey]"
                                                                                    }
                                                                                }
                                                                            ]
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        ]
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            },
            "state[Survey]": {
                name: "Post Call Survey",
                refId: "Survey",
                actions: [
                    {
                        collectInput: {
                            name: "Agent Knowledge Survey",
                            input: {
                                audioOrTts: {
                                    tts: {
                                        "en-us": "Thank you for calling Claude Cars. On a scale of 0 to 5, how would you rate the agent's knowledge? Press a number from 0 to 5.",
                                        "es": "Gracias por llamar a Claude Cars. En una escala de 0 a 5, ¿cómo calificaría el conocimiento del agente? Presione un número del 0 al 5."
                                    }
                                }
                            },
                            noEntryTimeout: {
                                lit: {
                                    seconds: 10
                                }
                            },
                            outputs: {
                                success: {
                                    outputActions: [
                                        {
                                            setVariable: {
                                                name: "Store Knowledge Rating",
                                                variable: {
                                                    var: "Survey.KnowledgeRating"
                                                },
                                                value: {
                                                    exp: "Task.Result"
                                                }
                                            }
                                        },
                                        {
                                            collectInput: {
                                                name: "Questions Answered Survey",
                                                input: {
                                                    audioOrTts: {
                                                        tts: {
                                                            "en-us": "Was the agent able to answer all your questions? Press 0 for no, 5 for yes, or any number in between.",
                                                            "es": "¿El agente pudo responder todas sus preguntas? Presione 0 para no, 5 para sí, o cualquier número intermedio."
                                                        }
                                                    }
                                                },
                                                noEntryTimeout: {
                                                    lit: {
                                                        seconds: 10
                                                    }
                                                },
                                                outputs: {
                                                    success: {
                                                        outputActions: [
                                                            {
                                                                setVariable: {
                                                                    name: "Store Questions Rating",
                                                                    variable: {
                                                                        var: "Survey.QuestionsRating"
                                                                    },
                                                                    value: {
                                                                        exp: "Task.Result"
                                                                    }
                                                                }
                                                            },
                                                            {
                                                                playAudio: {
                                                                    name: "Thank You",
                                                                    audio: {
                                                                        tts: {
                                                                            "en-us": "Thank you for your feedback. Have a great day!",
                                                                            "es": "Gracias por sus comentarios. ¡Que tenga un buen día!"
                                                                        }
                                                                    }
                                                                }
                                                            },
                                                            {
                                                                disconnect: {
                                                                    name: "End Call"
                                                                }
                                                            }
                                                        ]
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        }
    }
};

// Create main flow
async function createMainFlow(token) {
    console.log('📞 Creating main inbound call flow...\n');

    try {
        const flow = await makeRequest('POST', '/api/v2/flows', mainFlowConfig, token);
        console.log(`✅ Main flow created: ${flow.name}`);
        console.log(`   Flow ID: ${flow.id}`);
        console.log(`   Version: ${flow.version}\n`);
        return flow;
    } catch (error) {
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
            console.log('ℹ️  Flow already exists, fetching...');
            const flows = await makeRequest('GET', '/api/v2/flows?type=INBOUNDCALL', null, token);
            const existing = flows.entities.find(f => f.name === 'Claude_Cars_Main_Flow');
            if (existing) {
                console.log(`✅ Found existing flow: ${existing.name} (ID: ${existing.id})\n`);
                return existing;
            }
        }
        throw error;
    }
}

// Create in-queue flow (US)
async function createUSInQueueFlow(token) {
    console.log('⏳ Creating US in-queue flow...\n');

    const usInQueueConfig = {
        name: "US_Queue_InQueue_Flow",
        description: "In-queue experience for US_Queue with 3-minute wait threshold",
        type: "inqueuecall"
    };

    try {
        const flow = await makeRequest('POST', '/api/v2/flows', usInQueueConfig, token);
        console.log(`✅ US in-queue flow created: ${flow.name}`);
        console.log(`   Flow ID: ${flow.id}\n`);
        return flow;
    } catch (error) {
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
            console.log('ℹ️  US in-queue flow already exists, fetching...');
            const flows = await makeRequest('GET', '/api/v2/flows?type=INQUEUECALL', null, token);
            const existing = flows.entities.find(f => f.name === 'US_Queue_InQueue_Flow');
            if (existing) {
                console.log(`✅ Found existing flow: ${existing.name} (ID: ${existing.id})\n`);
                return existing;
            }
        }
        throw error;
    }
}

// Create in-queue flow (India)
async function createIndiaInQueueFlow(token) {
    console.log('⏳ Creating India in-queue flow...\n');

    const indiaInQueueConfig = {
        name: "India_Queue_InQueue_Flow",
        description: "In-queue experience for India_Queue with 2-minute wait threshold",
        type: "inqueuecall"
    };

    try {
        const flow = await makeRequest('POST', '/api/v2/flows', indiaInQueueConfig, token);
        console.log(`✅ India in-queue flow created: ${flow.name}`);
        console.log(`   Flow ID: ${flow.id}\n`);
        return flow;
    } catch (error) {
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
            console.log('ℹ️  India in-queue flow already exists, fetching...');
            const flows = await makeRequest('GET', '/api/v2/flows?type=INQUEUECALL', null, token);
            const existing = flows.entities.find(f => f.name === 'India_Queue_InQueue_Flow');
            if (existing) {
                console.log(`✅ Found existing flow: ${existing.name} (ID: ${existing.id})\n`);
                return existing;
            }
        }
        throw error;
    }
}

// Publish flow
async function publishFlow(token, flowId, flowName) {
    console.log(`📤 Publishing ${flowName}...`);

    try {
        const result = await makeRequest('POST', `/api/v2/flows/${flowId}/publish`, {}, token);
        console.log(`✅ ${flowName} published (Version: ${result.version})\n`);
        return result;
    } catch (error) {
        console.error(`❌ Failed to publish ${flowName}:`, error.message);
        throw error;
    }
}

// Assign in-queue flow to queue
async function assignInQueueFlow(token, queueId, queueName, flowId) {
    console.log(`🔗 Assigning in-queue flow to ${queueName}...`);

    try {
        const queue = await makeRequest('GET', `/api/v2/routing/queues/${queueId}`, null, token);

        const updatedQueue = {
            ...queue,
            queueFlow: {
                id: flowId
            }
        };

        await makeRequest('PUT', `/api/v2/routing/queues/${queueId}`, updatedQueue, token);
        console.log(`✅ In-queue flow assigned to ${queueName}\n`);
    } catch (error) {
        console.error(`❌ Failed to assign flow to ${queueName}:`, error.message);
        // Don't throw - this can be done manually
    }
}

// Main deployment function
async function deployAll() {
    try {
        console.log('🚗 Claude Cars - Flow Deployment');
        console.log('===================================\n');

        // Step 1: Authenticate
        const token = await authenticate();

        // Step 2: Create and publish main flow
        const mainFlow = await createMainFlow(token);
        await publishFlow(token, mainFlow.id, 'Main Flow');

        // Step 3: Create and publish US in-queue flow
        const usInQueue = await createUSInQueueFlow(token);
        await publishFlow(token, usInQueue.id, 'US In-Queue Flow');

        // Step 4: Create and publish India in-queue flow
        const indiaInQueue = await createIndiaInQueueFlow(token);
        await publishFlow(token, indiaInQueue.id, 'India In-Queue Flow');

        // Step 5: Assign in-queue flows to queues
        await assignInQueueFlow(token, queueInfo.US_Queue.id, 'US_Queue', usInQueue.id);
        await assignInQueueFlow(token, queueInfo.India_Queue.id, 'India_Queue', indiaInQueue.id);

        // Save flow IDs
        const flowInfo = {
            mainFlow: {
                id: mainFlow.id,
                name: mainFlow.name
            },
            usInQueueFlow: {
                id: usInQueue.id,
                name: usInQueue.name
            },
            indiaInQueueFlow: {
                id: indiaInQueue.id,
                name: indiaInQueue.name
            },
            queues: queueInfo
        };

        fs.writeFileSync('claude_cars_deployed_flows.json', JSON.stringify(flowInfo, null, 2));
        console.log('✅ Flow information saved to claude_cars_deployed_flows.json\n');

        console.log('🎉 DEPLOYMENT COMPLETE!\n');
        console.log('Next Steps:');
        console.log('1. Configure DID and call routing in Architect');
        console.log('2. Import YAML files to add detailed flow logic');
        console.log('3. Test the complete flow\n');

    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

// Run deployment
if (require.main === module) {
    deployAll();
}

module.exports = { createMainFlow, createUSInQueueFlow, createIndiaInQueueFlow, publishFlow, deployAll };
