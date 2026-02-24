const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_NAME = 'Claude_cars';

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

// Get flow by name
async function getFlow(accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: `/api/v2/flows?name=${encodeURIComponent(FLOW_NAME)}`,
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
                    const flow = result.entities && result.entities.find(f => f.name === FLOW_NAME);
                    resolve(flow);
                } else {
                    reject(new Error(`Get flow failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Get flow latest configuration
async function _getFlowLatestConfig(accessToken, flowId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: `/api/v2/flows/${flowId}/latestconfiguration`,
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
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Get flow config failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Delete existing flow
async function deleteFlow(accessToken, flowId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: `/api/v2/flows/${flowId}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 204) {
                    resolve(true);
                } else {
                    reject(new Error(`Delete flow failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Create new flow using YAML import
async function importYAMLFlow(accessToken) {
    const fs = require('fs');
    const yamlContent = fs.readFileSync('Claude_cars.yaml', 'utf8');

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            yaml: yamlContent
        });

        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: '/api/v2/flows/yamls',
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
                    reject(new Error(`Import YAML failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
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
        console.log('✓ Authentication successful\n');

        console.log('Step 2: Checking for existing flow...');
        const existingFlow = await getFlow(accessToken);

        if (existingFlow) {
            console.log(`✓ Found existing flow (ID: ${existingFlow.id})`);
            console.log('  Deleting existing flow...');
            await deleteFlow(accessToken, existingFlow.id);
            console.log('✓ Old flow deleted\n');
        } else {
            console.log('✓ No existing flow found\n');
        }

        console.log('Step 3: Importing YAML flow...');
        const newFlow = await importYAMLFlow(accessToken);
        console.log(`✓ Flow imported successfully (ID: ${newFlow.id})\n`);

        console.log('Step 4: Publishing flow...');
        const _publishResult = await publishFlow(accessToken, newFlow.id);
        console.log('✓ Flow published successfully\n');

        console.log('='.repeat(80));
        console.log('SUCCESS! Claude_cars flow has been created and published');
        console.log('='.repeat(80));
        console.log(`Flow Name: ${newFlow.name}`);
        console.log(`Flow ID: ${newFlow.id}`);
        console.log(`Flow Type: ${newFlow.type}`);
        console.log(`Division: Home`);
        console.log(`\nFlow Features:`);
        console.log(`  ✓ Language selection (English/Spanish)`);
        console.log(`  ✓ Dynamic voice prompts based on language`);
        console.log(`  ✓ Thank you message`);
        console.log(`  ✓ Call disconnect`);
        console.log(`\nFlow URL: https://apps.${REGION}/architect/#/flows/${newFlow.id}`);
        console.log(`\nNext Steps:`);
        console.log(`  1. Assign a DID to this flow in Genesys Cloud Admin`);
        console.log(`  2. Test the flow by calling the assigned number`);

    } catch (error) {
        console.error('\n' + '='.repeat(80));
        console.error('ERROR:', error.message);
        console.error('='.repeat(80));

        if (error.message.includes('403') || error.message.includes('missing.any.permissions')) {
            console.error('\nPermission Error: The OAuth client needs additional permissions.');
            console.error('\nRequired Permissions:');
            console.error('  • architect > flow > add');
            console.error('  • architect > flow > edit');
            console.error('  • architect > flow > view');
            console.error('  • architect > flow > delete');
            console.error('  • routing > flow > add');
            console.error('  • routing > flow > edit');
            console.error('  • routing > flow > view');
            console.error('\nHow to fix:');
            console.error('  1. Login to Genesys Cloud Admin');
            console.error('  2. Navigate to: Admin > Integrations > OAuth');
            console.error('  3. Find OAuth client: ' + CLIENT_ID);
            console.error('  4. Click "Edit" and add the required roles/permissions');
            console.error('  5. Save and re-run this script\n');
        }

        process.exit(1);
    }
}

main();
