const axios = require('axios');

// Configuration
const config = {
  clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
  clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
  region: 'usw2.pure.cloud',
  flowName: 'Claude_cars32'
};

let accessToken = null;
let apiClient = null;

// Get OAuth token
async function getAccessToken() {
  try {
    console.log('🔐 Authenticating with Genesys Cloud...');
    const authString = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await axios.post(
      `https://login.${config.region}/oauth/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    accessToken = response.data.access_token;
    console.log('✅ Authentication successful!');

    apiClient = axios.create({
      baseURL: `https://api.${config.region}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return accessToken;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

// Get or create queues
async function ensureQueuesExist() {
  console.log('\n📋 Checking and creating queues...');

  const queues = ['US_Queue1', 'India_Queue1'];
  const queueIds = {};

  for (const queueName of queues) {
    try {
      const searchResponse = await apiClient.get('/api/v2/routing/queues', {
        params: { name: queueName }
      });

      if (searchResponse.data.entities && searchResponse.data.entities.length > 0) {
        queueIds[queueName] = searchResponse.data.entities[0].id;
        console.log(`✅ Found queue: ${queueName} (${queueIds[queueName]})`);
      } else {
        console.log(`📝 Creating queue: ${queueName}...`);
        const createResponse = await apiClient.post('/api/v2/routing/queues', {
          name: queueName,
          description: `${queueName.includes('US') ? 'US' : 'India'} queue for Claude Cars`,
          acwSettings: {
            wrapupPrompt: 'MANDATORY_TIMEOUT',
            timeoutMs: 30000
          },
          mediaSettings: {
            call: {
              alertingTimeoutSeconds: 30,
              serviceLevel: {
                percentage: 0.8,
                durationMs: 20000
              }
            }
          }
        });
        queueIds[queueName] = createResponse.data.id;
        console.log(`✅ Created queue: ${queueName} (${queueIds[queueName]})`);
      }
    } catch (error) {
      console.error(`⚠️  Error with queue ${queueName}:`, error.response?.data || error.message);
    }
  }

  return queueIds;
}

// Create flow configuration
function createFlowConfiguration(queueIds) {
  return {
    name: config.flowName,
    description: 'Claude Cars - Language selection with geographic routing and menu options',
    type: 'inboundcall',
    startUpRef: '/flow/states/state[Initial_State]',
    defaultLanguage: 'en-us',
    supportedLanguages: {
      'en-us': {
        none: {}
      },
      'es': {
        none: {}
      }
    },
    settingsInboundCall: {
      settingsActionDefaults: {
        callData: {
          processingPrompt: {
            noValue: true
          }
        },
        callBridge: {
          processingPrompt: {
            noValue: true
          }
        },
        playAudioOnSilence: {
          timeout: {
            lit: {
              seconds: 40
            }
          }
        },
        collectInput: {
          noEntryTimeout: {
            lit: {
              seconds: 5
            }
          }
        }
      },
      settingsErrorHandling: {
        errorHandling: {
          disconnect: {
            none: true
          }
        },
        preHandlingAudio: {
          tts: 'An error has occurred. Goodbye.'
        }
      },
      settingsPrompts: {
        ensureAudioInPrompts: false
      }
    },
    variables: [],
    menus: [],
    tasks: [],
    states: [
      {
        name: 'Initial State',
        refId: 'Initial_State',
        actions: [
          {
            collectInput: {
              name: 'Language Selection',
              audioPrompts: [
                {
                  tts: 'Welcome to Claude Cars. For English, press 1. Para Español, oprima 2.'
                }
              ],
              inputs: [
                {
                  digit: '1',
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
                      jumpToTask: {
                        name: 'Go to Geographic Routing',
                        targetState: {
                          stateRef: '/flow/states/state[Geographic_Routing]'
                        }
                      }
                    }
                  ]
                },
                {
                  digit: '2',
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
                      jumpToTask: {
                        name: 'Go to Geographic Routing',
                        targetState: {
                          stateRef: '/flow/states/state[Geographic_Routing]'
                        }
                      }
                    }
                  ]
                }
              ],
              noEntryActions: [
                {
                  jumpToTask: {
                    name: 'Default to Geographic Routing',
                    targetState: {
                      stateRef: '/flow/states/state[Geographic_Routing]'
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      {
        name: 'Geographic Routing',
        refId: 'Geographic_Routing',
        actions: [
          {
            decision: {
              name: 'Check Caller Location',
              condition: {
                startsWith: [
                  {
                    exp: 'Call.Ani'
                  },
                  {
                    lit: '+1'
                  }
                ]
              },
              outputs: {
                yes: {
                  actions: [
                    {
                      jumpToTask: {
                        name: 'Route to US',
                        targetState: {
                          stateRef: '/flow/states/state[US_Menu]'
                        }
                      }
                    }
                  ]
                },
                no: {
                  actions: [
                    {
                      decision: {
                        name: 'Check India Number',
                        condition: {
                          startsWith: [
                            {
                              exp: 'Call.Ani'
                            },
                            {
                              lit: '+91'
                            }
                          ]
                        },
                        outputs: {
                          yes: {
                            actions: [
                              {
                                jumpToTask: {
                                  name: 'Route to India',
                                  targetState: {
                                    stateRef: '/flow/states/state[India_Menu]'
                                  }
                                }
                              }
                            ]
                          },
                          no: {
                            actions: [
                              {
                                jumpToTask: {
                                  name: 'Default to US',
                                  targetState: {
                                    stateRef: '/flow/states/state[US_Menu]'
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
      {
        name: 'US Menu',
        refId: 'US_Menu',
        actions: [
          {
            collectInput: {
              name: 'US Service Menu',
              audioPrompts: [
                {
                  tts: 'Thank you for choosing my flow. For Sales, press 1. For Services, press 2. For New Models, press 3.'
                }
              ],
              inputs: [
                {
                  digit: '1',
                  actions: [
                    {
                      jumpToTask: {
                        name: 'Sales Selected',
                        targetState: {
                          stateRef: '/flow/states/state[US_Queue_Transfer]'
                        }
                      }
                    }
                  ]
                },
                {
                  digit: '2',
                  actions: [
                    {
                      jumpToTask: {
                        name: 'Services Selected',
                        targetState: {
                          stateRef: '/flow/states/state[US_Queue_Transfer]'
                        }
                      }
                    }
                  ]
                },
                {
                  digit: '3',
                  actions: [
                    {
                      jumpToTask: {
                        name: 'New Models Selected',
                        targetState: {
                          stateRef: '/flow/states/state[US_Queue_Transfer]'
                        }
                      }
                    }
                  ]
                }
              ],
              noEntryActions: [
                {
                  jumpToTask: {
                    name: 'No Entry - Default',
                    targetState: {
                      stateRef: '/flow/states/state[US_Queue_Transfer]'
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      {
        name: 'India Menu',
        refId: 'India_Menu',
        actions: [
          {
            collectInput: {
              name: 'India Service Menu',
              audioPrompts: [
                {
                  tts: 'Thank you for choosing my flow. For Sales, press 1. For Services, press 2. For New Models, press 3.'
                }
              ],
              inputs: [
                {
                  digit: '1',
                  actions: [
                    {
                      jumpToTask: {
                        name: 'Sales Selected',
                        targetState: {
                          stateRef: '/flow/states/state[India_Queue_Transfer]'
                        }
                      }
                    }
                  ]
                },
                {
                  digit: '2',
                  actions: [
                    {
                      jumpToTask: {
                        name: 'Services Selected',
                        targetState: {
                          stateRef: '/flow/states/state[India_Queue_Transfer]'
                        }
                      }
                    }
                  ]
                },
                {
                  digit: '3',
                  actions: [
                    {
                      jumpToTask: {
                        name: 'New Models Selected',
                        targetState: {
                          stateRef: '/flow/states/state[India_Queue_Transfer]'
                        }
                      }
                    }
                  ]
                }
              ],
              noEntryActions: [
                {
                  jumpToTask: {
                    name: 'No Entry - Default',
                    targetState: {
                      stateRef: '/flow/states/state[India_Queue_Transfer]'
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      {
        name: 'US Queue Transfer',
        refId: 'US_Queue_Transfer',
        actions: [
          {
            transferToACD: {
              name: 'Transfer to US Queue',
              targetQueue: {
                lit: {
                  id: queueIds['US_Queue1']
                }
              },
              preTransferAudio: {
                noValue: true
              },
              failureActions: [
                {
                  playAudio: {
                    name: 'Queue Unavailable',
                    audioPrompts: [
                      {
                        tts: 'We are sorry, all representatives are currently busy. Please try again later.'
                      }
                    ]
                  }
                },
                {
                  jumpToTask: {
                    name: 'Go to Thank You',
                    targetState: {
                      stateRef: '/flow/states/state[Thank_You]'
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      {
        name: 'India Queue Transfer',
        refId: 'India_Queue_Transfer',
        actions: [
          {
            transferToACD: {
              name: 'Transfer to India Queue',
              targetQueue: {
                lit: {
                  id: queueIds['India_Queue1']
                }
              },
              preTransferAudio: {
                noValue: true
              },
              failureActions: [
                {
                  playAudio: {
                    name: 'Queue Unavailable',
                    audioPrompts: [
                      {
                        tts: 'We are sorry, all representatives are currently busy. Please try again later.'
                      }
                    ]
                  }
                },
                {
                  jumpToTask: {
                    name: 'Go to Thank You',
                    targetState: {
                      stateRef: '/flow/states/state[Thank_You]'
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      {
        name: 'Thank You and Disconnect',
        refId: 'Thank_You',
        actions: [
          {
            playAudio: {
              name: 'Thank You Message',
              audioPrompts: [
                {
                  tts: 'Thanks for choosing my flow. Goodbye.'
                }
              ]
            }
          },
          {
            disconnect: {
              name: 'End Call'
            }
          }
        ]
      }
    ]
  };
}

// Create or update flow
async function createOrUpdateFlow(queueIds) {
  try {
    console.log('\n🎯 Creating/Updating flow:', config.flowName);

    // Check if flow exists
    const searchResponse = await apiClient.get('/api/v2/flows', {
      params: {
        name: config.flowName,
        type: 'inboundcall'
      }
    });

    let flowId;
    let _isNewFlow = false;

    if (searchResponse.data.entities && searchResponse.data.entities.length > 0) {
      flowId = searchResponse.data.entities[0].id;
      console.log('⚠️  Flow exists. Deleting old version...');

      try {
        await apiClient.delete(`/api/v2/flows/${flowId}`);
        console.log('✅ Old flow deleted');
      } catch (_deleteError) {
        console.log('⚠️  Could not delete old flow, will create with new name');
      }
      _isNewFlow = true;
    } else {
      _isNewFlow = true;
    }

    // Create new flow
    console.log('📝 Creating new flow...');
    const flowConfig = createFlowConfiguration(queueIds);

    const createResponse = await apiClient.post('/api/v2/flows', flowConfig);

    flowId = createResponse.data.id;
    console.log('✅ Flow created successfully!');
    console.log('📄 Flow ID:', flowId);
    console.log('📄 Flow Name:', createResponse.data.name);

    return flowId;

  } catch (error) {
    console.error('❌ Error creating flow:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('📋 Error details:', JSON.stringify(error.response.data.details, null, 2));
    }
    throw error;
  }
}

// Publish flow
async function publishFlow(flowId) {
  try {
    console.log('\n🚀 Publishing flow...');

    // First, check in the flow
    console.log('📝 Checking in flow...');
    await apiClient.post(`/api/v2/flows/${flowId}/checkin`);
    console.log('✅ Flow checked in');

    // Then publish
    console.log('📝 Publishing flow...');
    const publishResponse = await apiClient.post(`/api/v2/flows/${flowId}/publish`, {});

    console.log('✅ Flow published successfully!');
    console.log('📄 Published Version:', publishResponse.data.version);

    return publishResponse.data;

  } catch (error) {
    console.error('❌ Error publishing flow:', error.response?.data || error.message);

    // Try alternative publish method
    try {
      console.log('⚠️  Trying alternative publish method...');
      const altPublishResponse = await apiClient.post(`/api/v2/flows/${flowId}/latestconfiguration/publish`);
      console.log('✅ Flow published with alternative method!');
      return altPublishResponse.data;
    } catch (altError) {
      console.error('❌ Alternative publish also failed:', altError.response?.data || altError.message);
      throw error;
    }
  }
}

// Get flow details
async function getFlowDetails(flowId) {
  try {
    console.log('\n📊 Fetching flow details...');

    const flowResponse = await apiClient.get(`/api/v2/flows/${flowId}`);
    const flow = flowResponse.data;

    console.log('\n✅ Flow Details:');
    console.log('  Name:', flow.name);
    console.log('  ID:', flow.id);
    console.log('  Type:', flow.type);
    console.log('  Division:', flow.division?.name || 'Home');
    console.log('  Status:', flow.status);

    if (flow.publishedVersion) {
      console.log('  Published Version:', flow.publishedVersion.version);
      console.log('  Published Date:', new Date(flow.publishedVersion.datePublished).toLocaleString());
    } else {
      console.log('  Published Version: Not published');
    }

    if (flow.checkedInVersion) {
      console.log('  Checked In Version:', flow.checkedInVersion.version);
    }

    return flow;

  } catch (error) {
    console.error('❌ Error fetching flow details:', error.response?.data || error.message);
    return null;
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Claude_cars32 - Complete Flow Creation & Publishing\n');
    console.log('=' .repeat(70));

    // Step 1: Authenticate
    await getAccessToken();

    // Step 2: Ensure queues exist
    const queueIds = await ensureQueuesExist();
    console.log('\n📊 Queue Summary:');
    for (const [name, id] of Object.entries(queueIds)) {
      console.log(`  ${name}: ${id}`);
    }

    // Step 3: Create flow
    const flowId = await createOrUpdateFlow(queueIds);

    // Step 4: Publish flow
    await publishFlow(flowId);

    // Step 5: Verify
    await getFlowDetails(flowId);

    console.log('\n' + '='.repeat(70));
    console.log('✅ COMPLETE SUCCESS!');
    console.log('=' .repeat(70));

    console.log('\n🎉 Your Claude_cars32 flow is now live and ready to use!');
    console.log('\n📋 Flow Features:');
    console.log('  ✓ Language Selection (English/Spanish)');
    console.log('  ✓ Geographic Routing (US/India)');
    console.log('  ✓ Service Menu (Sales/Services/New Models)');
    console.log('  ✓ Queue Transfers (US_Queue1/India_Queue1)');
    console.log('  ✓ Thank You Message & Disconnect');

    console.log('\n📞 Next Steps:');
    console.log('  1. Go to Genesys Cloud Admin > Architect > Inbound Call Flows');
    console.log('  2. Find "Claude_cars32" flow');
    console.log('  3. Assign a DID number to test');
    console.log('  4. Make a test call!');

    return true;

  } catch (error) {
    console.error('\n❌ Process failed:', error.message);
    return false;
  }
}

// Run the script
if (require.main === module) {
  main().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { main };
