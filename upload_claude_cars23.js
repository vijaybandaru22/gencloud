const https = require('https');

// Configuration
const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_NAME = 'Claude_cars23';

// Step 1: Get OAuth token
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
          const token = JSON.parse(data).access_token;
          console.log('✅ OAuth token obtained successfully');
          resolve(token);
        } else {
          reject(new Error(`Failed to get token: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write('grant_type=client_credentials');
    req.end();
  });
}

// Step 2: Create the inbound flow
function createInboundFlow(token) {
  return new Promise((resolve, reject) => {
    const flowData = {
      name: FLOW_NAME,
      description: 'Inbound voice flow with language selection, menu routing, and geographic-based queue routing',
      type: 'inboundcall',
      division: { name: 'Home' },
      inboundCall: {
        startUpRef: 'Initial_State',
        initialGreeting: {
          tts: 'Welcome to Claude Cars'
        },
        defaultLanguage: 'en-us',
        supportedLanguages: [
          { language: 'en-us' },
          { language: 'es' }
        ],
        states: [
          {
            name: 'Initial_State',
            type: 'task',
            task: {
              name: 'Language Selection',
              refId: 'language_selection_task'
            },
            transitions: [
              {
                event: 'success',
                targetState: 'Play_Welcome_Message'
              },
              {
                event: 'failure',
                targetState: 'Play_Welcome_Message'
              }
            ]
          },
          {
            name: 'Play_Welcome_Message',
            type: 'task',
            task: {
              name: 'Welcome Message',
              refId: 'welcome_message_task'
            },
            transitions: [
              {
                event: 'success',
                targetState: 'Geographic_Routing_Decision'
              }
            ]
          },
          {
            name: 'Geographic_Routing_Decision',
            type: 'decision',
            decision: {
              name: 'Check Caller Location',
              condition: 'StartsWith(Call.Ani, "+1") || StartsWith(Call.Ani, "1")'
            },
            transitions: [
              {
                event: 'yes',
                targetState: 'Main_Menu_US'
              },
              {
                event: 'no',
                targetState: 'Check_India_Number'
              }
            ]
          },
          {
            name: 'Check_India_Number',
            type: 'decision',
            decision: {
              name: 'Check India Number',
              condition: 'StartsWith(Call.Ani, "+91")'
            },
            transitions: [
              {
                event: 'yes',
                targetState: 'Main_Menu_India'
              },
              {
                event: 'no',
                targetState: 'Main_Menu_US'
              }
            ]
          },
          {
            name: 'Main_Menu_US',
            type: 'menu',
            menu: {
              name: 'Main Menu - US Route',
              prompt: {
                tts: {
                  'en-us': 'For Sales, press 1. For Service, press 2. For New Models, press 3.',
                  'es': 'Para Ventas, oprima 1. Para Servicio, oprima 2. Para Modelos Nuevos, oprima 3.'
                }
              },
              choices: [
                {
                  dtmf: '1',
                  name: 'Sales',
                  action: {
                    type: 'transferToAcd',
                    queue: { name: 'US_Queue' }
                  }
                },
                {
                  dtmf: '2',
                  name: 'Service',
                  action: {
                    type: 'transferToAcd',
                    queue: { name: 'US_Queue' }
                  }
                },
                {
                  dtmf: '3',
                  name: 'New Models',
                  action: {
                    type: 'transferToAcd',
                    queue: { name: 'US_Queue' }
                  }
                }
              ]
            }
          },
          {
            name: 'Main_Menu_India',
            type: 'menu',
            menu: {
              name: 'Main Menu - India Route',
              prompt: {
                tts: {
                  'en-us': 'For Sales, press 1. For Service, press 2. For New Models, press 3.',
                  'es': 'Para Ventas, oprima 1. Para Servicio, oprima 2. Para Modelos Nuevos, oprima 3.'
                }
              },
              choices: [
                {
                  dtmf: '1',
                  name: 'Sales',
                  action: {
                    type: 'transferToAcd',
                    queue: { name: 'India_Queue' }
                  }
                },
                {
                  dtmf: '2',
                  name: 'Service',
                  action: {
                    type: 'transferToAcd',
                    queue: { name: 'India_Queue' }
                  }
                },
                {
                  dtmf: '3',
                  name: 'New Models',
                  action: {
                    type: 'transferToAcd',
                    queue: { name: 'India_Queue' }
                  }
                }
              ]
            }
          }
        ]
      }
    };

    const jsonData = JSON.stringify(flowData);

    const options = {
      hostname: `api.${REGION}`,
      path: '/api/v2/flows',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': jsonData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          const flow = JSON.parse(data);
          console.log('✅ Flow created successfully');
          console.log(`   Flow ID: ${flow.id}`);
          console.log(`   Flow Name: ${flow.name}`);
          resolve(flow);
        } else {
          console.error(`❌ Failed to create flow: ${res.statusCode}`);
          console.error(`   Response: ${data}`);
          reject(new Error(`Failed to create flow: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(jsonData);
    req.end();
  });
}

// Step 3: Publish the flow
function publishFlow(token, flowId) {
  return new Promise((resolve, reject) => {
    const publishData = JSON.stringify({
      version: 1
    });

    const options = {
      hostname: `api.${REGION}`,
      path: `/api/v2/flows/${flowId}/publish`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': publishData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 202) {
          console.log('✅ Flow published successfully');
          if (data) {
            resolve(JSON.parse(data));
          } else {
            resolve({ published: true });
          }
        } else {
          console.error(`❌ Failed to publish flow: ${res.statusCode}`);
          console.error(`   Response: ${data}`);
          reject(new Error(`Failed to publish flow: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(publishData);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Claude_cars23 flow creation and publication...\n');

    const token = await getAccessToken();
    const flow = await createInboundFlow(token);
    await publishFlow(token, flow.id);

    console.log('\n✅ Flow creation and publication completed successfully!');
    console.log(`\n📋 Flow Details:`);
    console.log(`   Name: ${FLOW_NAME}`);
    console.log(`   ID: ${flow.id}`);
    console.log(`   Region: ${REGION}`);
    console.log(`\n🔗 Access your flow in Architect at:`);
    console.log(`   https://apps.${REGION}/architect/#/call/inbound/${flow.id}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
