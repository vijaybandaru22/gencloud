const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';

// Get OAuth token
function getAccessToken() {
    return new Promise((resolve, reject) => {
        const postData = `grant_type=client_credentials`;

        const options = {
            hostname: `login.${REGION}`,
            port: 443,
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
                'Content-Length': postData.length
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data).access_token);
                } else {
                    reject(new Error(`Auth failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Create flow configuration
function createFlowConfig() {
    return {
        "name": "Claude_cars",
        "description": "Simple language selection flow with thank you message",
        "type": "inboundcall",
        "division": {
            "id": null  // Home division
        },
        "startUpRef": "/flow/states/state[Initial_State_10]",
        "defaultLanguage": "en-us",
        "supportedLanguages": {
            "en-us": {
                "defaultLanguageSkill": {
                    "noValue": true
                }
            },
            "es": {
                "defaultLanguageSkill": {
                    "noValue": true
                }
            }
        },
        "initialGreeting": {
            "tts": "Welcome to Claude Cars"
        },
        "settingsInboundCallFlow": {
            "settingsErrorHandling": {
                "errorHandling": {
                    "disconnect": {
                        "none": true
                    }
                }
            }
        },
        "states": [
            {
                "state": {
                    "name": "Initial State",
                    "refId": "Initial_State_10",
                    "actions": [
                        {
                            "playAudio": {
                                "name": "Language Selection Menu",
                                "audio": {
                                    "tts": "Press 1 for English. Para Español, oprima el 2."
                                }
                            }
                        },
                        {
                            "collectInput": {
                                "name": "Get Language Choice",
                                "category": "Language",
                                "timeout": {
                                    "lit": 10
                                },
                                "interDigitTimeout": {
                                    "lit": 5
                                },
                                "maxDigits": {
                                    "lit": 1
                                },
                                "inputData": {
                                    "noValue": true
                                },
                                "outputs": {
                                    "digit_1": {
                                        "actions": [
                                            {
                                                "setLanguage": {
                                                    "name": "Set English",
                                                    "language": {
                                                        "lit": "en-us"
                                                    }
                                                }
                                            },
                                            {
                                                "nextActionAfterSuccess": {
                                                    "name": "Go to Thank You",
                                                    "nextAction": "/flow/states/state[Thank_You_20]"
                                                }
                                            }
                                        ]
                                    },
                                    "digit_2": {
                                        "actions": [
                                            {
                                                "setLanguage": {
                                                    "name": "Set Spanish",
                                                    "language": {
                                                        "lit": "es"
                                                    }
                                                }
                                            },
                                            {
                                                "nextActionAfterSuccess": {
                                                    "name": "Go to Thank You",
                                                    "nextAction": "/flow/states/state[Thank_You_20]"
                                                }
                                            }
                                        ]
                                    },
                                    "timeout": {
                                        "actions": [
                                            {
                                                "setLanguage": {
                                                    "name": "Default English",
                                                    "language": {
                                                        "lit": "en-us"
                                                    }
                                                }
                                            },
                                            {
                                                "nextActionAfterSuccess": {
                                                    "name": "Go to Thank You",
                                                    "nextAction": "/flow/states/state[Thank_You_20]"
                                                }
                                            }
                                        ]
                                    },
                                    "failure": {
                                        "actions": [
                                            {
                                                "setLanguage": {
                                                    "name": "Default English on Failure",
                                                    "language": {
                                                        "lit": "en-us"
                                                    }
                                                }
                                            },
                                            {
                                                "nextActionAfterSuccess": {
                                                    "name": "Go to Thank You",
                                                    "nextAction": "/flow/states/state[Thank_You_20]"
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            {
                "state": {
                    "name": "Thank You",
                    "refId": "Thank_You_20",
                    "actions": [
                        {
                            "playAudio": {
                                "name": "Play Thank You Message",
                                "audio": {
                                    "tts": "Thanks for choosing my flow"
                                }
                            }
                        },
                        {
                            "disconnect": {
                                "name": "Disconnect Call"
                            }
                        }
                    ]
                }
            }
        ]
    };
}

// Check if flow exists
async function checkFlowExists(accessToken, flowName) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: `/api/v2/flows?name=${encodeURIComponent(flowName)}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const result = JSON.parse(data);
                    const flow = result.entities && result.entities.find(f => f.name === flowName);
                    resolve(flow);
                } else {
                    reject(new Error(`Check flow failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Create the flow
async function createFlow(accessToken, flowConfig) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(flowConfig);

        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: '/api/v2/flows',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Create flow failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Update existing flow
async function updateFlow(accessToken, flowId, flowConfig) {
    return new Promise((resolve, reject) => {
        const putData = JSON.stringify(flowConfig);

        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: `/api/v2/flows/${flowId}`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(putData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Update flow failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(putData);
        req.end();
    });
}

// Publish the flow
async function publishFlow(accessToken, flowId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: `/api/v2/flows/${flowId}/versions`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': 0
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Publish flow failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Main execution
async function main() {
    try {
        console.log('Step 1: Authenticating...');
        const accessToken = await getAccessToken();
        console.log('✓ Authentication successful');

        console.log('\nStep 2: Checking if flow exists...');
        const existingFlow = await checkFlowExists(accessToken, 'Claude_cars');

        let flow;
        const flowConfig = createFlowConfig();

        if (existingFlow) {
            console.log(`✓ Flow exists (ID: ${existingFlow.id}). Updating...`);
            flow = await updateFlow(accessToken, existingFlow.id, flowConfig);
            console.log('✓ Flow updated successfully');
        } else {
            console.log('✓ Flow does not exist. Creating new flow...');
            flow = await createFlow(accessToken, flowConfig);
            console.log(`✓ Flow created successfully (ID: ${flow.id})`);
        }

        console.log('\nStep 3: Publishing flow...');
        const publishResult = await publishFlow(accessToken, flow.id);
        console.log('✓ Flow published successfully');

        console.log('\n' + '='.repeat(80));
        console.log('SUCCESS! Claude_cars flow has been created and published');
        console.log('='.repeat(80));
        console.log(`Flow Name: ${flow.name}`);
        console.log(`Flow ID: ${flow.id}`);
        console.log(`Flow Type: ${flow.type}`);
        console.log(`Published Version: ${publishResult.version || 'N/A'}`);
        console.log(`\nYou can now assign a DID to this flow in Genesys Cloud Admin.`);
        console.log(`Flow URL: https://apps.${REGION}/architect/#/flows/${flow.id}`);

    } catch (error) {
        console.error('\n' + '='.repeat(80));
        console.error('ERROR:', error.message);
        console.error('='.repeat(80));

        if (error.message.includes('403')) {
            console.error('\nThe OAuth client does not have the required permissions.');
            console.error('Please add the following roles to your OAuth client:');
            console.error('  - Architect > Flow > All Permissions');
            console.error('  - Routing > Flow > All Permissions');
            console.error('\nTo fix this:');
            console.error('1. Log in to Genesys Cloud Admin');
            console.error('2. Go to Integrations > OAuth');
            console.error('3. Find your OAuth client: ' + CLIENT_ID);
            console.error('4. Add the required roles');
            console.error('5. Re-run this script');
        }

        process.exit(1);
    }
}

main();
