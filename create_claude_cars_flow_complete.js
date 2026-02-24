const platformClient = require('purecloud-platform-client-v2');

const client = platformClient.ApiClient.instance;
client.setEnvironment('https://api.usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

async function createClaudeCarsFlow() {
    try {
        console.log('Authenticating with Genesys Cloud...');
        await client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET);
        console.log('Authentication successful!');

        const architectApi = new platformClient.ArchitectApi();

        // First, check if flow already exists
        console.log('\nChecking for existing Claude_cars flow...');
        const existingFlows = await architectApi.getFlows({
            type: 'inboundcall',
            name: 'Claude_cars'
        });

        if (existingFlows.entities && existingFlows.entities.length > 0) {
            console.log('Flow already exists. Deleting old flow...');
            const flowId = existingFlows.entities[0].id;
            await architectApi.deleteFlow(flowId);
            console.log('Old flow deleted successfully');
            // Wait a bit for the deletion to complete
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Get Home division
        console.log('\nGetting Home division...');
        const authApi = new platformClient.AuthorizationApi();
        const divisions = await authApi.getAuthorizationDivisions();
        const homeDivision = divisions.entities.find(div => div.name === 'Home');

        if (!homeDivision) {
            throw new Error('Home division not found');
        }
        console.log(`Home division found: ${homeDivision.id}`);

        // Check if queues exist
        console.log('\nChecking for required queues...');
        const routingApi = new platformClient.RoutingApi();

        let usQueue, indiaQueue;
        try {
            const queues = await routingApi.getRoutingQueues({ name: 'US_Queue' });
            if (queues.entities && queues.entities.length > 0) {
                usQueue = queues.entities[0];
                console.log(`✓ US_Queue found: ${usQueue.id}`);
            }
        } catch (_e) {
            console.log('⚠ US_Queue not found - will need to be created');
        }

        try {
            const queues = await routingApi.getRoutingQueues({ name: 'India_Queue' });
            if (queues.entities && queues.entities.length > 0) {
                indiaQueue = queues.entities[0];
                console.log(`✓ India_Queue found: ${indiaQueue.id}`);
            }
        } catch (_e) {
            console.log('⚠ India_Queue not found - will need to be created');
        }

        // Create queues if they don't exist
        if (!usQueue) {
            console.log('\nCreating US_Queue...');
            usQueue = await routingApi.postRoutingQueues({
                name: 'US_Queue',
                description: 'Queue for US callers - Claude Cars',
                divisionId: homeDivision.id
            });
            console.log(`✓ US_Queue created: ${usQueue.id}`);
        }

        if (!indiaQueue) {
            console.log('\nCreating India_Queue...');
            indiaQueue = await routingApi.postRoutingQueues({
                name: 'India_Queue',
                description: 'Queue for India callers - Claude Cars',
                divisionId: homeDivision.id
            });
            console.log(`✓ India_Queue created: ${indiaQueue.id}`);
        }

        // Create the comprehensive flow
        console.log('\n=== Creating Claude_cars Inbound Flow ===');

        const flowConfig = {
            name: 'Claude_cars',
            description: 'Comprehensive Claude Cars inbound flow with language selection, hold music, promotional message, and geographic routing',
            type: 'inboundcall',
            division: {
                id: homeDivision.id
            },
            inboundCall: {
                name: 'Claude_cars',
                division: homeDivision.id,
                startUpRef: '/inboundCall/menus/menu[Language_Selection]',
                defaultLanguage: 'en-us',
                supportedLanguages: {
                    'en-us': {},
                    'es-us': {}
                },
                initialGreeting: {
                    tts: 'Welcome to Claude Cars'
                },
                settingsInboundCallFlow: {
                    disconnectOnSessionTimeout: true
                },
                variables: [
                    {
                        stringVariable: {
                            name: 'Flow.selectedLanguage',
                            initialValue: { lit: 'en-us' }
                        }
                    },
                    {
                        stringVariable: {
                            name: 'Flow.callerNumber',
                            initialValue: { noValue: true }
                        }
                    },
                    {
                        stringVariable: {
                            name: 'Flow.callerLocation',
                            initialValue: { noValue: true }
                        }
                    },
                    {
                        stringVariable: {
                            name: 'Flow.targetQueue',
                            initialValue: { noValue: true }
                        }
                    },
                    {
                        stringVariable: {
                            name: 'Flow.department',
                            initialValue: { noValue: true }
                        }
                    }
                ],
                menus: [
                    {
                        menu: {
                            name: 'Language Selection',
                            refId: 'Language_Selection',
                            audio: {
                                tts: 'Welcome to Claude Cars. For English, press 1. Para Español, presione 2.'
                            },
                            choices: [
                                {
                                    menuChoice: {
                                        dtmf: '1',
                                        actions: [
                                            {
                                                setLanguage: {
                                                    name: 'Set English',
                                                    language: { lit: 'en-us' }
                                                }
                                            },
                                            {
                                                updateData: {
                                                    name: 'Store Language',
                                                    statements: [
                                                        {
                                                            string: {
                                                                variable: 'Flow.selectedLanguage',
                                                                value: { lit: 'en-us' }
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                jumpToMenu: {
                                                    name: 'To Hold Music',
                                                    targetMenuRef: '/inboundCall/tasks/task[Hold_Music]'
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    menuChoice: {
                                        dtmf: '2',
                                        actions: [
                                            {
                                                setLanguage: {
                                                    name: 'Set Spanish',
                                                    language: { lit: 'es-us' }
                                                }
                                            },
                                            {
                                                updateData: {
                                                    name: 'Store Language',
                                                    statements: [
                                                        {
                                                            string: {
                                                                variable: 'Flow.selectedLanguage',
                                                                value: { lit: 'es-us' }
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                jumpToMenu: {
                                                    name: 'To Hold Music',
                                                    targetMenuRef: '/inboundCall/tasks/task[Hold_Music]'
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                ],
                tasks: [
                    {
                        task: {
                            name: 'Hold Music',
                            refId: 'Hold_Music',
                            actions: [
                                {
                                    playAudio: {
                                        name: 'Hold Message',
                                        audio: {
                                            tts: 'Please hold while we connect your call. Your call is important to us.'
                                        }
                                    }
                                },
                                {
                                    wait: {
                                        name: 'Wait 30 Seconds',
                                        duration: { lit: { seconds: 30 } }
                                    }
                                },
                                {
                                    playAudio: {
                                        name: 'Promotional Message',
                                        audio: {
                                            tts: 'Thank you for your patience. We are excited to introduce our revolutionary new AI car model. This groundbreaking vehicle has the amazing capability to fly during traffic jams and can even travel in rivers. Experience the future of transportation with Claude Cars.'
                                        }
                                    }
                                },
                                {
                                    jumpToMenu: {
                                        name: 'To Service Menu',
                                        targetMenuRef: '/inboundCall/menus/menu[Service_Menu]'
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        };

        // Add Service Menu
        flowConfig.inboundCall.menus.push({
            menu: {
                name: 'Service Menu',
                refId: 'Service_Menu',
                audio: {
                    tts: 'Please select from the following options. Press 1 for Sales. Press 2 for Service. Press 3 for information about New Models.'
                },
                choices: [
                    {
                        menuChoice: {
                            dtmf: '1',
                            actions: [
                                {
                                    updateData: {
                                        name: 'Set Department Sales',
                                        statements: [
                                            {
                                                string: {
                                                    variable: 'Flow.department',
                                                    value: { lit: 'Sales' }
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    jumpToTask: {
                                        name: 'To Geographic Routing',
                                        targetTaskRef: '/inboundCall/tasks/task[Geographic_Routing]'
                                    }
                                }
                            ]
                        }
                    },
                    {
                        menuChoice: {
                            dtmf: '2',
                            actions: [
                                {
                                    updateData: {
                                        name: 'Set Department Service',
                                        statements: [
                                            {
                                                string: {
                                                    variable: 'Flow.department',
                                                    value: { lit: 'Service' }
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    jumpToTask: {
                                        name: 'To Geographic Routing',
                                        targetTaskRef: '/inboundCall/tasks/task[Geographic_Routing]'
                                    }
                                }
                            ]
                        }
                    },
                    {
                        menuChoice: {
                            dtmf: '3',
                            actions: [
                                {
                                    updateData: {
                                        name: 'Set Department New Models',
                                        statements: [
                                            {
                                                string: {
                                                    variable: 'Flow.department',
                                                    value: { lit: 'New Models' }
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    jumpToTask: {
                                        name: 'To Geographic Routing',
                                        targetTaskRef: '/inboundCall/tasks/task[Geographic_Routing]'
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        });

        // Add Geographic Routing and Transfer tasks
        flowConfig.inboundCall.tasks.push({
            task: {
                name: 'Geographic Routing',
                refId: 'Geographic_Routing',
                actions: [
                    {
                        updateData: {
                            name: 'Get Caller Info',
                            statements: [
                                {
                                    string: {
                                        variable: 'Flow.callerNumber',
                                        value: { exp: 'ToString(Call.Ani)' }
                                    }
                                }
                            ]
                        }
                    },
                    {
                        decision: {
                            name: 'Check Location',
                            condition: {
                                or: [
                                    {
                                        startsWith: {
                                            lhs: { exp: 'ToString(Call.Ani)' },
                                            rhs: { lit: '+91' }
                                        }
                                    },
                                    {
                                        startsWith: {
                                            lhs: { exp: 'ToString(Call.Ani)' },
                                            rhs: { lit: '91' }
                                        }
                                    }
                                ]
                            },
                            outputs: {
                                yes: [
                                    {
                                        updateData: {
                                            name: 'Set India',
                                            statements: [
                                                {
                                                    string: {
                                                        variable: 'Flow.targetQueue',
                                                        value: { lit: 'India_Queue' }
                                                    }
                                                },
                                                {
                                                    string: {
                                                        variable: 'Flow.callerLocation',
                                                        value: { lit: 'India' }
                                                    }
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        setScreenPopData: {
                                            name: 'Set Agent Script India',
                                            screenPopData: [
                                                {
                                                    attribute: {
                                                        name: 'Queue Name',
                                                        value: { lit: 'India_Queue' }
                                                    }
                                                },
                                                {
                                                    attribute: {
                                                        name: 'Caller Number',
                                                        value: { exp: 'Flow.callerNumber' }
                                                    }
                                                },
                                                {
                                                    attribute: {
                                                        name: 'Caller Location',
                                                        value: { lit: 'India' }
                                                    }
                                                },
                                                {
                                                    attribute: {
                                                        name: 'Department',
                                                        value: { exp: 'Flow.department' }
                                                    }
                                                },
                                                {
                                                    attribute: {
                                                        name: 'Language',
                                                        value: { exp: 'Flow.selectedLanguage' }
                                                    }
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        transferToAcd: {
                                            name: 'Transfer to India Queue',
                                            targetQueue: {
                                                lit: { name: 'India_Queue', id: indiaQueue.id }
                                            },
                                            preTransferAudio: {
                                                tts: 'Connecting you to our India team.'
                                            }
                                        }
                                    }
                                ],
                                no: [
                                    {
                                        updateData: {
                                            name: 'Set US',
                                            statements: [
                                                {
                                                    string: {
                                                        variable: 'Flow.targetQueue',
                                                        value: { lit: 'US_Queue' }
                                                    }
                                                },
                                                {
                                                    string: {
                                                        variable: 'Flow.callerLocation',
                                                        value: { lit: 'United States' }
                                                    }
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        setScreenPopData: {
                                            name: 'Set Agent Script US',
                                            screenPopData: [
                                                {
                                                    attribute: {
                                                        name: 'Queue Name',
                                                        value: { lit: 'US_Queue' }
                                                    }
                                                },
                                                {
                                                    attribute: {
                                                        name: 'Caller Number',
                                                        value: { exp: 'Flow.callerNumber' }
                                                    }
                                                },
                                                {
                                                    attribute: {
                                                        name: 'Caller Location',
                                                        value: { lit: 'United States' }
                                                    }
                                                },
                                                {
                                                    attribute: {
                                                        name: 'Department',
                                                        value: { exp: 'Flow.department' }
                                                    }
                                                },
                                                {
                                                    attribute: {
                                                        name: 'Language',
                                                        value: { exp: 'Flow.selectedLanguage' }
                                                    }
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        transferToAcd: {
                                            name: 'Transfer to US Queue',
                                            targetQueue: {
                                                lit: { name: 'US_Queue', id: usQueue.id }
                                            },
                                            preTransferAudio: {
                                                tts: 'Connecting you to our US team.'
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                ]
            }
        });

        console.log('\nCreating flow in Genesys Cloud...');
        const createdFlow = await architectApi.postFlows(flowConfig);
        console.log(`✓ Flow created successfully!`);
        console.log(`  Flow ID: ${createdFlow.id}`);
        console.log(`  Flow Name: ${createdFlow.name}`);

        // Publish the flow
        console.log('\nPublishing flow...');
        await architectApi.postFlowsActionsPublish(createdFlow.id);
        console.log('✓ Flow published successfully!');

        // Get the published version
        await new Promise(resolve => setTimeout(resolve, 2000));
        const flowVersions = await architectApi.getFlowVersions(createdFlow.id);
        console.log(`✓ Flow version: ${flowVersions.entities[0].version}`);

        console.log('\n=== FLOW CREATION COMPLETE ===');
        console.log('\nFlow Details:');
        console.log(`  Name: Claude_cars`);
        console.log(`  ID: ${createdFlow.id}`);
        console.log(`  Division: Home`);
        console.log(`  Type: Inbound Call`);
        console.log(`  Status: Published`);
        console.log('\nQueues:');
        console.log(`  US_Queue: ${usQueue.id}`);
        console.log(`  India_Queue: ${indiaQueue.id}`);
        console.log('\nFlow Features:');
        console.log('  ✓ Language selection (English/Spanish)');
        console.log('  ✓ 30-second hold music');
        console.log('  ✓ AI car promotional message');
        console.log('  ✓ Service menu (Sales/Service/New Models)');
        console.log('  ✓ Geographic routing (US/India)');
        console.log('  ✓ Agent script data (Queue, Caller, Location, Department, Language)');
        console.log('\nNext Steps:');
        console.log('  1. Assign a DID to this flow');
        console.log('  2. Add agents to US_Queue and India_Queue');
        console.log('  3. Test the flow by calling the assigned DID');

    } catch (error) {
        console.error('\n❌ Error creating flow:');
        console.error('Error details:', error);
        if (error.body) {
            console.error('Error body:', JSON.stringify(error.body, null, 2));
        }
        process.exit(1);
    }
}

createClaudeCarsFlow();
