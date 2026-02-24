const https = require('https');

// Your OAuth credentials
const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';

console.log('================================================================================');
console.log('           OAuth Verification & Flow Publisher for Claude_cars');
console.log('================================================================================\n');

console.log('Configuration:');
console.log('  Client ID:', CLIENT_ID);
console.log('  Region:', REGION);
console.log('  Division: Home');
console.log('  Flow: Claude_cars\n');

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
                    const result = JSON.parse(data);
                    resolve({
                        token: result.access_token,
                        expires: result.expires_in
                    });
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

// Test OAuth client permissions
function testOAuthPermissions(accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: `/api/v2/oauth/clients/${CLIENT_ID}`,
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
                    reject(new Error(`OAuth test failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Get user info to check permissions
function getUserInfo(accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: '/api/v2/users/me',
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
                    reject(new Error(`Get user failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Test Architect flow access
function testArchitectAccess(accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `api.${REGION}`,
            port: 443,
            path: '/api/v2/flows?pageSize=1',
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
                    resolve(true);
                } else {
                    reject(new Error(`Architect test failed: ${res.statusCode} - ${data}`));
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
        console.log('Step 1: Testing OAuth Authentication...');
        const authResult = await getAccessToken();
        console.log('  ✅ SUCCESS - OAuth authentication working');
        console.log(`  → Token expires in: ${authResult.expires} seconds\n`);

        console.log('Step 2: Testing OAuth Client View Permission...');
        try {
            const clientInfo = await testOAuthPermissions(authResult.token);
            console.log('  ✅ SUCCESS - oauth:client:view permission granted');
            console.log(`  → Client Name: ${clientInfo.name}`);
            console.log(`  → Authorized Grant Type: ${clientInfo.authorizedGrantType}\n`);
        } catch (_error) {
            console.log('  ❌ FAILED - Missing oauth:client:view permission');
            console.log('  → This permission is required for Archy to work\n');
        }

        console.log('Step 3: Testing Architect Flow Access...');
        try {
            await testArchitectAccess(authResult.token);
            console.log('  ✅ SUCCESS - Can access Architect flows');
            console.log('  → Architect permissions are properly configured\n');
        } catch (_error) {
            console.log('  ❌ FAILED - Missing Architect permissions');
            console.log('  → Add Architect > Flow > All Permissions role\n');
        }

        console.log('Step 4: Checking User/Client Info...');
        try {
            const _userInfo = await getUserInfo(authResult.token);
            console.log('  ℹ️  Client Credentials Grant Type');
            console.log('  → This OAuth client uses client credentials (not user-based)\n');
        } catch (_error) {
            // Expected for client credentials grant
            console.log('  ℹ️  Client Credentials Grant Type (no user info)\n');
        }

        console.log('================================================================================');
        console.log('                          PERMISSION SUMMARY');
        console.log('================================================================================\n');

        console.log('Required Permissions for Archy:');
        console.log('  [ ] oauth:client:view - View OAuth client details');
        console.log('  [ ] architect:flow:add - Create flows');
        console.log('  [ ] architect:flow:edit - Edit flows');
        console.log('  [ ] architect:flow:view - View flows');
        console.log('  [ ] architect:flow:publish - Publish flows');
        console.log('  [ ] routing:flow:* - Routing flow permissions\n');

        console.log('How to Add Permissions:');
        console.log('  1. Login: https://apps.usw2.pure.cloud');
        console.log('  2. Go to: Admin > Integrations > OAuth');
        console.log('  3. Find client: ' + CLIENT_ID);
        console.log('  4. Click "Edit"');
        console.log('  5. Add role: "Master Admin" (gives all permissions)');
        console.log('  6. Click "Save"\n');

        console.log('After adding permissions, run:');
        console.log('  > PUBLISH_CLAUDE_CARS.bat\n');

        console.log('Or use Archy directly:');
        console.log('  > archy\\archy.bat publish --file Claude_cars.yaml\n');

        console.log('================================================================================\n');

    } catch (error) {
        console.error('\n================================================================================');
        console.error('                             ERROR');
        console.error('================================================================================\n');
        console.error('Message:', error.message);

        if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
            console.error('\nNetwork Error:');
            console.error('  - Check your internet connection');
            console.error('  - Verify region is correct: ' + REGION);
            console.error('  - Try accessing https://apps.' + REGION + ' in browser\n');
        } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
            console.error('\nAuthentication Error:');
            console.error('  - Client ID or Secret may be incorrect');
            console.error('  - OAuth client may be disabled');
            console.error('  - Check credentials in Genesys Admin\n');
        } else if (error.message.includes('403') || error.message.includes('missing.any.permissions')) {
            console.error('\nPermission Error:');
            console.error('  - OAuth client needs additional permissions');
            console.error('  - Add "Master Admin" role to OAuth client');
            console.error('  - See OAUTH_SETUP_GUIDE.md for details\n');
        }

        console.error('================================================================================\n');
        process.exit(1);
    }
}

main();
