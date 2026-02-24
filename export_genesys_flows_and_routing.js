const platformClient = require('purecloud-platform-client-v2');
const XLSX = require('xlsx');

// Configuration
const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud'; // US WEST 2

const client = platformClient.ApiClient.instance;
client.setEnvironment(REGION);

async function authenticate() {
    console.log('Authenticating with Genesys Cloud...');
    return client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET);
}

async function getAllDivisions() {
    const authApi = new platformClient.AuthorizationApi();
    console.log('Fetching all divisions...');

    let allDivisions = [];
    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
        const response = await authApi.getAuthorizationDivisions({
            pageSize: 100,
            pageNumber: pageNumber
        });

        allDivisions = allDivisions.concat(response.entities);
        hasMore = response.entities.length === 100;
        pageNumber++;
    }

    console.log(`Found ${allDivisions.length} divisions`);
    return allDivisions;
}

async function getAllFlows() {
    const architectApi = new platformClient.ArchitectApi();
    console.log('Fetching all flows...');

    let allFlows = [];
    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
        const response = await architectApi.getFlows({
            pageSize: 100,
            pageNumber: pageNumber,
            sortBy: 'id',
            sortOrder: 'asc'
        });

        allFlows = allFlows.concat(response.entities);
        hasMore = response.entities.length === 100;
        pageNumber++;

        console.log(`Retrieved ${allFlows.length} flows so far...`);
    }

    console.log(`Total flows retrieved: ${allFlows.length}`);
    return allFlows;
}

async function getAllQueues() {
    const routingApi = new platformClient.RoutingApi();
    console.log('Fetching all queues...');

    let allQueues = [];
    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
        const response = await routingApi.getRoutingQueues({
            pageSize: 100,
            pageNumber: pageNumber,
            sortOrder: 'asc'
        });

        allQueues = allQueues.concat(response.entities);
        hasMore = response.entities.length === 100;
        pageNumber++;

        console.log(`Retrieved ${allQueues.length} queues so far...`);
    }

    console.log(`Total queues retrieved: ${allQueues.length}`);
    return allQueues;
}

async function getCallRoutes() {
    const routingApi = new platformClient.RoutingApi();
    console.log('Fetching call routes...');

    try {
        let allRoutes = [];
        let pageNumber = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await routingApi.getRoutingEmailDomainRoutes('*', {
                pageSize: 100,
                pageNumber: pageNumber
            }).catch(() => ({ entities: [] }));

            if (response.entities) {
                allRoutes = allRoutes.concat(response.entities);
                hasMore = response.entities.length === 100;
                pageNumber++;
            } else {
                hasMore = false;
            }
        }

        console.log(`Total routes retrieved: ${allRoutes.length}`);
        return allRoutes;
    } catch (error) {
        console.log('Could not fetch routes:', error.message);
        return [];
    }
}

async function getDIDs() {
    const telephonyApi = new platformClient.TelephonyProvidersEdgeApi();
    console.log('Fetching DIDs/Phone Numbers...');

    try {
        let allDIDs = [];
        let pageNumber = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await telephonyApi.getTelephonyProvidersEdgesDids({
                pageSize: 100,
                pageNumber: pageNumber
            });

            allDIDs = allDIDs.concat(response.entities);
            hasMore = response.entities.length === 100;
            pageNumber++;
        }

        console.log(`Total DIDs retrieved: ${allDIDs.length}`);
        return allDIDs;
    } catch (error) {
        console.log('Could not fetch DIDs:', error.message);
        return [];
    }
}

function createExcelReport(divisions, flows, queues, routes, dids) {
    console.log('Creating Excel report...');

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // 1. Divisions Sheet
    const divisionData = divisions.map(div => ({
        'Division ID': div.id,
        'Division Name': div.name,
        'Home Division': div.homeDivision ? 'Yes' : 'No',
        'Description': div.description || ''
    }));
    const divisionSheet = XLSX.utils.json_to_sheet(divisionData);
    XLSX.utils.book_append_sheet(workbook, divisionSheet, 'Divisions');

    // 2. Flows Sheet
    const flowData = flows.map(flow => ({
        'Flow ID': flow.id,
        'Flow Name': flow.name,
        'Division ID': flow.division ? flow.division.id : '',
        'Division Name': flow.division ? flow.division.name : '',
        'Type': flow.type,
        'Description': flow.description || '',
        'Status': flow.publishedVersion ? 'Published' : 'Draft',
        'Published Version': flow.publishedVersion ? flow.publishedVersion.version : '',
        'Checked In Version': flow.checkedInVersion ? flow.checkedInVersion.version : '',
        'Saved Version': flow.savedVersion ? flow.savedVersion.version : '',
        'Created By': flow.createdBy ? flow.createdBy.name : '',
        'Created Date': flow.dateCreated || '',
        'Modified Date': flow.dateModified || '',
        'Locked By': flow.lockedUser ? flow.lockedUser.name : '',
        'Locked': flow.locked ? 'Yes' : 'No'
    }));
    const flowSheet = XLSX.utils.json_to_sheet(flowData);
    XLSX.utils.book_append_sheet(workbook, flowSheet, 'Flows');

    // 3. Queues Sheet
    const queueData = queues.map(queue => ({
        'Queue ID': queue.id,
        'Queue Name': queue.name,
        'Division ID': queue.division ? queue.division.id : '',
        'Division Name': queue.division ? queue.division.name : '',
        'Description': queue.description || '',
        'Media Types': queue.mediaSettings ? Object.keys(queue.mediaSettings).join(', ') : '',
        'Member Count': queue.memberCount || 0,
        'Skill Evaluation': queue.skillEvaluationMethod || '',
        'Queue Flow': queue.queueFlow ? queue.queueFlow.name : '',
        'Whisper Prompt': queue.whisperPrompt ? queue.whisperPrompt.name : '',
        'Auto Answer Only': queue.autoAnswerOnly ? 'Yes' : 'No',
        'Enable Transcription': queue.enableTranscription ? 'Yes' : 'No',
        'Created Date': queue.dateCreated || '',
        'Modified Date': queue.dateModified || ''
    }));
    const queueSheet = XLSX.utils.json_to_sheet(queueData);
    XLSX.utils.book_append_sheet(workbook, queueSheet, 'Queues');

    // 4. DIDs Sheet
    if (dids.length > 0) {
        const didData = dids.map(did => ({
            'DID ID': did.id,
            'Phone Number': did.phoneNumber || '',
            'Did Pool': did.didPool ? did.didPool.name : '',
            'Owner': did.owner ? did.owner.name : '',
            'Owner Type': did.ownerType || '',
            'State': did.state || ''
        }));
        const didSheet = XLSX.utils.json_to_sheet(didData);
        XLSX.utils.book_append_sheet(workbook, didSheet, 'DIDs');
    }

    // 5. Summary Sheet
    const summaryData = [
        { 'Resource Type': 'Total Divisions', 'Count': divisions.length },
        { 'Resource Type': 'Total Flows', 'Count': flows.length },
        { 'Resource Type': 'Published Flows', 'Count': flows.filter(f => f.publishedVersion).length },
        { 'Resource Type': 'Draft Flows', 'Count': flows.filter(f => !f.publishedVersion).length },
        { 'Resource Type': 'Inbound Call Flows', 'Count': flows.filter(f => f.type === 'inboundcall').length },
        { 'Resource Type': 'Inbound Email Flows', 'Count': flows.filter(f => f.type === 'inboundemail').length },
        { 'Resource Type': 'Inbound Chat Flows', 'Count': flows.filter(f => f.type === 'inboundchat').length },
        { 'Resource Type': 'InQueue Flows', 'Count': flows.filter(f => f.type === 'inqueuecall').length },
        { 'Resource Type': 'Total Queues', 'Count': queues.length },
        { 'Resource Type': 'Total DIDs', 'Count': dids.length }
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Save the file
    const fileName = `Genesys_Cloud_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    console.log(`\n✅ Excel file created: ${fileName}`);

    return fileName;
}

async function main() {
    try {
        // Authenticate
        await authenticate();
        console.log('✅ Authentication successful\n');

        // Fetch all data
        const divisions = await getAllDivisions();
        const flows = await getAllFlows();
        const queues = await getAllQueues();
        const routes = await getCallRoutes();
        const dids = await getDIDs();

        // Create Excel report
        const fileName = createExcelReport(divisions, flows, queues, routes, dids);

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Divisions: ${divisions.length}`);
        console.log(`Total Flows: ${flows.length}`);
        console.log(`  - Published: ${flows.filter(f => f.publishedVersion).length}`);
        console.log(`  - Draft: ${flows.filter(f => !f.publishedVersion).length}`);
        console.log(`  - Inbound Call: ${flows.filter(f => f.type === 'inboundcall').length}`);
        console.log(`  - InQueue: ${flows.filter(f => f.type === 'inqueuecall').length}`);
        console.log(`Total Queues: ${queues.length}`);
        console.log(`Total DIDs: ${dids.length}`);
        console.log('='.repeat(60));

        // Group by division
        console.log('\nFLOWS BY DIVISION:');
        console.log('-'.repeat(60));
        const homeDivision = divisions.find(d => d.homeDivision);
        if (homeDivision) {
            const homeDivFlows = flows.filter(f => f.division && f.division.id === homeDivision.id);
            console.log(`\n📁 ${homeDivision.name} (Home Division)`);
            console.log(`   Flows: ${homeDivFlows.length}`);
            homeDivFlows.forEach(flow => {
                console.log(`   - ${flow.name} (${flow.type}) ${flow.publishedVersion ? '[Published]' : '[Draft]'}`);
            });
        }

        divisions.filter(d => !d.homeDivision).forEach(division => {
            const divFlows = flows.filter(f => f.division && f.division.id === division.id);
            if (divFlows.length > 0) {
                console.log(`\n📁 ${division.name}`);
                console.log(`   Flows: ${divFlows.length}`);
                divFlows.forEach(flow => {
                    console.log(`   - ${flow.name} (${flow.type}) ${flow.publishedVersion ? '[Published]' : '[Draft]'}`);
                });
            }
        });

        console.log('\n' + '='.repeat(60));
        console.log(`\n✅ Export complete! Check: ${fileName}`);

    } catch (error) {
        console.error('❌ Error:', error);
        if (error.body) {
            console.error('Error details:', JSON.stringify(error.body, null, 2));
        }
    }
}

main();
