const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';
const FLOW_NAME = 'Testflow_vj123456';

function makeRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(data ? JSON.parse(data) : {}); } 
                    catch (_e) { resolve(data); }
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

async function run() {
    try {
        console.log('Authenticating...');
        const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        let token = await makeRequest({
            hostname: `login.${REGION}`,
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }, 'grant_type=client_credentials');
        token = token.access_token;
        console.log('✓ Authenticated\n');

        console.log('Searching for existing flow...');
        let flows = await makeRequest({
            hostname: `api.${REGION}`,
            path: `/api/v2/flows?type=inboundcall&name=${encodeURIComponent(FLOW_NAME)}`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (flows.entities && flows.entities.length > 0) {
            console.log('Deleting existing flow...');
            await makeRequest({
                hostname: `api.${REGION}`,
                path: `/api/v2/flows/${flows.entities[0].id}`,
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✓ Deleted\n');
        }

        console.log('Getting HOME division...');
        let division = await makeRequest({
            hostname: `api.${REGION}`,
            path: '/api/v2/authorization/divisions/home',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✓ Division ID: ${division.id}\n`);

        console.log('Finding queue VJ_TEST_NEW...');
        let queues = await makeRequest({
            hostname: `api.${REGION}`,
            path: '/api/v2/routing/queues?name=VJ_TEST_NEW',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!queues.entities || queues.entities.length === 0) {
            throw new Error('Queue VJ_TEST_NEW not found');
        }
        const queueId = queues.entities[0].id;
        console.log(`✓ Queue ID: ${queueId}\n`);

        console.log('Creating new flow...');
        const flowData = JSON.stringify({
            name: FLOW_NAME,
            description: 'Test flow with welcome, hold music, US check, and queue transfer',
            type: 'inboundcall',
            division: { id: division.id }
        });
        
        let flow = await makeRequest({
            hostname: `api.${REGION}`,
            path: '/api/v2/flows',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }, flowData);

        console.log('\n' + '='.repeat(70));
        console.log('SUCCESS!');
        console.log('='.repeat(70));
        console.log(`Flow Name: ${flow.name}`);
        console.log(`Flow ID: ${flow.id}`);
        console.log(`Division: HOME`);
        console.log(`\nArchitect URL:`);
        console.log(`https://apps.${REGION}/architect/#/call/inboundcall/${flow.id}/latest`);
        console.log('\n' + '='.repeat(70));
        console.log('NEXT: Open Architect and configure:');
        console.log('1. Play Audio: "welcome to my claude flow"');
        console.log('2. Play Hold Music');
        console.log('3. Decision: Call.Ani.CountryCode == "US"');
        console.log('4. Transfer to ACD: VJ_TEST_NEW');
        console.log('5. Save and Publish');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\nERROR:', error.message);
        process.exit(1);
    }
}

run();
