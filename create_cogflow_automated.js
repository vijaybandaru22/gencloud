/**
 * COGflow - City of Greeley Call Flow Automation Script
 * Automatically creates and publishes the complete call flow in Zoom/Genesys Cloud
 */

const https = require('https');

// OAuth Configuration - User will provide these
const CONFIG = {
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  region: 'mypurecloud.com', // or usw2.pure.cloud, mypurecloud.ie, etc.
  organizationId: 'YOUR_ORG_ID'
};

let accessToken = null;

// Helper function to make API calls
function makeApiCall(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `api.${CONFIG.region}`,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : {});
        } else {
          reject(new Error(`API call failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Get OAuth token
async function authenticate() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${CONFIG.clientId}:${CONFIG.clientSecret}`).toString('base64');
    const postData = 'grant_type=client_credentials';

    const options = {
      hostname: `login.${CONFIG.region}`,
      path: '/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          accessToken = response.access_token;
          console.log('✓ Authentication successful');
          resolve(response);
        } else {
          reject(new Error(`Authentication failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Create the COGflow
async function createCOGFlow() {
  console.log('\n📞 Creating COGflow - City of Greeley Call Flow...\n');

  const flowConfig = {
    name: "COGflow - City of Greeley Main Line",
    description: "City of Greeley main line (970) 351-5311 with department routing",
    type: "inboundcall",
    division: {
      id: await getHomeDivisionId()
    },
    inboundCall: {
      name: "COGflow - City of Greeley Main Line",
      startUpRef: "Initial_Greeting",
      defaultLanguage: "en-us",
      supportedLanguages: {
        "en-us": {}
      },
      states: [
        {
          name: "Initial_Greeting",
          state: {
            name: "Initial Greeting",
            refId: "Initial_Greeting",
            actions: [
              {
                playAudio: {
                  name: "Play Greeting",
                  audioUri: {
                    tts: "Hello, you've reached the City of Greeley. If this is an emergency, hang up and dial 9 1 1."
                  }
                }
              },
              {
                decision: {
                  name: "Check Business Hours",
                  condition: {
                    expression: "true"
                  },
                  outputs: {
                    yes: {
                      name: "During Hours",
                      actions: [
                        {
                          callMenu: {
                            name: "Route to Main Menu",
                            menuId: "Main_Menu"
                          }
                        }
                      ]
                    },
                    no: {
                      name: "After Hours",
                      actions: [
                        {
                          playAudio: {
                            name: "After Hours Message",
                            audioUri: {
                              tts: "Our offices are currently closed. Our business hours are Monday through Friday, 8 AM to 5 PM Mountain Time. Please call back during business hours or press 0 to leave a message."
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
      ],
      menus: [
        {
          name: "Main_Menu",
          menu: {
            name: "Main Menu",
            refId: "Main_Menu",
            audio: {
              tts: "For Utility Bills, Water Quality, Water Conservation, or other Water and Sewer related services, press 1. For Streets, traffic signals, parking lots, sidewalks, or other services related to streets and roads, press 2. For questions regarding permits, developments, and Community Development, press 3. For Municipal Court matters, press 4. To speak with a representative directly, press 0. To repeat this menu, press 9."
            },
            choices: [
              {
                name: "Option_1_Water",
                dtmf: "1",
                actions: [
                  {
                    transferToNumber: {
                      name: "Transfer to Water Dept",
                      phoneNumber: "9811",
                      preTransferAudio: {
                        tts: "Please hold while we transfer you to our Water and Sewer department."
                      }
                    }
                  }
                ]
              },
              {
                name: "Option_2_Streets",
                dtmf: "2",
                actions: [
                  {
                    transferToNumber: {
                      name: "Transfer to Streets Dept",
                      phoneNumber: "9881",
                      preTransferAudio: {
                        tts: "Please hold while we transfer you to our Streets and Roads department."
                      }
                    }
                  }
                ]
              },
              {
                name: "Option_3_Development",
                dtmf: "3",
                actions: [
                  {
                    transferToNumber: {
                      name: "Transfer to Community Development",
                      phoneNumber: "9780",
                      preTransferAudio: {
                        tts: "Please hold while we transfer you to Community Development."
                      }
                    }
                  }
                ]
              },
              {
                name: "Option_4_Court",
                dtmf: "4",
                actions: [
                  {
                    transferToNumber: {
                      name: "Transfer to Municipal Court",
                      phoneNumber: "9230",
                      preTransferAudio: {
                        tts: "Please hold while we transfer you to Municipal Court."
                      }
                    }
                  }
                ]
              },
              {
                name: "Option_0_Representative",
                dtmf: "0",
                actions: [
                  {
                    playAudio: {
                      name: "Voicemail Message",
                      audioUri: {
                        tts: "All representatives are currently assisting other callers. Please leave a detailed message after the tone, and your message will be converted to a 3 1 1 ticket."
                      }
                    }
                  },
                  {
                    disconnect: {
                      name: "End Call"
                    }
                  }
                ]
              },
              {
                name: "Option_9_Repeat",
                dtmf: "9",
                actions: [
                  {
                    callMenu: {
                      name: "Repeat Menu",
                      menuId: "Main_Menu"
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  };

  try {
    const flow = await makeApiCall('POST', '/api/v2/flows', flowConfig);
    console.log(`✓ Flow created successfully!`);
    console.log(`  Flow ID: ${flow.id}`);
    console.log(`  Flow Name: ${flow.name}`);
    return flow;
  } catch (error) {
    console.error('✗ Failed to create flow:', error.message);
    throw error;
  }
}

// Get Home Division ID
async function getHomeDivisionId() {
  try {
    const divisions = await makeApiCall('GET', '/api/v2/authorization/divisions');
    const homeDivision = divisions.entities.find(d => d.name === 'Home');
    return homeDivision ? homeDivision.id : divisions.entities[0].id;
  } catch (error) {
    console.error('Error getting division:', error.message);
    return null;
  }
}

// Publish the flow
async function publishFlow(flowId) {
  console.log('\n📤 Publishing COGflow...');

  try {
    const published = await makeApiCall('POST', `/api/v2/flows/${flowId}/publish`, {});
    console.log('✓ Flow published successfully!');
    console.log(`  Version: ${published.version}`);
    return published;
  } catch (error) {
    console.error('✗ Failed to publish flow:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   COGflow - City of Greeley Automated Flow Creator');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Authenticate
    await authenticate();

    // Step 2: Create the flow
    const flow = await createCOGFlow();

    // Step 3: Publish the flow
    await publishFlow(flow.id);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✓ SUCCESS! COGflow has been created and published!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Next Steps:');
    console.log('1. Assign the DID (970) 351-5311 to this flow');
    console.log('2. Configure business hours schedule: "COG Business Hours"');
    console.log('3. Configure holiday schedule: "COG Holidays"');
    console.log('4. Test the flow by calling the main number');
    console.log('5. Set up voicemail-to-email integration for Option 0');
    console.log('6. Configure 311 ticketing system integration\n');

  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    console.error('\nPlease check your credentials and try again.');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { authenticate, createCOGFlow, publishFlow };
