const platformClient = require('purecloud-platform-client-v2');

const client = platformClient.ApiClient.instance;
client.setEnvironment('https://api.usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

async function configureAndPublishFlow() {
    try {
        console.log('🔐 Authenticating...');
        await client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET);
        console.log('✓ Authenticated\n');

        const architectApi = new platformClient.ArchitectApi();
        const routingApi = new platformClient.RoutingApi();

        // Get flow
        console.log('📋 Getting flow...');
        const flows = await architectApi.getFlows({
            type: 'inboundcall',
            name: 'Claude_cars'
        });

        if (!flows.entities || flows.entities.length === 0) {
            throw new Error('Claude_cars flow not found');
        }

        const flowId = flows.entities[0].id;
        console.log(`✓ Found flow: ${flowId}\n`);

        // Get queues
        const usQueueResp = await routingApi.getRoutingQueues({ name: 'US_Queue' });
        const indiaQueueResp = await routingApi.getRoutingQueues({ name: 'India_Queue' });

        const usQueue = usQueueResp.entities[0];
        const indiaQueue = indiaQueueResp.entities[0];

        console.log('✓ US_Queue:', usQueue.id);
        console.log('✓ India_Queue:', indiaQueue.id);

        // Configure the flow
        console.log('\n🔧 Configuring flow...');

        const flowConfig = {
            name: 'Claude_cars',
            description: 'Claude Cars complete inbound flow with language selection, hold music, promo, and geographic routing',
            type: 'inboundcall',
            startUpRef: '/inboundCall/menus/menu[MainMenu]',
            defaultLanguage: 'en-us',
            supportedLanguages: {
                'en-us': {
                    defaultLanguageSkill: {
                        noValue: true
                    }
                },
                'es': {
                    defaultLanguageSkill: {
                        noValue: true
                    }
                }
            },
            initialGreeting: {
                tts: 'Welcome to Claude Cars'
            },
            variables: [
                {
                    stringVariable: {
                        name: 'Flow.selectedLanguage',
                        initialValue: {
                            lit: 'English'
                        }
                    }
                },
                {
                    stringVariable: {
                        name: 'Flow.callerNumber',
                        initialValue: {
                            noValue: true
                        }
                    }
                },
                {
                    stringVariable: {
                        name: 'Flow.callerLocation',
                        initialValue: {
                            noValue: true
                        }
                    }
                },
                {
                    stringVariable: {
                        name: 'Flow.department',
                        initialValue: {
                            noValue: true
                        }
                    }
                }
            ],
            settingsInboundCallFlow: {
                disconnectOnSessionTimeout: true,
                settingsErrorHandling: {
                    errorHandling: {
                        disconnect: {
                            none: true
                        }
                    }
                }
            },
            menus: [
                {
                    menu: {
                        name: 'MainMenu',
                        refId: 'MainMenu',
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
                                                language: {
                                                    lit: 'en-us'
                                                }
                                            }
                                        },
                                        {
                                            updateData: {
                                                name: 'Store English',
                                                statements: [
                                                    {
                                                        string: {
                                                            variable: 'Flow.selectedLanguage',
                                                            value: {
                                                                lit: 'English'
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        },
                                        {
                                            callTask: {
                                                name: 'Go to Hold Task',
                                                targetTaskRef: '/inboundCall/tasks/task[HoldTask]'
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
                                                language: {
                                                    lit: 'es'
                                                }
                                            }
                                        },
                                        {
                                            updateData: {
                                                name: 'Store Spanish',
                                                statements: [
                                                    {
                                                        string: {
                                                            variable: 'Flow.selectedLanguage',
                                                            value: {
                                                                lit: 'Spanish'
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        },
                                        {
                                            callTask: {
                                                name: 'Go to Hold Task',
                                                targetTaskRef: '/inboundCall/tasks/task[HoldTask]'
                                            }
                                        }
                                    ]
                                }
                            }
                        ],
                        menuConfiguration: {
                            noInputAudio: {
                                tts: 'No input received.'
                            },
                            noMatchAudio: {
                                tts: 'Invalid selection.'
                            },
                            repeatCount: {
                                lit: 3
                            }
                        }
                    }
                },
                {
                    menu: {
                        name: 'ServiceMenu',
                        refId: 'ServiceMenu',
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
                                                name: 'Set Sales',
                                                statements: [
                                                    {
                                                        string: {
                                                            variable: 'Flow.department',
                                                            value: {
                                                                lit: 'Sales'
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        },
                                        {
                                            callTask: {
                                                name: 'Route Call',
                                                targetTaskRef: '/inboundCall/tasks/task[RouteTask]'
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
                                                name: 'Set Service',
                                                statements: [
                                                    {
                                                        string: {
                                                            variable: 'Flow.department',
                                                            value: {
                                                                lit: 'Service'
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        },
                                        {
                                            callTask: {
                                                name: 'Route Call',
                                                targetTaskRef: '/inboundCall/tasks/task[RouteTask]'
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
                                                name: 'Set New Models',
                                                statements: [
                                                    {
                                                        string: {
                                                            variable: 'Flow.department',
                                                            value: {
                                                                lit: 'New Models'
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        },
                                        {
                                            callTask: {
                                                name: 'Route Call',
                                                targetTaskRef: '/inboundCall/tasks/task[RouteTask]'
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
                        name: 'HoldTask',
                        refId: 'HoldTask',
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
                                    duration: {
                                        lit: {
                                            seconds: 30
                                        }
                                    }
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
                                callMenu: {
                                    name: 'Service Menu',
                                    targetMenuRef: '/inboundCall/menus/menu[ServiceMenu]'
                                }
                            }
                        ]
                    }
                },
                {
                    task: {
                        name: 'RouteTask',
                        refId: 'RouteTask',
                        actions: [
                            {
                                updateData: {
                                    name: 'Get Caller Info',
                                    statements: [
                                        {
                                            string: {
                                                variable: 'Flow.callerNumber',
                                                value: {
                                                    exp: 'ToString(Call.Ani)'
                                                }
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                decision: {
                                    name: 'Geographic Decision',
                                    condition: {
                                        or: [
                                            {
                                                startsWith: {
                                                    lhs: {
                                                        exp: 'ToString(Call.Ani)'
                                                    },
                                                    rhs: {
                                                        lit: '+91'
                                                    }
                                                }
                                            },
                                            {
                                                startsWith: {
                                                    lhs: {
                                                        exp: 'ToString(Call.Ani)'
                                                    },
                                                    rhs: {
                                                        lit: '91'
                                                    }
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
                                                                variable: 'Flow.callerLocation',
                                                                value: {
                                                                    lit: 'India'
                                                                }
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                setScreenPopData: {
                                                    name: 'Set Script India',
                                                    screenPopData: [
                                                        {
                                                            attribute: {
                                                                name: 'Queue Name',
                                                                value: {
                                                                    lit: 'India_Queue'
                                                                }
                                                            }
                                                        },
                                                        {
                                                            attribute: {
                                                                name: 'Caller Number',
                                                                value: {
                                                                    exp: 'Flow.callerNumber'
                                                                }
                                                            }
                                                        },
                                                        {
                                                            attribute: {
                                                                name: 'Caller Location',
                                                                value: {
                                                                    lit: 'India'
                                                                }
                                                            }
                                                        },
                                                        {
                                                            attribute: {
                                                                name: 'Department',
                                                                value: {
                                                                    exp: 'Flow.department'
                                                                }
                                                            }
                                                        },
                                                        {
                                                            attribute: {
                                                                name: 'Language',
                                                                value: {
                                                                    exp: 'Flow.selectedLanguage'
                                                                }
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                transferToAcd: {
                                                    name: 'Transfer to India',
                                                    targetQueue: {
                                                        lit: {
                                                            name: 'India_Queue',
                                                            id: indiaQueue.id
                                                        }
                                                    },
                                                    preTransferAudio: {
                                                        tts: 'Please hold while we connect you to our India team.'
                                                    },
                                                    priority: {
                                                        lit: 0
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
                                                                variable: 'Flow.callerLocation',
                                                                value: {
                                                                    lit: 'United States'
                                                                }
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                setScreenPopData: {
                                                    name: 'Set Script US',
                                                    screenPopData: [
                                                        {
                                                            attribute: {
                                                                name: 'Queue Name',
                                                                value: {
                                                                    lit: 'US_Queue'
                                                                }
                                                            }
                                                        },
                                                        {
                                                            attribute: {
                                                                name: 'Caller Number',
                                                                value: {
                                                                    exp: 'Flow.callerNumber'
                                                                }
                                                            }
                                                        },
                                                        {
                                                            attribute: {
                                                                name: 'Caller Location',
                                                                value: {
                                                                    lit: 'United States'
                                                                }
                                                            }
                                                        },
                                                        {
                                                            attribute: {
                                                                name: 'Department',
                                                                value: {
                                                                    exp: 'Flow.department'
                                                                }
                                                            }
                                                        },
                                                        {
                                                            attribute: {
                                                                name: 'Language',
                                                                value: {
                                                                    exp: 'Flow.selectedLanguage'
                                                                }
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                transferToAcd: {
                                                    name: 'Transfer to US',
                                                    targetQueue: {
                                                        lit: {
                                                            name: 'US_Queue',
                                                            id: usQueue.id
                                                        }
                                                    },
                                                    preTransferAudio: {
                                                        tts: 'Please hold while we connect you to our US team.'
                                                    },
                                                    priority: {
                                                        lit: 0
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        ]
                    }
                }
            ]
        };

        // Update the flow with configuration
        console.log('Updating flow configuration...');
        const _updatedFlow = await architectApi.putFlow(flowId, flowConfig);
        console.log('✓ Flow configured successfully\n');

        // Save the configuration
        console.log('💾 Saving configuration...');
        try {
            const _savedConfig = await architectApi.postFlowVersions(flowId, {});
            console.log('✓ Configuration saved\n');
        } catch (saveError) {
            console.log('Note:', saveError.message);
            console.log('Continuing to publish...\n');
        }

        // Publish the flow
        console.log('📤 Publishing flow...');
        await architectApi.postFlowsActionsPublish(flowId);
        console.log('✓ Flow published!\n');

        // Wait for publication
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verify publication
        const verifiedFlow = await architectApi.getFlow(flowId);

        console.log('=' .repeat(70));
        console.log('✅ CLAUDE_CARS FLOW SUCCESSFULLY CONFIGURED AND PUBLISHED');
        console.log('='.repeat(70));
        console.log('\n📊 Flow Details:');
        console.log(`   Name: ${verifiedFlow.name}`);
        console.log(`   ID: ${verifiedFlow.id}`);
        console.log(`   Type: ${verifiedFlow.type}`);
        console.log(`   Status: ${verifiedFlow.publishedVersion ? 'PUBLISHED ✓' : 'Draft'}`);
        if (verifiedFlow.publishedVersion) {
            console.log(`   Version: ${verifiedFlow.publishedVersion.version}`);
            console.log(`   Published: ${verifiedFlow.publishedVersion.datePublished}`);
        }

        console.log('\n🎯 Flow Features Configured:');
        console.log('   ✓ Language Selection Menu (English/Spanish)');
        console.log('   ✓ Hold Music (30 seconds)');
        console.log('   ✓ AI Car Promotional Message');
        console.log('   ✓ Service Menu (Sales/Service/New Models)');
        console.log('   ✓ Geographic Routing (India vs US)');
        console.log('   ✓ Agent Script Data (5 fields)');

        console.log('\n📞 Queues:');
        console.log(`   US_Queue: ${usQueue.id}`);
        console.log(`   India_Queue: ${indiaQueue.id}`);

        console.log('\n🎬 Next Steps:');
        console.log('   1. Assign a DID to the flow');
        console.log('   2. Add agents to US_Queue and India_Queue');
        console.log('   3. Test by calling the DID');

        console.log('\n📄 To export to .i3inboundflow format:');
        console.log(`   archy export --flowId ${flowId} --location usw2.pure.cloud --output Claude_cars.i3inboundflow\n`);

        console.log('🎉 Flow is ready for use!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.body) {
            console.error('\nDetails:', JSON.stringify(error.body, null, 2));
        }
        if (error.stack) {
            console.error('\nStack:', error.stack);
        }
        process.exit(1);
    }
}

configureAndPublishFlow();
