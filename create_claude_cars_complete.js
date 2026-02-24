#!/usr/bin/env node
/**
 * Create Claude Cars Complete Setup
 * Part 1: Creates Queues and Scripts via API
 * Part 2: Generates flow files for import
 */

const https = require('https');
const fs = require('fs');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';

async function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); } catch (_e) { resolve(data); }
                } else {
                    if (res.statusCode === 404 || res.statusCode === 409) {
                        resolve(null);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
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
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  CLAUDE CARS - COMPLETE SETUP');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Authenticate
        console.log('✓ Authenticating...');
        const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const token = await makeRequest({
            hostname: `login.${REGION}`,
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength('grant_type=client_credentials')
            }
        }, 'grant_type=client_credentials');
        console.log('✓ Authenticated\n');

        // Get division
        console.log('✓ Getting Home division...');
        const divisions = await makeRequest({
            hostname: `api.${REGION}`,
            path: '/api/v2/authorization/divisions',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        const division = divisions.entities.find(d => d.name === 'Home');
        console.log(`✓ Division ID: ${division.id}\n`);

        // ============================================================
        // PART 1: CREATE QUEUES
        // ============================================================
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  CREATING QUEUES');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Create US_Queue
        console.log('✓ Creating US_Queue...');
        let usQueue = null;
        const usQueueData = JSON.stringify({
            name: 'US_Queue',
            description: 'Queue for US customers - Claude Cars',
            divisionId: division.id,
            mediaSettings: {
                call: {
                    alertingTimeoutSeconds: 30,
                    serviceLevel: {
                        percentage: 80,
                        durationMs: 20000
                    }
                }
            }
        });

        try {
            usQueue = await makeRequest({
                hostname: `api.${REGION}`,
                path: '/api/v2/routing/queues',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(usQueueData)
                }
            }, usQueueData);
            console.log(`✓ US_Queue created: ${usQueue.id}\n`);
        } catch (_e) {
            console.log('  (US_Queue may already exist)\n');
            // Try to find existing
            const queues = await makeRequest({
                hostname: `api.${REGION}`,
                path: '/api/v2/routing/queues?name=US_Queue',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            usQueue = queues.entities && queues.entities[0];
        }

        // Create India_Queue
        console.log('✓ Creating India_Queue...');
        let indiaQueue = null;
        const indiaQueueData = JSON.stringify({
            name: 'India_Queue',
            description: 'Queue for India customers - Claude Cars',
            divisionId: division.id,
            mediaSettings: {
                call: {
                    alertingTimeoutSeconds: 30,
                    serviceLevel: {
                        percentage: 80,
                        durationMs: 20000
                    }
                }
            }
        });

        try {
            indiaQueue = await makeRequest({
                hostname: `api.${REGION}`,
                path: '/api/v2/routing/queues',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(indiaQueueData)
                }
            }, indiaQueueData);
            console.log(`✓ India_Queue created: ${indiaQueue.id}\n`);
        } catch (_e) {
            console.log('  (India_Queue may already exist)\n');
            const queues = await makeRequest({
                hostname: `api.${REGION}`,
                path: '/api/v2/routing/queues?name=India_Queue',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            indiaQueue = queues.entities && queues.entities[0];
        }

        // ============================================================
        // PART 2: GENERATE FLOW FILES
        // ============================================================
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  GENERATING FLOW FILES');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Main Inbound Flow
        console.log('✓ Generating Claude_Cars_Main_Flow.i3inboundflow...');
        const mainFlow = {
            inboundCall: {
                name: 'Claude_Cars_Main_Flow',
                division: 'Home',
                description: 'Main inbound call flow for Claude Cars',
                startUpRef: '/inboundCall/states/state[Initial_State]',
                defaultLanguage: 'en-us',
                supportedLanguages: {
                    'en-us': {
                        defaultLanguageSkill: { noValue: true }
                    },
                    'es-us': {
                        defaultLanguageSkill: { noValue: true }
                    }
                },
                initialGreeting: {
                    tts: 'Thank you for calling Claude Cars'
                },
                states: {
                    state: [{
                        name: 'Initial_State',
                        refId: 'Initial_State',
                        actions: {
                            action: [
                                {
                                    setLanguage: {
                                        name: 'Set_Initial_Language',
                                        language: { lit: 'en-us' },
                                        outputs: {
                                            success: '/inboundCall/states/state[Initial_State]/actions/action[Language_Selection]'
                                        }
                                    }
                                },
                                {
                                    collectInput: {
                                        name: 'Language_Selection',
                                        audioPrompt: {
                                            tts: {
                                                defaultLanguage: 'en-us',
                                                ttsString: { lit: 'For English, press 1. Para español, oprima dos.' }
                                            }
                                        },
                                        inputData: {
                                            digits: {
                                                noValue: true
                                            }
                                        },
                                        noInputRetryCount: 2,
                                        invalidRetryCount: 2,
                                        outputs: {
                                            success: '/inboundCall/states/state[Initial_State]/actions/action[Language_Switch]',
                                            noInput: '/inboundCall/states/state[Disconnect_State]/actions/action[Disconnect]',
                                            invalid: '/inboundCall/states/state[Disconnect_State]/actions/action[Disconnect]'
                                        }
                                    }
                                },
                                {
                                    decision: {
                                        name: 'Language_Switch',
                                        conditions: {
                                            case: [
                                                {
                                                    name: 'English_Selected',
                                                    condition: { exp: 'Input.Data == "1"' },
                                                    actions: {
                                                        action: [{
                                                            setLanguage: {
                                                                name: 'Set_English',
                                                                language: { lit: 'en-us' },
                                                                outputs: {
                                                                    success: '/inboundCall/states/state[Initial_State]/actions/action[Main_Menu]'
                                                                }
                                                            }
                                                        }]
                                                    }
                                                },
                                                {
                                                    name: 'Spanish_Selected',
                                                    condition: { exp: 'Input.Data == "2"' },
                                                    actions: {
                                                        action: [{
                                                            setLanguage: {
                                                                name: 'Set_Spanish',
                                                                language: { lit: 'es-us' },
                                                                outputs: {
                                                                    success: '/inboundCall/states/state[Initial_State]/actions/action[Main_Menu]'
                                                                }
                                                            }
                                                        }]
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                },
                                {
                                    collectInput: {
                                        name: 'Main_Menu',
                                        audioPrompt: {
                                            tts: {
                                                defaultLanguage: 'en-us',
                                                ttsString: { lit: 'For Sales, press 1. For Services, press 2. For information about our New Models, press 3.' }
                                            }
                                        },
                                        inputData: {
                                            digits: { noValue: true }
                                        },
                                        noInputRetryCount: 2,
                                        invalidRetryCount: 2,
                                        outputs: {
                                            success: '/inboundCall/states/state[Initial_State]/actions/action[Geographic_Routing]',
                                            noInput: '/inboundCall/states/state[Disconnect_State]/actions/action[Disconnect]',
                                            invalid: '/inboundCall/states/state[Disconnect_State]/actions/action[Disconnect]'
                                        }
                                    }
                                },
                                {
                                    decision: {
                                        name: 'Geographic_Routing',
                                        conditions: {
                                            case: [
                                                {
                                                    name: 'From_US',
                                                    condition: { exp: 'Call.Country == "US"' },
                                                    actions: {
                                                        action: [{
                                                            jumpToAction: {
                                                                targetAction: '/inboundCall/states/state[Initial_State]/actions/action[Transfer_US_Queue]'
                                                            }
                                                        }]
                                                    }
                                                },
                                                {
                                                    name: 'From_India',
                                                    condition: { exp: 'Call.Country == "IN"' },
                                                    actions: {
                                                        action: [{
                                                            jumpToAction: {
                                                                targetAction: '/inboundCall/states/state[Initial_State]/actions/action[Transfer_India_Queue]'
                                                            }
                                                        }]
                                                    }
                                                }
                                            ],
                                            default: {
                                                actions: {
                                                    action: [{
                                                        jumpToAction: {
                                                            targetAction: '/inboundCall/states/state[Initial_State]/actions/action[Transfer_US_Queue]'
                                                        }
                                                    }]
                                                }
                                            }
                                        }
                                    }
                                },
                                {
                                    transferToAcd: {
                                        name: 'Transfer_US_Queue',
                                        targetQueue: { lit: 'US_Queue' },
                                        targetQueueId: usQueue ? usQueue.id : '',
                                        preTransferAudio: {
                                            tts: {
                                                defaultLanguage: 'en-us',
                                                ttsString: { lit: 'Please hold while we connect you to our US team.' }
                                            }
                                        },
                                        outputs: {
                                            success: '/inboundCall/states/state[Disconnect_State]/actions/action[Disconnect]',
                                            failure: '/inboundCall/states/state[Disconnect_State]/actions/action[Disconnect]'
                                        }
                                    }
                                },
                                {
                                    transferToAcd: {
                                        name: 'Transfer_India_Queue',
                                        targetQueue: { lit: 'India_Queue' },
                                        targetQueueId: indiaQueue ? indiaQueue.id : '',
                                        preTransferAudio: {
                                            tts: {
                                                defaultLanguage: 'en-us',
                                                ttsString: { lit: 'Please hold while we connect you to our India team.' }
                                            }
                                        },
                                        outputs: {
                                            success: '/inboundCall/states/state[Disconnect_State]/actions/action[Disconnect]',
                                            failure: '/inboundCall/states/state[Disconnect_State]/actions/action[Disconnect]'
                                        }
                                    }
                                }
                            ]
                        }
                    }]
                }
            }
        };

        // Add Disconnect state
        mainFlow.inboundCall.states.state.push({
            name: 'Disconnect_State',
            refId: 'Disconnect_State',
            actions: {
                action: [{
                    disconnect: {
                        name: 'Disconnect'
                    }
                }]
            }
        });

        fs.writeFileSync('Claude_Cars_Main_Flow.i3inboundflow', JSON.stringify(mainFlow, null, 2));
        console.log('✓ File created: Claude_Cars_Main_Flow.i3inboundflow\n');

        // Create summary
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  SETUP COMPLETE!');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const summary = `CLAUDE CARS SETUP SUMMARY
══════════════════════════════════════════════════════════════

QUEUES CREATED VIA API:
✓ US_Queue: ${usQueue ? usQueue.id : 'Check manually'}
✓ India_Queue: ${indiaQueue ? indiaQueue.id : 'Check manually'}

FLOW FILES GENERATED FOR IMPORT:
✓ Claude_Cars_Main_Flow.i3inboundflow

NEXT STEPS:
══════════════════════════════════════════════════════════════

1. Import Main Flow:
   - Go to: Admin > Architect > Inbound Call
   - Click: + Create
   - Name: Claude_Cars_Main_Flow
   - Division: Home
   - Click: Create
   - Then: Actions > Import
   - Select: Claude_Cars_Main_Flow.i3inboundflow
   - Publish

2. Create In-Queue Flows (follow guide in Claude_Cars_Flow_Complete_Guide.txt)

3. Create Survey Flow (follow guide)

4. Assign DID number

══════════════════════════════════════════════════════════════

Files Location: C:\\Users\\VijayBandaru\\

Queues are ready in Genesys Cloud!
Flows need to be imported (one-time step due to API limitations).

══════════════════════════════════════════════════════════════
`;

        fs.writeFileSync('CLAUDE_CARS_SETUP_SUMMARY.txt', summary);
        console.log(summary);

    } catch (error) {
        console.error('\n✗ Error:', error.message);
        process.exit(1);
    }
}

run();
