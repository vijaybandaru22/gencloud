#!/usr/bin/env node
/**
 * Validate Claude Cars Setup
 * Checks what has been created and what's missing
 */

const https = require('https');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';

async function makeRequest(options, postData = null) {
    return new Promise((resolve, _reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); } catch (_e) { resolve(data); }
                } else {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
        if (postData) req.write(postData);
        req.end();
    });
}

async function run() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  CLAUDE CARS SETUP - VALIDATION CHECK');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        // Authenticate
        console.log('Authenticating...');
        const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const token = await makeRequest({
            hostname: `login.${REGION}`,
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength('grant_type=client_credentials')
            }
        }, 'grant_type=client_credentials');

        if (!token) {
            console.log('✗ Authentication failed\n');
            return;
        }

        console.log('✓ Authenticated\n');

        // Check Queues
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  CHECKING QUEUES');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const usQueue = await makeRequest({
            hostname: `api.${REGION}`,
            path: '/api/v2/routing/queues?name=US_Queue',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const indiaQueue = await makeRequest({
            hostname: `api.${REGION}`,
            path: '/api/v2/routing/queues?name=India_Queue',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const usQueueExists = usQueue && usQueue.entities && usQueue.entities.length > 0;
        const indiaQueueExists = indiaQueue && indiaQueue.entities && indiaQueue.entities.length > 0;

        console.log(usQueueExists ? '✓ US_Queue: Found' : '✗ US_Queue: NOT FOUND - Create it!');
        if (usQueueExists) {
            console.log(`  ID: ${usQueue.entities[0].id}`);
        }
        console.log('');

        console.log(indiaQueueExists ? '✓ India_Queue: Found' : '✗ India_Queue: NOT FOUND - Create it!');
        if (indiaQueueExists) {
            console.log(`  ID: ${indiaQueue.entities[0].id}`);
        }
        console.log('');

        // Check Flows
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  CHECKING FLOWS');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const flows = await makeRequest({
            hostname: `api.${REGION}`,
            path: '/api/v2/flows?type=inboundcall&pageSize=100',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const mainFlow = flows && flows.entities ? flows.entities.find(f => f.name === 'Claude_Cars_Main_Flow') : null;
        const usInQueue = flows && flows.entities ? flows.entities.find(f => f.name.includes('US') && f.name.includes('InQueue')) : null;
        const indiaInQueue = flows && flows.entities ? flows.entities.find(f => f.name.includes('India') && f.name.includes('InQueue')) : null;
        const survey = flows && flows.entities ? flows.entities.find(f => f.name.includes('Survey') || f.name.includes('Claude_Cars')) : null;

        console.log(mainFlow ? '✓ Main Flow: Found' : '✗ Main Flow: NOT FOUND - Import it!');
        if (mainFlow) {
            console.log(`  Name: ${mainFlow.name}`);
            console.log(`  ID: ${mainFlow.id}`);
        }
        console.log('');

        console.log(usInQueue ? '✓ US In-Queue Flow: Found' : '✗ US In-Queue Flow: NOT FOUND - Create it!');
        if (usInQueue) {
            console.log(`  Name: ${usInQueue.name}`);
        }
        console.log('');

        console.log(indiaInQueue ? '✓ India In-Queue Flow: Found' : '✗ India In-Queue Flow: NOT FOUND - Create it!');
        if (indiaInQueue) {
            console.log(`  Name: ${indiaInQueue.name}`);
        }
        console.log('');

        console.log(survey ? '✓ Survey Flow: Found' : '✗ Survey Flow: NOT FOUND - Create it!');
        if (survey) {
            console.log(`  Name: ${survey.name}`);
        }
        console.log('');

        // Summary
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  SETUP STATUS SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const totalItems = 6;
        let completedItems = 0;

        if (usQueueExists) completedItems++;
        if (indiaQueueExists) completedItems++;
        if (mainFlow) completedItems++;
        if (usInQueue) completedItems++;
        if (indiaInQueue) completedItems++;
        if (survey) completedItems++;

        const percentage = Math.round((completedItems / totalItems) * 100);

        console.log(`Progress: ${completedItems}/${totalItems} items (${percentage}%)`);
        console.log('');

        if (completedItems === totalItems) {
            console.log('🎉 COMPLETE! All components are set up.');
            console.log('');
            console.log('Next steps:');
            console.log('  1. Assign flow to DID number');
            console.log('  2. Test the flow');
        } else {
            console.log('⚠ INCOMPLETE - Still need to create:');
            console.log('');
            if (!usQueueExists) console.log('  • US_Queue');
            if (!indiaQueueExists) console.log('  • India_Queue');
            if (!mainFlow) console.log('  • Main Flow (import Claude_Cars_Main_Flow.i3inboundflow)');
            if (!usInQueue) console.log('  • US In-Queue Flow');
            if (!indiaInQueue) console.log('  • India In-Queue Flow');
            if (!survey) console.log('  • Survey Flow');
            console.log('');
            console.log('Run: CLAUDE_CARS_EASY_SETUP.bat to complete setup');
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('Error during validation:', error.message);
    }
}

run();
