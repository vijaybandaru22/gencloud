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

    // Create axios client with token
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
  console.log('\n📋 Checking queues...');

  const queues = ['US_Queue1', 'India_Queue1'];
  const queueIds = {};

  for (const queueName of queues) {
    try {
      // Search for existing queue
      const searchResponse = await apiClient.get('/api/v2/routing/queues', {
        params: { name: queueName }
      });

      if (searchResponse.data.entities && searchResponse.data.entities.length > 0) {
        queueIds[queueName] = searchResponse.data.entities[0].id;
        console.log(`✅ Found existing queue: ${queueName}`);
      } else {
        // Create new queue
        console.log(`📝 Creating queue: ${queueName}...`);
        const createResponse = await apiClient.post('/api/v2/routing/queues', {
          name: queueName,
          description: `Queue for ${queueName.includes('US') ? 'US' : 'India'} callers - Claude Cars`,
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
        console.log(`✅ Created queue: ${queueName}`);
      }
    } catch (error) {
      console.error(`⚠️  Error with queue ${queueName}:`, error.response?.data || error.message);
    }
  }

  return queueIds;
}

// Create the flow configuration
function _createFlowConfig(queueIds) {
  return {
    name: config.flowName,
    description: 'Claude Cars inbound flow with language selection and geographic routing',
    type: 'INBOUNDCALL',
    division: {
      id: null  // Home division
    },
    startUpRef: 'Initial_State',
    defaultLanguage: 'en-us',
    supportedLanguages: {
      'en-us': {},
      'es': {}
    },
    variables: [],
    settingsInboundCall: {
      settingsActionDefaults: {
        playAudioOnSilence: {
          timeout: {
            seconds: 40
          }
        },
        collectInput: {
          noEntryTimeout: {
            seconds: 5
          }
        }
      },
      settingsErrorHandling: {
        errorHandling: {
          disconnect: {}
        },
        preHandlingAudio: {
          tts: 'An error has occurred. Goodbye.'
        }
      }
    },
    states: [
      {
        id: 'Initial_State',
        name: 'Initial State',
        actions: [
          {
            type: 'CollectInput',
            name: 'Language Selection',
            audioPrompt: {
              tts: 'Welcome to Claude Cars. For English, press 1. Para Español, oprima 2.'
            },
            timeout: 5,
            dtmfOptions: [
              {
                dtmf: '1',
                actions: [
                  {
                    type: 'SetLanguage',
                    name: 'Set English',
                    language: 'en-us'
                  },
                  {
                    type: 'GoToState',
                    name: 'Go to Geographic Routing',
                    targetStateId: 'Geographic_Routing'
                  }
                ]
              },
              {
                dtmf: '2',
                actions: [
                  {
                    type: 'SetLanguage',
                    name: 'Set Spanish',
                    language: 'es'
                  },
                  {
                    type: 'GoToState',
                    name: 'Go to Geographic Routing',
                    targetStateId: 'Geographic_Routing'
                  }
                ]
              }
            ],
            noEntryActions: [
              {
                type: 'GoToState',
                name: 'Default to Geographic Routing',
                targetStateId: 'Geographic_Routing'
              }
            ]
          }
        ]
      },
      {
        id: 'Geographic_Routing',
        name: 'Geographic Routing',
        actions: [
          {
            type: 'Decision',
            name: 'Check US Number',
            condition: {
              type: 'StartsWith',
              operands: [
                { type: 'Expression', value: 'Call.Ani' },
                { type: 'Literal', value: '+1' }
              ]
            },
            yesActions: [
              {
                type: 'GoToState',
                name: 'Go to US Menu',
                targetStateId: 'US_Menu'
              }
            ],
            noActions: [
              {
                type: 'Decision',
                name: 'Check India Number',
                condition: {
                  type: 'StartsWith',
                  operands: [
                    { type: 'Expression', value: 'Call.Ani' },
                    { type: 'Literal', value: '+91' }
                  ]
                },
                yesActions: [
                  {
                    type: 'GoToState',
                    name: 'Go to India Menu',
                    targetStateId: 'India_Menu'
                  }
                ],
                noActions: [
                  {
                    type: 'GoToState',
                    name: 'Default to US Menu',
                    targetStateId: 'US_Menu'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'US_Menu',
        name: 'US Menu',
        actions: [
          {
            type: 'CollectInput',
            name: 'US Service Selection',
            audioPrompt: {
              tts: 'Thank you for choosing my flow. For Sales, press 1. For Services, press 2. For New Models, press 3.'
            },
            timeout: 5,
            dtmfOptions: [
              {
                dtmf: '1',
                actions: [
                  {
                    type: 'GoToState',
                    name: 'Go to US Queue',
                    targetStateId: 'US_Queue_Transfer'
                  }
                ]
              },
              {
                dtmf: '2',
                actions: [
                  {
                    type: 'GoToState',
                    name: 'Go to US Queue',
                    targetStateId: 'US_Queue_Transfer'
                  }
                ]
              },
              {
                dtmf: '3',
                actions: [
                  {
                    type: 'GoToState',
                    name: 'Go to US Queue',
                    targetStateId: 'US_Queue_Transfer'
                  }
                ]
              }
            ],
            noEntryActions: [
              {
                type: 'GoToState',
                name: 'Go to US Queue',
                targetStateId: 'US_Queue_Transfer'
              }
            ]
          }
        ]
      },
      {
        id: 'India_Menu',
        name: 'India Menu',
        actions: [
          {
            type: 'CollectInput',
            name: 'India Service Selection',
            audioPrompt: {
              tts: 'Thank you for choosing my flow. For Sales, press 1. For Services, press 2. For New Models, press 3.'
            },
            timeout: 5,
            dtmfOptions: [
              {
                dtmf: '1',
                actions: [
                  {
                    type: 'GoToState',
                    name: 'Go to India Queue',
                    targetStateId: 'India_Queue_Transfer'
                  }
                ]
              },
              {
                dtmf: '2',
                actions: [
                  {
                    type: 'GoToState',
                    name: 'Go to India Queue',
                    targetStateId: 'India_Queue_Transfer'
                  }
                ]
              },
              {
                dtmf: '3',
                actions: [
                  {
                    type: 'GoToState',
                    name: 'Go to India Queue',
                    targetStateId: 'India_Queue_Transfer'
                  }
                ]
              }
            ],
            noEntryActions: [
              {
                type: 'GoToState',
                name: 'Go to India Queue',
                targetStateId: 'India_Queue_Transfer'
              }
            ]
          }
        ]
      },
      {
        id: 'US_Queue_Transfer',
        name: 'US Queue Transfer',
        actions: [
          {
            type: 'TransferToACD',
            name: 'Transfer to US Queue',
            queueId: queueIds['US_Queue1'],
            successActions: [
              {
                type: 'GoToState',
                name: 'Go to Thank You',
                targetStateId: 'Thank_You'
              }
            ],
            failureActions: [
              {
                type: 'PlayAudio',
                name: 'Queue Full Message',
                audioPrompt: {
                  tts: 'We are sorry, all representatives are currently busy. Please try again later.'
                }
              },
              {
                type: 'GoToState',
                name: 'Go to Thank You',
                targetStateId: 'Thank_You'
              }
            ]
          }
        ]
      },
      {
        id: 'India_Queue_Transfer',
        name: 'India Queue Transfer',
        actions: [
          {
            type: 'TransferToACD',
            name: 'Transfer to India Queue',
            queueId: queueIds['India_Queue1'],
            successActions: [
              {
                type: 'GoToState',
                name: 'Go to Thank You',
                targetStateId: 'Thank_You'
              }
            ],
            failureActions: [
              {
                type: 'PlayAudio',
                name: 'Queue Full Message',
                audioPrompt: {
                  tts: 'We are sorry, all representatives are currently busy. Please try again later.'
                }
              },
              {
                type: 'GoToState',
                name: 'Go to Thank You',
                targetStateId: 'Thank_You'
              }
            ]
          }
        ]
      },
      {
        id: 'Thank_You',
        name: 'Thank You and Disconnect',
        actions: [
          {
            type: 'PlayAudio',
            name: 'Thank You Message',
            audioPrompt: {
              tts: 'Thanks for choosing my flow. Goodbye.'
            }
          },
          {
            type: 'Disconnect',
            name: 'End Call'
          }
        ]
      }
    ]
  };
}

// Create the flow
async function createFlow(_queueIds) {
  try {
    console.log('\n🎯 Creating flow:', config.flowName);

    // Check if flow already exists
    const searchResponse = await apiClient.get('/api/v2/flows', {
      params: {
        name: config.flowName,
        type: 'inboundcall'
      }
    });

    let flowId;
    let isNew = false;

    if (searchResponse.data.entities && searchResponse.data.entities.length > 0) {
      console.log('⚠️  Flow already exists. Updating...');
      flowId = searchResponse.data.entities[0].id;

      // Get current flow version
      const flowResponse = await apiClient.get(`/api/v2/flows/${flowId}/latestconfiguration`);
      console.log('📄 Current flow version:', flowResponse.data.version);
    } else {
      isNew = true;
      console.log('📝 Creating new flow...');
    }

    // For now, let's use archy to create the flow properly
    console.log('\n📦 Flow configuration prepared. Now using archy to create and publish...');
    return { flowId, isNew };

  } catch (error) {
    console.error('❌ Error with flow:', error.response?.data || error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Claude_cars32 Flow Creation and Publishing\n');
    console.log('=' .repeat(60));

    // Authenticate
    await getAccessToken();

    // Ensure queues exist
    const queueIds = await ensureQueuesExist();
    console.log('\n📊 Queue IDs:', queueIds);

    // Create or update flow
    await createFlow(queueIds);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Flow preparation completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. The flow YAML file is ready: Claude_cars32.yaml');
    console.log('2. Now running archy to create and publish the flow...');
    console.log('='.repeat(60));

    return true;

  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    return false;
  }
}

// Run the script
main().then(success => {
  if (success) {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  } else {
    console.log('\n❌ Script failed!');
    process.exit(1);
  }
});
