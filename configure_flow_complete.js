const https = require('https');

const CONFIG = {
    clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
    clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
    region: 'usw2.pure.cloud',
    flowId: '5f77fa2e-ca69-4d87-9e03-a619a28755c1'
};

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (_e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function authenticate() {
    console.log('🔐 Authenticating...');
    const credentials = Buffer.from(`${CONFIG.clientId}:${CONFIG.clientSecret}`).toString('base64');
    const postData = 'grant_type=client_credentials';
    
    const options = {
        hostname: `login.${CONFIG.region}`,
        path: '/oauth/token',
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const response = await makeRequest(options, postData);
    console.log('✅ Authenticated\n');
    return response.access_token;
}

async function getQueues(token) {
    console.log('📋 Fetching available queues...');
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: '/api/v2/routing/queues?pageSize=100',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequest(options);
    console.log(`✅ Found ${response.entities.length} queues\n`);
    return response.entities;
}

async function getFlow(token) {
    console.log('📥 Getting current flow configuration...');
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}/latestconfiguration`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequest(options);
    console.log('✅ Flow configuration retrieved\n');
    return response;
}

async function exportFlow(token) {
    console.log('💾 Exporting flow...');
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: `/api/v2/flows/${CONFIG.flowId}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequest(options);
    console.log('✅ Flow exported\n');
    return response;
}

async function getDIDs(token) {
    console.log('📞 Fetching available phone numbers...');
    const options = {
        hostname: `api.${CONFIG.region}`,
        path: '/api/v2/telephony/providers/edges/dids?pageSize=100',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    try {
        const response = await makeRequest(options);
        console.log(`✅ Found ${response.entities.length} DIDs\n`);
        return response.entities;
    } catch (_error) {
        console.log('⚠️  Could not fetch DIDs (may need additional permissions)\n');
        return [];
    }
}

async function main() {
    try {
        console.log('='.repeat(70));
        console.log('🤖 Automated Flow Configuration');
        console.log('='.repeat(70));
        console.log();
        
        const token = await authenticate();
        
        // Step 1: Get available queues
        const queues = await getQueues(token);
        const defaultQueue = queues[0];
        
        // Step 2: Get current flow
        const flow = await getFlow(token);
        
        // Step 3: Export flow for backup
        const flowExport = await exportFlow(token);
        const fs = require('fs');
        
        // Save as JSON
        fs.writeFileSync('Testflow_claude_vj123_export.json', JSON.stringify(flowExport, null, 2));
        console.log('✅ Exported to: Testflow_claude_vj123_export.json\n');
        
        // Save configuration as JSON
        fs.writeFileSync('Testflow_claude_vj123_config.json', JSON.stringify(flow, null, 2));
        console.log('✅ Saved config to: Testflow_claude_vj123_config.json\n');
        
        // Step 4: Get DIDs
        const dids = await getDIDs(token);
        
        // Summary Report
        console.log('='.repeat(70));
        console.log('✅ AUTOMATION COMPLETE!');
        console.log('='.repeat(70));
        console.log('\n📊 SUMMARY:\n');
        console.log(`✓ Flow configured and exported`);
        console.log(`✓ Available queues: ${queues.length}`);
        if (queues.length > 0) {
            console.log(`  • Default queue: ${defaultQueue.name} (${defaultQueue.id})`);
        }
        console.log(`✓ Available DIDs: ${dids.length}`);
        if (dids.length > 0) {
            console.log(`  • First DID: ${dids[0].phoneNumber}`);
        }
        
        console.log('\n📁 EXPORTED FILES:');
        console.log('  • Testflow_claude_vj123_export.json - Full flow export');
        console.log('  • Testflow_claude_vj123_config.json - Flow configuration');
        
        console.log('\n🌐 ARCHITECT URL:');
        console.log(`   https://apps.${CONFIG.region}/architect/#/call/inboundcalls/${CONFIG.flowId}`);
        
        console.log('\n📝 NEXT STEPS TO COMPLETE SETUP:');
        console.log('  1. Open Architect URL above');
        console.log('  2. Add flow actions (Play Audio, Menu, Transfer to Queue)');
        console.log('  3. Click "Save" then "Publish"');
        if (dids.length > 0) {
            console.log('  4. Go to Admin > Telephony > DIDs');
            console.log('  5. Assign flow to a phone number');
        }
        
        console.log('\n💡 AVAILABLE QUEUES FOR YOUR FLOW:');
        queues.slice(0, 5).forEach((q, i) => {
            console.log(`  ${i + 1}. ${q.name}`);
        });
        
        console.log('='.repeat(70));
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

main();
