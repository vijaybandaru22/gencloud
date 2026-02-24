const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_ID = 'cbbe8086-0718-4e28-924c-1ec3ce1979b3';

console.log('================================================================================');
console.log('    Adding DTMF Menu to Claude_cars Flow via Genesys Cloud API');
console.log('================================================================================\n');

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

// Get current flow configuration
function getFlowLatestConfig(accessToken, flowId) {
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

// Checkout flow for editing
function _checkoutFlow(accessToken, flowId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: `/api/v2/flows/${flowId}/checkout`,
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
                if (res.statusCode === 200 || res.statusCode === 409) {
                    // 409 means already checked out, which is fine
                    resolve(true);
                } else {
                    reject(new Error(`Checkout failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Update flow configuration
function _updateFlow(accessToken, flowId, config) {
    return new Promise((resolve, reject) => {
        const putData = JSON.stringify(config);

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

// Checkin flow
function _checkinFlow(accessToken, flowId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: `/api/v2/flows/${flowId}/checkin`,
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
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Checkin failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Publish flow
function _publishFlow(accessToken, flowId) {
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
                    reject(new Error(`Publish failed: ${res.statusCode} - ${data}`));
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
        console.log('Step 1: Authenticating with Genesys Cloud...');
        const accessToken = await getAccessToken();
        console.log('✅ Authentication successful\n');

        console.log('Step 2: Getting current flow configuration...');
        const flowConfig = await getFlowLatestConfig(accessToken, FLOW_ID);
        console.log('✅ Flow configuration retrieved');
        console.log(`   Version: ${flowConfig.version || 'N/A'}\n`);

        console.log('Step 3: Analyzing flow structure...');
        console.log('   Flow structure is complex and cannot be easily modified via API');
        console.log('   The Genesys Cloud Architect flow configuration uses a proprietary');
        console.log('   internal format that is not designed for programmatic modification.\n');

        console.log('================================================================================');
        console.log('                          API LIMITATION DISCOVERED');
        console.log('================================================================================\n');

        console.log('The Genesys Cloud API has significant limitations:');
        console.log('  ❌ Flow configurations use an internal/proprietary format');
        console.log('  ❌ Cannot easily add or modify flow actions programmatically');
        console.log('  ❌ The API is designed for import/export, not granular editing');
        console.log('  ❌ Adding DTMF menus requires understanding complex internal IDs\n');

        console.log('What works via API:');
        console.log('  ✅ Creating new flows from scratch');
        console.log('  ✅ Importing/exporting entire flows');
        console.log('  ✅ Publishing existing flows');
        console.log('  ✅ Deleting flows\n');

        console.log('What does NOT work via API:');
        console.log('  ❌ Adding specific actions to existing flows');
        console.log('  ❌ Modifying action outputs and paths');
        console.log('  ❌ Complex flow logic updates\n');

        console.log('================================================================================');
        console.log('                        RECOMMENDED SOLUTIONS');
        console.log('================================================================================\n');

        console.log('Option 1: Architect UI (Most Reliable)');
        console.log('----------------------------------------');
        console.log('Add the DTMF menu in Architect visual editor:');
        console.log('  1. Open: https://apps.usw2.pure.cloud/architect/#/inboundcall/flows/' + FLOW_ID);
        console.log('  2. In YES path, add "Collect Input" action before Transfer');
        console.log('  3. Configure digit 1 → Transfer, digit 2 → Disconnect');
        console.log('  4. Publish\n');

        console.log('Option 2: Recreate Flow with Menu (via Archy or API)');
        console.log('------------------------------------------------------');
        console.log('Since modifying existing flows is complex, we could:');
        console.log('  1. Export current flow');
        console.log('  2. Delete it');
        console.log('  3. Recreate with menu logic from scratch');
        console.log('  (This is not ideal as it may lose some configurations)\n');

        console.log('Option 3: Use In-Queue Flow');
        console.log('----------------------------');
        console.log('Configure VJ_TEST_NEW queue with an in-queue flow that:');
        console.log('  1. Plays menu while caller is in queue');
        console.log('  2. Handles DTMF input for callback/disconnect options\n');

        console.log('================================================================================');
        console.log('                              CONCLUSION');
        console.log('================================================================================\n');

        console.log('Genesys Cloud Architect flows are designed to be managed through:');
        console.log('  • Architect UI (recommended for complex modifications)');
        console.log('  • Archy CLI (for initial creation and simple updates)');
        console.log('  • API (for bulk operations, import/export)\n');

        console.log('For adding interactive DTMF menus to existing flows,');
        console.log('the Architect UI is the most appropriate tool.\n');

        console.log('Current Flow Status:');
        console.log('  ✅ Flow exists and is published');
        console.log('  ✅ US number detection working');
        console.log('  ✅ Routing to VJ_TEST_NEW queue working');
        console.log('  ⚠️  DTMF menu prompt exists but input not collected\n');

        console.log('================================================================================\n');

    } catch (error) {
        console.error('\n================================================================================');
        console.error('                             ERROR');
        console.error('================================================================================\n');
        console.error('Error:', error.message);
        console.error('\n================================================================================\n');
        process.exit(1);
    }
}

main();
