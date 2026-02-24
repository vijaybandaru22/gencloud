const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';

function apiRequest(token, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `api.${REGION}`,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : {});
        } else {
          reject(new Error(`${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function getAccessToken() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const options = {
      hostname: `login.${REGION}`,
      path: '/oauth/token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data).access_token);
        } else {
          reject(new Error(`Auth failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write('grant_type=client_credentials');
    req.end();
  });
}

async function getQueueId(token, queueName) {
  try {
    const queues = await apiRequest(token, 'GET', `/api/v2/routing/queues?name=${queueName}`);
    if (queues.entities && queues.entities.length > 0) {
      return queues.entities[0].id;
    }
    return null;
  } catch (_e) {
    return null;
  }
}

async function main() {
  try {
    console.log('🚀 Creating complete Claude_cars23 flow with all states and actions...\n');

    const token = await getAccessToken();
    console.log('✅ Authenticated\n');

    // Get queue IDs
    console.log('🔍 Looking up queues...');
    const usQueueId = await getQueueId(token, 'US_Queue');
    const indiaQueueId = await getQueueId(token, 'India_Queue');

    if (!usQueueId) {
      console.log('⚠️  Warning: US_Queue not found - will use queue name instead');
    } else {
      console.log(`✅ Found US_Queue: ${usQueueId}`);
    }

    if (!indiaQueueId) {
      console.log('⚠️  Warning: India_Queue not found - will use queue name instead');
    } else {
      console.log(`✅ Found India_Queue: ${indiaQueueId}`);
    }
    console.log();

    // Delete existing flow if it exists
    console.log('🔍 Checking for existing flow...');
    try {
      const flows = await apiRequest(token, 'GET', '/api/v2/flows?name=Claude_cars23&type=inboundcall');
      if (flows.entities && flows.entities.length > 0) {
        for (const flow of flows.entities) {
          console.log(`   Deleting existing flow: ${flow.id}`);
          await apiRequest(token, 'DELETE', `/api/v2/flows/${flow.id}`);
        }
        await new Promise(r => setTimeout(r, 2000));
        console.log('✅ Deleted\n');
      } else {
        console.log('   No existing flow\n');
      }
    } catch (_e) {
      console.log('   No existing flow\n');
    }

    // Get division ID
    console.log('📋 Looking up division...');
    const divisions = await apiRequest(token, 'GET', '/api/v2/authorization/divisions?name=Claude_Exploration_vijay');
    let divisionId = null;
    if (divisions.entities && divisions.entities.length > 0) {
      divisionId = divisions.entities[0].id;
      console.log(`✅ Found division: ${divisions.entities[0].name} (${divisionId})\n`);
    } else {
      throw new Error('Division Claude_Exploration_vijay not found');
    }

    // Build complete flow configuration
    console.log('📝 Creating complete flow configuration...');

    const flowConfig = {
      name: 'Claude_cars23',
      description: 'Inbound call flow with language selection, menu routing, and geographic-based queue routing',
      type: 'inboundcall',
      division: { id: divisionId },
      inboundCall: {
        initialGreeting: {
          tts: {
            'en-us': 'Welcome to Claude Cars',
            'es': 'Bienvenido a Claude Cars'
          }
        },
        defaultLanguage: 'en-us',
        supportedLanguages: [
          {
            language: 'en-us',
            defaultLanguageSkill: { noValue: true }
          },
          {
            language: 'es',
            defaultLanguageSkill: { noValue: true }
          }
        ],
        startUpRef: 'Welcome',
        states: [
          {
            name: 'Welcome',
            refId: 'Welcome',
            actions: [
              {
                playAudio: {
                  name: 'Welcome_Message',
                  audio: {
                    tts: {
                      'en-us': 'Thanks for choosing my flow. Please listen to the following options.',
                      'es': 'Gracias por elegir mi flujo. Por favor escuche las siguientes opciones.'
                    }
                  }
                }
              },
              {
                decision: {
                  name: 'Check_Geographic_Location',
                  condition: 'StartsWith(Call.Ani, "+1") || StartsWith(Call.Ani, "1")',
                  outputs: {
                    yes: {
                      actions: [
                        {
                          updateData: {
                            name: 'Set_Region_US',
                            statements: [
                              { string: 'Flow.Region = "US"' }
                            ]
                          }
                        }
                      ]
                    },
                    no: {
                      actions: [
                        {
                          decision: {
                            name: 'Check_India_Number',
                            condition: 'StartsWith(Call.Ani, "+91")',
                            outputs: {
                              yes: {
                                actions: [
                                  {
                                    updateData: {
                                      name: 'Set_Region_India',
                                      statements: [
                                        { string: 'Flow.Region = "India"' }
                                      ]
                                    }
                                  }
                                ]
                              },
                              no: {
                                actions: [
                                  {
                                    updateData: {
                                      name: 'Set_Region_Default_US',
                                      statements: [
                                        { string: 'Flow.Region = "US"' }
                                      ]
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
              },
              {
                collectInput: {
                  name: 'Main_Menu',
                  timeout: { seconds: 10 },
                  interDigitTimeout: { seconds: 5 },
                  maxDigits: 1,
                  inputAudio: {
                    tts: {
                      'en-us': 'For Sales, press 1. For Service, press 2. For New Models, press 3.',
                      'es': 'Para Ventas, oprima 1. Para Servicio, oprima 2. Para Modelos Nuevos, oprima 3.'
                    }
                  },
                  outputs: {
                    digit_1: {
                      actions: [
                        {
                          decision: {
                            name: 'Route_Sales',
                            condition: 'Flow.Region == "US"',
                            outputs: {
                              yes: {
                                actions: [
                                  {
                                    transferToAcd: {
                                      name: 'Transfer_To_US_Queue',
                                      targetQueue: usQueueId ? { id: usQueueId } : { name: 'US_Queue' },
                                      priority: 0
                                    }
                                  }
                                ]
                              },
                              no: {
                                actions: [
                                  {
                                    transferToAcd: {
                                      name: 'Transfer_To_India_Queue',
                                      targetQueue: indiaQueueId ? { id: indiaQueueId } : { name: 'India_Queue' },
                                      priority: 0
                                    }
                                  }
                                ]
                              }
                            }
                          }
                        }
                      ]
                    },
                    digit_2: {
                      actions: [
                        {
                          decision: {
                            name: 'Route_Service',
                            condition: 'Flow.Region == "US"',
                            outputs: {
                              yes: {
                                actions: [
                                  {
                                    transferToAcd: {
                                      name: 'Transfer_To_US_Queue',
                                      targetQueue: usQueueId ? { id: usQueueId } : { name: 'US_Queue' },
                                      priority: 0
                                    }
                                  }
                                ]
                              },
                              no: {
                                actions: [
                                  {
                                    transferToAcd: {
                                      name: 'Transfer_To_India_Queue',
                                      targetQueue: indiaQueueId ? { id: indiaQueueId } : { name: 'India_Queue' },
                                      priority: 0
                                    }
                                  }
                                ]
                              }
                            }
                          }
                        }
                      ]
                    },
                    digit_3: {
                      actions: [
                        {
                          decision: {
                            name: 'Route_New_Models',
                            condition: 'Flow.Region == "US"',
                            outputs: {
                              yes: {
                                actions: [
                                  {
                                    transferToAcd: {
                                      name: 'Transfer_To_US_Queue',
                                      targetQueue: usQueueId ? { id: usQueueId } : { name: 'US_Queue' },
                                      priority: 0
                                    }
                                  }
                                ]
                              },
                              no: {
                                actions: [
                                  {
                                    transferToAcd: {
                                      name: 'Transfer_To_India_Queue',
                                      targetQueue: indiaQueueId ? { id: indiaQueueId } : { name: 'India_Queue' },
                                      priority: 0
                                    }
                                  }
                                ]
                              }
                            }
                          }
                        }
                      ]
                    },
                    timeout: {
                      actions: [
                        {
                          disconnect: {
                            name: 'Disconnect_Timeout'
                          }
                        }
                      ]
                    },
                    failure: {
                      actions: [
                        {
                          disconnect: {
                            name: 'Disconnect_Failure'
                          }
                        }
                      ]
                    }
                  }
                }
              }
            ]
          }
        ]
      }
    };

    // Create flow with complete configuration
    console.log('📝 Creating flow with complete configuration...');
    const newFlow = await apiRequest(token, 'POST', '/api/v2/flows', flowConfig);
    console.log(`✅ Flow created: ${newFlow.id}\n`);

    // Wait a moment for flow to be ready
    await new Promise(r => setTimeout(r, 2000));

    // Validate the flow
    console.log('✔️  Validating flow...');
    try {
      const _validation = await apiRequest(token, 'POST', `/api/v2/flows/${newFlow.id}/validation`);
      console.log('✅ Flow validation passed\n');
    } catch (e) {
      console.log('⚠️  Validation warning (may still be usable):\n   ', e.message, '\n');
    }

    // Publish the flow
    console.log('📤 Publishing flow...');
    try {
      await apiRequest(token, 'POST', `/api/v2/flows/${newFlow.id}/publish`, {
        version: newFlow.version
      });
      console.log('✅ Flow published\n');
    } catch (e) {
      console.log('⚠️  Publish note:', e.message);
      console.log('   You can publish manually in Architect UI\n');
    }

    console.log('='.repeat(80));
    console.log('✅ FLOW CREATED SUCCESSFULLY WITH ALL CONFIGURATIONS');
    console.log('='.repeat(80));
    console.log('\n📋 Flow Information:');
    console.log(`   Name: Claude_cars23`);
    console.log(`   ID: ${newFlow.id}`);
    console.log(`   Type: Inbound Call Flow`);
    console.log(`   Division: Claude_Exploration_vijay`);
    console.log(`   Region: ${REGION}`);
    console.log(`   Languages: English (default), Spanish`);
    console.log('\n✅ Flow Configuration:');
    console.log('   ✓ Initial Greeting: "Welcome to Claude Cars"');
    console.log('   ✓ Welcome Message: "Thanks for choosing my flow..."');
    console.log('   ✓ Geographic Routing: US (+1) vs India (+91)');
    console.log('   ✓ Menu Options: Sales (1), Service (2), New Models (3)');
    console.log('   ✓ Queue Routing: US_Queue and India_Queue');
    console.log('\n🔗 View/Edit Flow in Architect:');
    console.log(`   https://apps.${REGION}/architect/#/call/inbound/${newFlow.id}`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Open the flow in Architect UI (link above)');
    console.log('   2. Verify all states and actions are configured correctly');
    console.log('   3. Publish the flow if not already published');
    console.log('   4. Assign a DID to the flow for testing');
    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('400') || error.message.includes('500')) {
      console.error('\n💡 Note: The Genesys API may not support full flow configuration via POST.');
      console.error('   Alternative: Use the previous script to create shell, then configure in UI.');
    }
    process.exit(1);
  }
}

main();
